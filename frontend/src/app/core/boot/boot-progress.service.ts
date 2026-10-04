import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Store } from '@ngrx/store';
import { TranslocoService } from '@jsverse/transloco';
import { selectAuthStatus } from '../../store/account/account.selectors';
import { selectListDataLoaded } from '../../store/selectors/list-data-loaded.selectors';
import { selectSessionsLoaded } from '../../store/sessions/sessions.selectors';
import type { AuthStatus } from '../../store/account/account.reducer';
import {
  formatBootCounter,
  MILESTONE_WEIGHT,
  PHASE_BASE,
  DETAIL_SEPARATOR,
} from './boot-metrics';

/** Handed over by the inline pre-bootstrap script in `src/index.html`. */
interface BootProgressBridge {
  files: number;
  bytes: number;
  stop?: () => void;
}

declare global {
  interface Window {
    __bootProgress?: BootProgressBridge;
  }
}

/**
 * Auth outcomes that end the boot sequence without the list ever loading. Each one
 * puts the user on a screen that needs them to act, so the progress card must clear.
 */
const TERMINAL_AUTH_STATUSES: ReadonlySet<AuthStatus> = new Set<AuthStatus>([
  'unauthenticated',
  'access_denied',
  'pending_verification',
  'stream_failed',
]);

/**
 * Drives the boot progress card.
 *
 * Milestones are tracked independently rather than as a sequence: translations load in
 * parallel with auth, and the six boot reads fan out together, so a strict state machine
 * would show the bar stalling while work was actually happening. The headline names the
 * most significant milestone still outstanding.
 */
@Injectable({ providedIn: 'root' })
export class BootProgressService {
  private readonly store = inject(Store);
  private readonly transloco = inject(TranslocoService);

  private readonly resourceMetrics = signal({ files: 0, bytes: 0 });

  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  /** Emits once the active language's translation file is available. */
  private readonly translationsLoaded = toSignal(
    this.transloco.selectTranslate('app.name').pipe(map(() => true)),
    { initialValue: false },
  );

  private readonly authStatus = toSignal(this.store.select(selectAuthStatus), {
    initialValue: 'checking' as AuthStatus,
  });

  private readonly listLoaded = toSignal(this.store.select(selectListDataLoaded), {
    initialValue: false,
  });

  private readonly sessionsLoaded = toSignal(this.store.select(selectSessionsLoaded), {
    initialValue: false,
  });

  private readonly authResolved = computed(() => this.authStatus() !== 'checking');
  private readonly accountResolved = computed(
    () => this.authStatus() === 'authenticated',
  );

  readonly percent: Signal<number> = computed(() => {
    let total = PHASE_BASE;
    if (this.translationsLoaded()) total += MILESTONE_WEIGHT.translations;
    if (this.authResolved()) total += MILESTONE_WEIGHT.auth;
    if (this.accountResolved()) total += MILESTONE_WEIGHT.account;
    if (this.listLoaded()) total += MILESTONE_WEIGHT.list;
    if (this.sessionsLoaded()) total += MILESTONE_WEIGHT.sessions;
    return Math.min(100, total);
  });

  /** Transloco key naming the most significant outstanding milestone. */
  readonly phaseKey: Signal<string> = computed(() => {
    if (!this.translationsLoaded()) return 'boot.preparing';
    if (this.authStatus() === 'checking') return 'boot.signingIn';
    if (this.authStatus() === 'loading') return 'boot.loadingAccount';
    if (!this.listLoaded() || !this.sessionsLoaded()) return 'boot.loadingList';
    return 'boot.ready';
  });

  /** Language-neutral identifier for whatever that milestone is fetching. */
  readonly detail: Signal<string> = computed(() => {
    switch (this.phaseKey()) {
      case 'boot.preparing':
        return `${this.activeLang()}.json`;
      case 'boot.signingIn':
        return ['firebase', 'auth'].join(DETAIL_SEPARATOR);
      case 'boot.loadingAccount':
        return 'accounts';
      case 'boot.loadingList':
        return ['items', 'categories', 'shops', 'sessions'].join(DETAIL_SEPARATOR);
      default:
        return '';
    }
  });

  readonly counter: Signal<string> = computed(() => {
    const { files, bytes } = this.resourceMetrics();
    return formatBootCounter(files, bytes, this.activeLang());
  });

  readonly complete: Signal<boolean> = computed(
    () =>
      this.phaseKey() === 'boot.ready' ||
      TERMINAL_AUTH_STATUSES.has(this.authStatus()),
  );

  constructor() {
    this.adoptPreBootstrapMetrics();
    this.observeRemainingResources();
  }

  /** Continue the tally the inline splash script started, rather than resetting it. */
  private adoptPreBootstrapMetrics(): void {
    const bridge = globalThis.window?.__bootProgress;
    if (!bridge) {
      return;
    }
    this.resourceMetrics.set({ files: bridge.files, bytes: bridge.bytes });
    bridge.stop?.();
  }

  private observeRemainingResources(): void {
    if (typeof PerformanceObserver === 'undefined') {
      return;
    }

    const observer = new PerformanceObserver((list) => {
      let files = 0;
      let bytes = 0;
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        files += 1;
        bytes += entry.transferSize || entry.encodedBodySize || 0;
      }
      this.resourceMetrics.update((m) => ({
        files: m.files + files,
        bytes: m.bytes + bytes,
      }));
    });

    observer.observe({ type: 'resource', buffered: false });

    // Boot is the only thing this measures; stop as soon as it is over. Effects run
    // after creation, so `stopper` is always assigned by the time this body executes.
    const stopper = effect(() => {
      if (!this.complete()) {
        return;
      }
      observer.disconnect();
      stopper.destroy();
    });
  }
}
