import { describe, it, expect } from 'vitest';
import { sessionsReducer, initialSessionsState } from './sessions.reducer';
import { sessionsApiActions } from './sessions.actions';
import type { Session } from '../../models/session.model';
import type { AccountId, SessionId, ShopId, UserId } from '../../models/ids.model';

const session1: Session = {
  id: 'sess-1' as SessionId,
  accountId: 'acc-1' as AccountId,
  shopId: 'shop-1' as ShopId,
  participants: ['uid-1' as UserId],
  startedBy: 'uid-1' as UserId,
  startedAt: 1000,
  completedAt: null,
  checkedItems: [],
};

const session2: Session = {
  id: 'sess-2' as SessionId,
  accountId: 'acc-1' as AccountId,
  shopId: null,
  participants: ['uid-2' as UserId],
  startedBy: 'uid-2' as UserId,
  startedAt: 2000,
  completedAt: null,
  checkedItems: [],
};

describe('sessionsReducer', () => {
  it('starts with empty sessions', () => {
    const state = sessionsReducer(undefined, { type: '@@INIT' } as never);
    expect(state.ids).toHaveLength(0);
    expect(state.loaded).toBe(false);
    expect(state.conflictError).toBe(false);
  });

  it('seeds sessions on fetch success', () => {
    const state = sessionsReducer(
      undefined,
      sessionsApiActions.fetchActiveSessionsSuccess({ sessions: [session1, session2] }),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.loaded).toBe(true);
  });

  it('adds a session on stream added', () => {
    const state = sessionsReducer(
      undefined,
      sessionsApiActions.sessionStreamUpdated({
        changes: [{ entity: session1, changeType: 'added' }],
      }),
    );
    expect(state.ids).toContain('sess-1');
  });

  it('sets conflictError on start session conflict', () => {
    const state = sessionsReducer(
      undefined,
      sessionsApiActions.startSessionConflict(),
    );
    expect(state.conflictError).toBe(true);
  });

  it('clears conflictError on start session success', () => {
    const withConflict = sessionsReducer(
      undefined,
      sessionsApiActions.startSessionConflict(),
    );
    const state = sessionsReducer(
      withConflict,
      sessionsApiActions.startSessionSuccess({ session: session1 }),
    );
    expect(state.conflictError).toBe(false);
  });
});
