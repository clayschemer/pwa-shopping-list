import { describe, it, expect } from 'vitest';
import {
  initialSessionsState,
  sessionsAdapter,
  sessionsReducer,
} from './sessions.reducer';
import { sessionsActions } from './sessions.actions';
import type { Session } from '../../models/session.model';
import type {
  AccountId,
  SessionId,
  ShopId,
  UserId,
} from '../../models/ids.model';

const session = (id: string, overrides: Partial<Session> = {}): Session => ({
  id: id as SessionId,
  accountId: 'a1' as AccountId,
  shopId: 'shop-1' as ShopId,
  participants: ['u1' as UserId],
  startedBy: 'u1' as UserId,
  startedAt: 1,
  completedAt: null,
  checkedItems: [],
  ...overrides,
});

describe('sessionsReducer', () => {
  it('loads sessions and sets loaded=true', () => {
    const state = sessionsReducer(
      initialSessionsState,
      sessionsActions.sessionsLoaded({ sessions: [session('s1')] }),
    );
    expect(state.loaded).toBe(true);
    expect(sessionsAdapter.getSelectors().selectAll(state)).toHaveLength(1);
  });

  it('adds a started session', () => {
    const state = sessionsReducer(
      initialSessionsState,
      sessionsActions.sessionStarted({ session: session('s1') }),
    );
    expect(state.entities['s1']).toBeDefined();
  });

  it('upserts on session updated', () => {
    const seeded = sessionsReducer(
      initialSessionsState,
      sessionsActions.sessionStarted({ session: session('s1') }),
    );
    const next = sessionsReducer(
      seeded,
      sessionsActions.sessionUpdated({
        session: session('s1', { checkedItems: [] }),
      }),
    );
    expect(next.entities['s1']).toBeDefined();
  });

  it('removes on session closed', () => {
    const seeded = sessionsReducer(
      initialSessionsState,
      sessionsActions.sessionsLoaded({ sessions: [session('s1')] }),
    );
    const next = sessionsReducer(
      seeded,
      sessionsActions.sessionClosed({ id: 's1' as SessionId }),
    );
    expect(next.entities['s1']).toBeUndefined();
  });

  it('applies session changes batch', () => {
    const seeded = sessionsReducer(
      initialSessionsState,
      sessionsActions.sessionsLoaded({ sessions: [session('s1'), session('s2')] }),
    );
    const next = sessionsReducer(
      seeded,
      sessionsActions.sessionChangesReceived({
        sessions: [session('s3')],
        removed: ['s1' as SessionId],
      }),
    );
    expect(next.entities['s1']).toBeUndefined();
    expect(next.entities['s3']).toBeDefined();
  });
});
