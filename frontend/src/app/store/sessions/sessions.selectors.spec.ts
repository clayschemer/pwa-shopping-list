import { describe, it, expect } from 'vitest';
import {
  selectActiveSessionForCurrentUser,
  selectActiveSessions,
} from './sessions.selectors';
import type { Session } from '../../models/session.model';
import type {
  AccountId,
  SessionId,
  ShopId,
  UserId,
} from '../../models/ids.model';
import type { User } from '../../models/user.model';

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

describe('sessions selectors', () => {
  it('selectActiveSessions filters completed ones', () => {
    const result = selectActiveSessions.projector([
      session('s1'),
      session('s2', { completedAt: 9 }),
    ]);
    expect(result.map((s) => s.id)).toEqual(['s1']);
  });

  it('selectActiveSessionForCurrentUser returns the session including the user', () => {
    const user: User = {
      id: 'u2' as UserId,
      accountId: 'a1' as AccountId,
      email: 'u2@test',
      displayName: 'U2',
    };
    const result = selectActiveSessionForCurrentUser.projector(
      [session('s1'), session('s2', { participants: ['u2' as UserId] })],
      user,
    );
    expect(result?.id).toBe('s2');
  });

  it('returns null when user is not authenticated', () => {
    const result = selectActiveSessionForCurrentUser.projector(
      [session('s1')],
      null,
    );
    expect(result).toBeNull();
  });
});
