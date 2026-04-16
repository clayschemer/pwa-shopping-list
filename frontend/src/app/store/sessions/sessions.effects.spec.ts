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
import { selectActiveSessionForCurrentUser } from './sessions.selectors';
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
  };

  beforeEach(() => {
    actions$ = new Subject();
    api = {
      fetchActiveSessions: vi.fn(),
      startSession: vi.fn(),
      joinSession: vi.fn(),
      closeSession: vi.fn(),
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
    actions$.next(accountActions.accountLoaded({ account: mockAccount }));
    await flush();
    expect(results).toEqual([
      sessionsActions.sessionsLoaded({ sessions: [mockSession] }),
    ]);
  });

  it('auto-starts a session on shop-mode switch when no active session exists', async () => {
    store.overrideSelector(selectActiveSessionForCurrentUser, null);
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

  it('does not auto-start when an active session already exists', async () => {
    store.overrideSelector(selectActiveSessionForCurrentUser, mockSession);
    const results: unknown[] = [];
    effects.autoStartOnShopSelected$.subscribe((a) => results.push(a));
    actions$.next(
      uiActions.switchToShopModeWithShop({ shopId: 'shop-1' as ShopId }),
    );
    await flush();
    expect(results).toEqual([]);
  });

  it('dispatches sessionStarted on successful startSession', async () => {
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

  it('switches back to plan mode after a session closes', async () => {
    const results: unknown[] = [];
    effects.leaveShopModeOnClose$.subscribe((a) => results.push(a));
    actions$.next(sessionsActions.sessionClosed({ id: 's1' as SessionId }));
    await flush();
    expect(results).toEqual([uiActions.switchToPlanMode()]);
  });
});
