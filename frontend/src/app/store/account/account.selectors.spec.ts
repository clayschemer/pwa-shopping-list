import { describe, it, expect } from 'vitest';
import {
  selectAuthStatus,
  selectCurrentUser,
  selectAccount,
  selectIsAuthenticated,
  selectIsAuthChecking,
} from './account.selectors';
import type { AccountState } from './account.reducer';
import type { User } from '../../models/user.model';
import type { Account } from '../../models/account.model';
import type { UserId, AccountId } from '../../models/ids.model';

const mockUser: User = {
  id: 'uid-1' as UserId,
  accountId: 'acc-1' as AccountId,
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockAccount: Account = {
  id: 'acc-1' as AccountId,
  name: 'Test Account',
  aiConfig: null,
};

const buildState = (partial: Partial<AccountState>): { account: AccountState } => ({
  account: {
    status: 'checking',
    user: null,
    account: null,
    ...partial,
  },
});

describe('account selectors', () => {
  it('selectAuthStatus returns the current status', () => {
    expect(selectAuthStatus(buildState({ status: 'authenticated' }))).toBe('authenticated');
    expect(selectAuthStatus(buildState({ status: 'unauthenticated' }))).toBe('unauthenticated');
  });

  it('selectCurrentUser returns the signed-in user', () => {
    expect(selectCurrentUser(buildState({ user: mockUser }))).toEqual(mockUser);
    expect(selectCurrentUser(buildState({ user: null }))).toBeNull();
  });

  it('selectAccount returns the loaded account', () => {
    expect(selectAccount(buildState({ account: mockAccount }))).toEqual(mockAccount);
    expect(selectAccount(buildState({ account: null }))).toBeNull();
  });

  it('selectIsAuthenticated is true only when status is authenticated', () => {
    expect(selectIsAuthenticated(buildState({ status: 'authenticated' }))).toBe(true);
    expect(selectIsAuthenticated(buildState({ status: 'loading' }))).toBe(false);
    expect(selectIsAuthenticated(buildState({ status: 'unauthenticated' }))).toBe(false);
    expect(selectIsAuthenticated(buildState({ status: 'access_denied' }))).toBe(false);
  });

  it('selectIsAuthChecking is true while status is checking or loading', () => {
    expect(selectIsAuthChecking(buildState({ status: 'checking' }))).toBe(true);
    expect(selectIsAuthChecking(buildState({ status: 'loading' }))).toBe(true);
    expect(selectIsAuthChecking(buildState({ status: 'authenticated' }))).toBe(false);
    expect(selectIsAuthChecking(buildState({ status: 'unauthenticated' }))).toBe(false);
  });
});
