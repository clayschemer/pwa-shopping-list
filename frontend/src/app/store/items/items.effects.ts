import { inject, Injectable, NgZone } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  catchError,
  EMPTY,
  filter,
  from,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  takeUntil,
  withLatestFrom,
} from 'rxjs';

export const CHECK_UNDO_WINDOW_MS = 2000;

function wallClockTimer(durationMs: number, zone: NgZone): Observable<void> {
  return new Observable<void>((subscriber) => {
    const startedAt = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const emit = (): void => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      subscriber.next();
      subscriber.complete();
    };

    const scheduleRemaining = (): void => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      const remaining = durationMs - (Date.now() - startedAt);
      if (remaining <= 0) {
        emit();
      } else {
        timeoutId = setTimeout(emit, remaining);
      }
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        zone.run(() => scheduleRemaining());
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    scheduleRemaining();

    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });
}
import { itemsActions, itemsApiActions } from './items.actions';
import { sessionsActions } from '../sessions/sessions.actions';
import { accountActions } from '../account/account.actions';
import { ItemApiService } from '../../core/api/item-api.service';
import { PriceQueueApiService, type QueueReason } from '../../core/api/price-queue-api.service';
import { selectAiConfig, selectStalePriceDays } from '../account/account.selectors';
import type { Item } from '../../models/item.model';
import type { ItemId } from '../../models/ids.model';
import type {
  CheckConflictError,
  NameConflictError,
  NotFoundError,
} from '../../models/errors.model';
import type { CheckSuccess } from '../../core/api/item-api.service';

const RETRY_MS = 7 * 86_400_000;

function needsPriceLookup(item: Item, stalePriceDays: number): boolean {
  const now = Date.now();
  if (item.priceUpdatedAt === null) {
    // Never priced — respect the retry window so recently-attempted failures aren't re-queued
    return item.priceAttemptedAt === null || item.priceAttemptedAt < now - RETRY_MS;
  }
  return item.priceUpdatedAt < now - stalePriceDays * 86_400_000;
}

@Injectable()
export class ItemsEffects {
  private readonly actions$ = inject(Actions);
  private readonly itemApi = inject(ItemApiService);
  private readonly priceQueueApi = inject(PriceQueueApiService);
  private readonly store = inject(Store);
  private readonly zone = inject(NgZone);

  readonly fetchActiveList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        from(this.itemApi.fetchActiveList()).pipe(
          map((items) => itemsActions.itemsLoaded({ items })),
        ),
      ),
    ),
  );

  readonly watchItemChanges$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        this.itemApi.itemChanges$().pipe(
          map((batch) => {
            const items: Item[] = batch
              .filter((c) => c.changeType !== 'removed')
              .map((c) => c.entity);
            const removed: ItemId[] = batch
              .filter((c) => c.changeType === 'removed')
              .map((c) => c.entity.id);
            return itemsActions.itemChangesReceived({ items, removed });
          }),
        ),
      ),
    ),
  );

  // Every API-calling effect handles rejection INSIDE the flattening
  // operator: a rejected promise (offline / flaky in-store connectivity)
  // must dispatch a failure action, never error the outer stream — an
  // errored effect is resubscribed at most 10 times by NgRx and then dies
  // silently for the rest of the session.
  readonly addItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsApiActions.addItemRequested),
      switchMap((input) =>
        from(this.itemApi.addItem(input)).pipe(
          map((result) => {
            if ((result as NameConflictError).type === 'NAME_CONFLICT') {
              return itemsActions.itemNameConflict({ name: input.name });
            }
            return itemsActions.itemAdded({ item: result as Item });
          }),
          catchError(() => of(itemsActions.itemSaveFailed({ id: null }))),
        ),
      ),
    ),
  );

  readonly updateItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsApiActions.updateItemRequested),
      switchMap((input) =>
        from(this.itemApi.updateItem(input)).pipe(
          map((result) => {
            const maybeErr = result as NameConflictError | NotFoundError;
            if (maybeErr.type === 'NAME_CONFLICT') {
              return itemsActions.itemNameConflict({ name: input.name });
            }
            if (maybeErr.type === 'NOT_FOUND') {
              return { type: '[Items] Update Not Found (noop)' };
            }
            return itemsActions.itemUpdated({ item: result as Item });
          }),
          catchError(() => of(itemsActions.itemSaveFailed({ id: input.id }))),
        ),
      ),
    ),
  );

  readonly removeItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsApiActions.removeItemRequested),
      switchMap(({ id }) =>
        from(this.itemApi.removeItem(id)).pipe(
          map(() => itemsActions.itemRemoved({ id })),
          catchError(() => of(itemsActions.itemSaveFailed({ id }))),
        ),
      ),
    ),
  );

  readonly checkItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsApiActions.checkItemRequested),
      mergeMap(({ id, sessionId }) =>
        from(this.itemApi.checkItem(id, sessionId)).pipe(
          mergeMap((result) => {
            if ((result as CheckConflictError).type === 'CHECK_CONFLICT') {
              return of(itemsActions.itemCheckConflict({ id }));
            }
            const success = result as CheckSuccess;
            return of(
              itemsActions.itemChecked({ item: success.item }),
              sessionsActions.sessionUpdated({ session: success.session }),
            );
          }),
          catchError(() => of(itemsActions.itemCheckFailed({ id }))),
        ),
      ),
    ),
  );

  // The check itself commits immediately (checkItem$). This window only
  // controls how long the committed item lingers on the checking user's
  // list as a "has been checked" undo signal.
  readonly recentCheckWindow$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsActions.itemChecked),
      mergeMap(({ item }) =>
        wallClockTimer(CHECK_UNDO_WINDOW_MS, this.zone).pipe(
          takeUntil(
            this.actions$.pipe(
              ofType(itemsActions.itemUnchecked),
              filter((a) => a.id === item.id),
            ),
          ),
          map(() => itemsActions.checkUndoWindowElapsed({ id: item.id })),
        ),
      ),
    ),
  );

  readonly uncheckItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsApiActions.uncheckItemRequested),
      switchMap(({ id, sessionId }) =>
        from(this.itemApi.uncheckItem(id, sessionId)).pipe(
          map(() => itemsActions.itemUnchecked({ id })),
          catchError(() => of(itemsActions.itemUncheckFailed({ id }))),
        ),
      ),
    ),
  );

  readonly submitPriceFeedback$ = createEffect(() =>
    this.actions$.pipe(
      ofType(itemsApiActions.submitPriceFeedbackRequested),
      mergeMap(({ id, reason }) =>
        from(this.itemApi.submitPriceFeedback(id, reason)).pipe(
          map(() => itemsApiActions.submitPriceFeedbackSucceeded({ id })),
          catchError(() => EMPTY),
        ),
      ),
    ),
  );

  // Enqueue a newly added (or restored) item for price lookup if it has no
  // price or a stale one and the account has the price pipeline configured.
  readonly queueItemOnAdd$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(itemsActions.itemAdded),
        withLatestFrom(
          this.store.select(selectAiConfig),
          this.store.select(selectStalePriceDays),
        ),
        filter(([, aiConfig]) => aiConfig !== null),
        mergeMap(([{ item }, , stalePriceDays]) => {
          if (!needsPriceLookup(item, stalePriceDays)) return EMPTY;
          const reason: QueueReason = item.priceUpdatedAt === null ? 'unpriced' : 'reactivated';
          // Best-effort background write — a failure must not kill the effect.
          return from(this.priceQueueApi.enqueue(item.id, reason)).pipe(
            catchError(() => EMPTY),
          );
        }),
      ),
    { dispatch: false },
  );

  // On boot, enqueue any active items whose price has gone stale since the
  // last time the pipeline ran. Runs once per session after the initial fetch.
  readonly queueStaleItemsOnBoot$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(itemsActions.itemsLoaded),
        withLatestFrom(
          this.store.select(selectAiConfig),
          this.store.select(selectStalePriceDays),
        ),
        filter(([, aiConfig]) => aiConfig !== null),
        mergeMap(([{ items }, , stalePriceDays]) => {
          const stale = items.filter((i) => needsPriceLookup(i, stalePriceDays));
          if (stale.length === 0) return EMPTY;
          // Best-effort background write — a failure must not kill the effect.
          return from(
            Promise.all(stale.map((i) => this.priceQueueApi.enqueue(i.id, 'stale'))),
          ).pipe(catchError(() => EMPTY));
        }),
      ),
    { dispatch: false },
  );
}
