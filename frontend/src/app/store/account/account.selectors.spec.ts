import { describe, it, expect } from 'vitest';
import {
  selectAuthStatus,
  selectIsAuthenticated,
  selectIsAuthChecking,
  selectCurrentUser,
  selectAccount,
  selectSignInError,
} from './account.selectors';
import type { AccountState } from './account.reducer';
import type { UserId, AccountId } from '../../models/ids.model';

const mockUser = {
  id: 'u1' as UserId,
  accountId: 'a1' as AccountId,
  email: 'test@example.com',
  displayName: 'Test',
};

const mockAccount = {
  id: 'a1' as AccountId,
  name: 'Test Account',
  aiConfig: null,
};

function project(state: AccountState) {
  // Simulate the feature selector projecting from root state
  return { account: state };
}

describe('account selectors', () => {
  it('selectAuthStatus returns the status', () => {
    const state: AccountState = { status: 'loading', user: mockUser, account: null, signInError: null };
    expect(selectAuthStatus.projector(state)).toBe('loading');
  });

  it('selectIsAuthenticated is true only when authenticated', () => {
    expect(selectIsAuthenticated.projector('authenticated')).toBe(true);
    expect(selectIsAuthenticated.projector('checking')).toBe(false);
    expect(selectIsAuthenticated.projector('unauthenticated')).toBe(false);
  });

  it('selectIsAuthChecking is true for checking and loading', () => {
    expect(selectIsAuthChecking.projector('checking')).toBe(true);
    expect(selectIsAuthChecking.projector('loading')).toBe(true);
    expect(selectIsAuthChecking.projector('authenticated')).toBe(false);
    expect(selectIsAuthChecking.projector('unauthenticated')).toBe(false);
  });

  it('selectCurrentUser returns user', () => {
    const state: AccountState = { status: 'authenticated', user: mockUser, account: mockAccount, signInError: null };
    expect(selectCurrentUser.projector(state)).toEqual(mockUser);
  });

  it('selectAccount returns account', () => {
    const state: AccountState = { status: 'authenticated', user: mockUser, account: mockAccount, signInError: null };
    expect(selectAccount.projector(state)).toEqual(mockAccount);
  });

  it('selectSignInError returns error code', () => {
    const state: AccountState = { status: 'unauthenticated', user: null, account: null, signInError: 'auth/wrong-password' };
    expect(selectSignInError.projector(state)).toBe('auth/wrong-password');
  });
});
