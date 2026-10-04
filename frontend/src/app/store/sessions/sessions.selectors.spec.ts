import { describe, it, expect } from 'vitest';
import {
  selectActiveSessionForCurrentShop,
  selectActiveSessions,
  selectShopsWithActiveSessions,
} from './sessions.selectors';
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

describe('sessions selectors', () => {
  it('selectActiveSessions filters completed ones', () => {
    const result = selectActiveSessions.projector([
      session('s1'),
      session('s2', { completedAt: 9 }),
    ]);
    expect(result.map((s) => s.id)).toEqual(['s1']);
  });

  it('selectActiveSessionForCurrentShop returns the session matching selected shop', () => {
    const result = selectActiveSessionForCurrentShop.projector(
      [
        session('s1', { shopId: 'shop-1' as ShopId }),
        session('s2', { shopId: 'shop-2' as ShopId }),
      ],
      'shop-2' as ShopId,
    );
    expect(result?.id).toBe('s2');
  });

  it('selectActiveSessionForCurrentShop returns null when no session matches', () => {
    const result = selectActiveSessionForCurrentShop.projector(
      [session('s1', { shopId: 'shop-1' as ShopId })],
      'shop-3' as ShopId,
    );
    expect(result).toBeNull();
  });

  it('selectActiveSessionForCurrentShop handles null shopId (global)', () => {
    const result = selectActiveSessionForCurrentShop.projector(
      [session('s1', { shopId: null })],
      null,
    );
    expect(result?.id).toBe('s1');
  });

  it('selectShopsWithActiveSessions returns set of active shop ids', () => {
    const result = selectShopsWithActiveSessions.projector([
      session('s1', { shopId: 'shop-1' as ShopId }),
      session('s2', { shopId: 'shop-2' as ShopId }),
    ]);
    expect(result).toEqual(new Set(['shop-1', 'shop-2']));
  });

  it('selectShopsWithActiveSessions includes null for global sessions', () => {
    const result = selectShopsWithActiveSessions.projector([
      session('s1', { shopId: null }),
    ]);
    expect(result.has(null)).toBe(true);
  });

  it('selectShopsWithActiveSessions returns empty set when no active sessions', () => {
    const result = selectShopsWithActiveSessions.projector([]);
    expect(result.size).toBe(0);
  });

  // Bug regression: switching to shop Y while session exists at shop X
  // must NOT return shop X's session (was broken when selector matched by userId)
  it('does not return a session from a different shop when user switches shops', () => {
    const result = selectActiveSessionForCurrentShop.projector(
      [session('s1', { shopId: 'shop-1' as ShopId, participants: ['u1' as UserId] })],
      'shop-2' as ShopId, // user selected shop-2
    );
    expect(result).toBeNull();
  });

  // Bug regression: user has sessions at two shops — selector returns the one
  // matching the currently selected shop, not just any session the user is in
  it('returns correct shop session when user participates in multiple', () => {
    const result = selectActiveSessionForCurrentShop.projector(
      [
        session('s1', { shopId: 'shop-1' as ShopId, participants: ['u1' as UserId] }),
        session('s2', { shopId: 'shop-2' as ShopId, participants: ['u1' as UserId] }),
      ],
      'shop-2' as ShopId,
    );
    expect(result?.id).toBe('s2');
  });
});
