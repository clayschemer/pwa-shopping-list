import { describe, it, expect } from 'vitest';
import { accountReducer, initialAccountState } from './account.reducer';
import { authActions, accountActions } from './account.actions';
import type { UserId, AccountId } from '../../models/ids.model';

const mockUser = {
  id: 'u1' as UserId,
  accountId: '' as AccountId,
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockAccount = {
  id: 'a1' as AccountId,
  name: 'Test Account',
  aiConfig: null,
};

describe('accountReducer', () => {
  it('has initial status of checking', () => {
    const state = accountReducer(undefined, { type: '@@INIT' } as never);
    expect(state.status).toBe('checking');
    expect(state.user).toBeNull();
    expect(state.account).toBeNull();
  });

  it('transitions to loading on authStateResolved', () => {
    const state = accountReducer(
      initialAccountState,
      authActions.authStateResolved({ user: mockUser }),
    );
    expect(state.status).toBe('loading');
    expect(state.user).toEqual(mockUser);
    expect(state.account).toBeNull();
  });

  it('transitions to unauthenticated on authStateEmpty', () => {
    const state = accountReducer(
      initialAccountState,
      authActions.authStateEmpty(),
    );
    expect(state.status).toBe('unauthenticated');
    expect(state.user).toBeNull();
  });

  it('transitions to authenticated on accountLoaded', () => {
    const loadingState = accountReducer(
      initialAccountState,
      authActions.authStateResolved({ user: mockUser }),
    );
    const state = accountReducer(
      loadingState,
      accountActions.accountLoaded({ account: mockAccount }),
    );
    expect(state.status).toBe('authenticated');
    expect(state.account).toEqual(mockAccount);
    expect(state.user).toEqual(mockUser);
  });

  it('transitions to access_denied on accessDenied', () => {
    const loadingState = accountReducer(
      initialAccountState,
      authActions.authStateResolved({ user: mockUser }),
    );
    const state = accountReducer(loadingState, accountActions.accessDenied());
    expect(state.status).toBe('access_denied');
    expect(state.account).toBeNull();
    expect(state.user).toEqual(mockUser);
  });

  it('transitions to unauthenticated on signedOut', () => {
    const authState = accountReducer(
      initialAccountState,
      authActions.authStateResolved({ user: mockUser }),
    );
    const state = accountReducer(authState, authActions.signedOut());
    expect(state.status).toBe('unauthenticated');
    expect(state.user).toBeNull();
    expect(state.account).toBeNull();
  });

  it('does not change state on signInWithGoogleRequested', () => {
    const state = accountReducer(
      initialAccountState,
      authActions.signInWithGoogleRequested(),
    );
    expect(state).toEqual(initialAccountState);
  });

  it('stores sign-in error on signInFailed', () => {
    const state = accountReducer(
      initialAccountState,
      authActions.signInFailed({ code: 'auth/wrong-password' }),
    );
    expect(state.signInError).toBe('auth/wrong-password');
  });

  it('clears sign-in error on authStateResolved', () => {
    const withError = accountReducer(
      initialAccountState,
      authActions.signInFailed({ code: 'auth/wrong-password' }),
    );
    const state = accountReducer(
      withError,
      authActions.authStateResolved({ user: mockUser }),
    );
    expect(state.signInError).toBeNull();
  });
});
