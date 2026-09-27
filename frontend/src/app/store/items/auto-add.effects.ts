import { inject, Injectable } from '@angular/core';
import { createEffect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  catchError,
  combineLatest,
  concat,
  defer,
  EMPTY,
  filter,
  from,
  map,
  mergeMap,
  of,
  take,
  withLatestFrom,
} from 'rxjs';
import { AccountApiService } from '../../core/api/account-api.service';
import { onApiFailure } from '../../core/diagnostics/api-failure';
import { ItemApiService } from '../../core/api/item-api.service';
import { SessionApiService } from '../../core/api/session-api.service';
import { PwaInstallService } from '../../core/pwa/pwa-install.service';
import {
  DEFAULT_POLICY,
  type PurchaseHistory,
  type RecurrencePolicy,
} from '../../core/auto-add/recurrence';
import {
  blockingReason,
  remainingCapacity,
  selectAutoAdds,
} from '../../core/auto-add/selection';
import type { Item } from '../../models/item.model';
import type { ItemId } from '../../models/ids.model';
import type { Session } from '../../models/session.model';
import { selectAutoAddEnabled } from '../account/account.selectors';
import { selectActiveSessions, selectSessionsLoaded } from '../sessions/sessions.selectors';
import { autoAddActions } from './items.actions';
import { selectActiveItems, selectItemsLoaded } from './items.selectors';

/**
 * How many completed trips to mine. At a weekly shop this is several years of
 * history, far more than the policy's 60-day ceiling can use, so the limit is
 * really just a guard on the read cost.
 */
export const HISTORY_SESSION_LIMIT = 200;

/** Hours that must pass before another evaluation may be claimed. */
export const MIN_RUN_GAP_HOURS = 20;

/** Phase timings and corpus sizes for one evaluation. */
export interface AutoAddRunMetrics {
  claimMs: number;
  fetchMs: number;
  computeMs: number;
  writeMs: number;
  totalMs: number;
  sessionCount: number;
  entryCount: number;
  candidateCount: number;
  addedCount: number;
}

/**
 * An evaluation that has passed every gate and won the day's claim, so the
 * expensive phase is about to start. Separating the claim from the work is what
 * lets the UI announce a sync that is genuinely happening: most app opens lose
 * the claim and do nothing, and a snackbar on those would be a lie.
 */
interface ClaimedRun {
  capacity: number;
  metrics: AutoAddRunMetrics;
  startedAt: number;
}

function emptyMetrics(): AutoAddRunMetrics {
  return {
    claimMs: 0,
    fetchMs: 0,
    computeMs: 0,
    writeMs: 0,
    totalMs: 0,
    sessionCount: 0,
    entryCount: 0,
    candidateCount: 0,
    addedCount: 0,
  };
}

/** Collapses the checked-item logs of many sessions into per-item purchase timelines. */
export function toPurchaseHistories(sessions: readonly Session[]): PurchaseHistory[] {
  const byItem = new Map<ItemId, number[]>();
  for (const session of sessions) {
    for (const entry of session.checkedItems) {
      const existing = byItem.get(entry.itemId);
      if (existing) existing.push(entry.checkedAt);
      else byItem.set(entry.itemId, [entry.checkedAt]);
    }
  }
  return [...byItem.entries()].map(([itemId, checkedAt]) => ({ itemId, checkedAt }));
}

/**
 * Adds recurring items back to the list when their usual interval has elapsed.
 *
 * Runs once per app open rather than on a schedule: there is no dependable
 * background timer in a PWA, and the read cost is the same wherever the work
 * happens, so a check on open plus a transactional daily claim gets the same
 * result as a hosted cron without the hosting. Every phase is timed so the
 * choice can be revisited against measurements from real devices.
 */
@Injectable()
export class AutoAddEffects {
  private readonly store = inject(Store);
  private readonly accountApi = inject(AccountApiService);
  private readonly itemApi = inject(ItemApiService);
  private readonly sessionApi = inject(SessionApiService);
  private readonly install = inject(PwaInstallService);

  private readonly policy: RecurrencePolicy = DEFAULT_POLICY;

  /**
   * Belt to the `take(1)` brace. `take(1)` limits each *subscription*, so the
   * once-per-open guarantee would otherwise rest on nothing subscribing to this
   * effect twice. The daily claim is the real cross-client guard; this keeps the
   * local invariant true on its own terms.
   */
  private evaluated = false;

  /**
   * Gated on both loaded flags rather than on the load actions: boot fetches in
   * parallel, so neither action reliably arrives second. `take(1)` keeps it to a
   * single evaluation per app open — the daily claim then decides whether that
   * evaluation does any work.
   */
  readonly evaluateOnBoot$ = createEffect(() =>
    combineLatest([
      this.store.select(selectItemsLoaded),
      this.store.select(selectSessionsLoaded),
    ]).pipe(
      filter(([itemsLoaded, sessionsLoaded]) => itemsLoaded && sessionsLoaded),
      take(1),
      withLatestFrom(
        this.store.select(selectAutoAddEnabled),
        this.store.select(selectActiveItems),
        this.store.select(selectActiveSessions),
      ),
      mergeMap(([, enabled, activeItems, activeSessions]) =>
        from(this.claimRun(enabled, activeItems, activeSessions)).pipe(
          mergeMap((run) =>
            run === null
              ? // Gated out, or another client already did today's evaluation.
                // Nothing happened, so nothing is announced.
                EMPTY
              : concat(
                  of(autoAddActions.syncStarted()),
                  // `defer`, not `from`: a promise passed to `from` is already
                  // running by the time `concat` gets to it, which would start
                  // the reads before the announcement that they are happening.
                  defer(() => this.runClaimed(run)).pipe(
                    map(() => autoAddActions.syncFinished()),
                  ),
                ),
          ),
          // Background work with nobody waiting on it: a failure must never take
          // the effect stream down with it. It used to be swallowed to the
          // console alone; now the cause is classified and surfaced, because an
          // unattended sync dying of an exhausted read quota is precisely the
          // failure that has been invisible. `syncFinished` keeps the progress
          // snackbar from outliving the run that opened it.
          catchError(
            onApiFailure('autoAdd.evaluate', () => autoAddActions.syncFinished()),
          ),
        ),
      ),
    ),
  );

  /**
   * Runs the gates and tries to claim the day. Returns null when this open does
   * no work — which is the common case and must stay completely silent.
   */
  private async claimRun(
    enabled: boolean,
    activeItems: readonly Item[],
    activeSessions: readonly Session[],
  ): Promise<ClaimedRun | null> {
    if (this.evaluated) return null;
    this.evaluated = true;

    const startedAt = performance.now();
    const metrics = emptyMetrics();

    const alreadyAuto = activeItems.filter((i) => i.addedBy === 'auto').length;
    const blocked = blockingReason(
      {
        enabled,
        installed: this.install.isInstalled(),
        hasActiveSession: activeSessions.length > 0,
        activeAutoCount: alreadyAuto,
      },
      this.policy,
    );
    if (blocked !== null) return null;

    const claimStarted = performance.now();
    const claimed = await this.accountApi.claimAutoAddRun(MIN_RUN_GAP_HOURS);
    metrics.claimMs = performance.now() - claimStarted;
    // The other client, or an earlier open today, already did this. Bailing out
    // here is what keeps a day's evaluation to one read rather than a few
    // hundred per app open.
    if (!claimed) return null;

    return {
      capacity: remainingCapacity(alreadyAuto, this.policy),
      metrics,
      startedAt,
    };
  }

  /** The expensive phase: the history read, the cadence maths, and the restores. */
  private async runClaimed({ capacity, metrics, startedAt }: ClaimedRun): Promise<void> {
    try {
      const fetchStarted = performance.now();
      const [sessions, allItems] = await Promise.all([
        this.sessionApi.fetchSessionHistory(HISTORY_SESSION_LIMIT),
        this.itemApi.fetchAllItems(),
      ]);
      metrics.fetchMs = performance.now() - fetchStarted;
      metrics.sessionCount = sessions.length;

      const computeStarted = performance.now();
      const histories = toPurchaseHistories(sessions);
      metrics.entryCount = histories.reduce((sum, h) => sum + h.checkedAt.length, 0);
      const now = Date.now();
      const byId = new Map(allItems.map((i) => [i.id, i]));
      const selected = selectAutoAdds(histories, (id) => byId.get(id), capacity, now, this.policy);
      metrics.computeMs = performance.now() - computeStarted;
      metrics.candidateCount = selected.length;

      const writeStarted = performance.now();
      // Sequential rather than parallel: each write is a transaction, and a
      // handful of them in a burst is the sort of thing that trips contention
      // retries for no benefit on work nobody is waiting for.
      for (const candidate of selected) {
        const result = await this.itemApi.autoAddItem(candidate.itemId, candidate.reason);
        if (result === undefined) metrics.addedCount++;
      }
      metrics.writeMs = performance.now() - writeStarted;
    } finally {
      metrics.totalMs = performance.now() - startedAt;
      // Reported even on the failure path: a slow failure needs to be as
      // visible as a slow success when judging whether this belongs on a client.
      await this.report(metrics);
    }
  }

  private async report(metrics: AutoAddRunMetrics): Promise<void> {
    console.debug('[auto-add] run', metrics);
    try {
      await this.accountApi.recordAutoAddRunTimings({
        totalMs: metrics.totalMs,
        computeMs: metrics.computeMs,
      });
    } catch {
      // Diagnostics only — never let this surface.
    }
  }
}
