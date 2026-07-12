import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { SessionsEffects } from './sessions.effects';
import { sessionsActions, sessionsApiActions } from './sessions.actions';
import { accountActions } from '../account/account.actions';
import { uiActions } from '../ui/ui.actions';
import { selectActiveSessionForCurrentShop } from './sessions.selectors';
import { SessionApiService } from '../../core/api/session-api.service';
import type { Session } from '../../models/session.model';
import type {
  AccountId,
  SessionId,
  ShopId,
  UserId,
} from '../../models/ids.model';

const mockSession: Session = {
  id: 's1' as SessionId,
  accountId: 'a1' as AccountId,
  shopId: 'shop-1' as ShopId,
  participants: ['u1' as UserId],
  startedBy: 'u1' as UserId,
  startedAt: 1,
  completedAt: null,
  checkedItems: [],
};

const mockAccount = { id: 'a1' as AccountId, name: 'T', aiConfig: null };

describe('SessionsEffects', () => {
  let effects: SessionsEffects;
  let actions$: Subject<unknown>;
  let store: MockStore;
  let api: {
    fetchActiveSessions: ReturnType<typeof vi.fn>;
    startSession: ReturnType<typeof vi.fn>;
    joinSession: ReturnType<typeof vi.fn>;
    closeSession: ReturnType<typeof vi.fn>;
    discardSession: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    actions$ = new Subject();
    api = {
      fetchActiveSessions: vi.fn(),
      startSession: vi.fn(),
      joinSession: vi.fn(),
      closeSession: vi.fn(),
      discardSession: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        SessionsEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: SessionApiService, useValue: api },
      ],
    });
    effects = TestBed.inject(SessionsEffects);
    store = TestBed.inject(MockStore);
  });

  const flush = () => new Promise<void>((r) => setTimeout(r));

  it('loads active sessions after accountLoaded', async () => {
    api.fetchActiveSessions.mockResolvedValue([mockSession]);
    const results: unknown[] = [];
    effects.fetchActiveSessions$.subscribe((a) => results.push(a));
    actions$.next(accountActions.accountLoaded({ account: mockAccount, selectedShopId: null }));
    await flush();
    expect(results).toEqual([
      sessionsActions.sessionsLoaded({ sessions: [mockSession] }),
    ]);
  });

  it('always dispatches startSessionRequested on shop-mode switch', async () => {
    const results: unknown[] = [];
    effects.autoStartOnShopSelected$.subscribe((a) => results.push(a));
    actions$.next(
      uiActions.switchToShopModeWithShop({ shopId: 'shop-1' as ShopId }),
    );
    await flush();
    expect(results).toEqual([
      sessionsApiActions.startSessionRequested({ shopId: 'shop-1' as ShopId }),
    ]);
  });

  it('dispatches sessionStarted on successful startSession (new or joined)', async () => {
    api.startSession.mockResolvedValue(mockSession);
    const results: unknown[] = [];
    effects.startSession$.subscribe((a) => results.push(a));
    actions$.next(
      sessionsApiActions.startSessionRequested({ shopId: 'shop-1' as ShopId }),
    );
    await flush();
    expect(results).toEqual([
      sessionsActions.sessionStarted({ session: mockSession }),
    ]);
  });

  it('dispatches sessionStartConflict on SESSION_CONFLICT', async () => {
    api.startSession.mockResolvedValue({ type: 'SESSION_CONFLICT' });
    const results: unknown[] = [];
    effects.startSession$.subscribe((a) => results.push(a));
    actions$.next(sessionsApiActions.startSessionRequested({ shopId: null }));
    await flush();
    expect(results).toEqual([sessionsActions.sessionStartConflict()]);
  });

  it('dispatches sessionClosed on close', async () => {
    api.closeSession.mockResolvedValue(undefined);
    const results: unknown[] = [];
    effects.closeSession$.subscribe((a) => results.push(a));
    actions$.next(
      sessionsApiActions.closeSessionRequested({
        sessionId: 's1' as SessionId,
      }),
    );
    await flush();
    expect(results).toEqual([
      sessionsActions.sessionClosed({ id: 's1' as SessionId }),
    ]);
  });

  // Bug regression: after dismissing inactivity dialog, timer re-fires immediately
  // because session timestamps are all stale (>30 min ago). The effect must treat
  // dismissal as fresh activity and wait a full 30 min before firing again.
  it('does not re-fire inactivity immediately after dismissal', async () => {
    const staleSession: Session = {
      ...mockSession,
      startedAt: Date.now() - 60 * 60 * 1000, // 60 min ago
      checkedItems: [],
    };
    store.overrideSelector(selectActiveSessionForCurrentShop, staleSession);

    const results: unknown[] = [];
    effects.inactivityTimer$.subscribe((a) => results.push(a));

    // Simulate dismissing the inactivity dialog (user chose "continue")
    actions$.next(
      sessionsActions.sessionInactivityDismissed({
        sessionId: 's1' as SessionId,
      }),
    );

    // Give any synchronous/immediate timer a chance to fire
    await new Promise<void>((r) => setTimeout(r, 100));

    // The timer should NOT have fired immediately — it should wait ~30 min
    expect(results).toEqual([]);
  });

  it('switches back to plan mode after a session closes', async () => {
    const results: unknown[] = [];
    effects.leaveShopModeOnClose$.subscribe((a) => results.push(a));
    actions$.next(sessionsActions.sessionClosed({ id: 's1' as SessionId }));
    await flush();
    expect(results).toEqual([uiActions.switchToPlanMode()]);
  });

  // A rejected API call (offline / flaky in-store connectivity) must never
  // kill the effect stream: fail once, verify the failure action, then verify
  // the next request still goes through.
  describe('failure resilience', () => {
    it('closeSession$ dispatches sessionCloseFailed and survives a rejected call', async () => {
      api.closeSession
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const results: unknown[] = [];
      let errored = false;
      effects.closeSession$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = sessionsApiActions.closeSessionRequested({
        sessionId: 's1' as SessionId,
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        sessionsActions.sessionCloseFailed({ sessionId: 's1' as SessionId }),
      ]);

      actions$.next(req);
      await flush();
      expect(results[1]).toEqual(
        sessionsActions.sessionClosed({ id: 's1' as SessionId }),
      );
    });

    it('discardSession$ dispatches sessionDiscardFailed and survives a rejected call', async () => {
      api.discardSession
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const results: unknown[] = [];
      let errored = false;
      effects.discardSession$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = sessionsApiActions.discardSessionRequested({
        sessionId: 's1' as SessionId,
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        sessionsActions.sessionDiscardFailed({ sessionId: 's1' as SessionId }),
      ]);

      actions$.next(req);
      await flush();
      expect(results[1]).toEqual(
        sessionsActions.sessionDiscarded({ id: 's1' as SessionId }),
      );
    });

    it('startSession$ dispatches sessionStartFailed and survives a rejected call', async () => {
      api.startSession
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(mockSession);
      const results: unknown[] = [];
      let errored = false;
      effects.startSession$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = sessionsApiActions.startSessionRequested({
        shopId: 'shop-1' as ShopId,
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([sessionsActions.sessionStartFailed()]);

      actions$.next(req);
      await flush();
      expect(results[1]).toEqual(
        sessionsActions.sessionStarted({ session: mockSession }),
      );
    });
  });
});
