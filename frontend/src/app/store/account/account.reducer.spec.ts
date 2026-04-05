import { describe, it, expect } from 'vitest';
import { accountReducer, initialAccountState } from './account.reducer';
import { authActions, accountActions } from './account.actions';
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

describe('accountReducer', () => {
  it('starts in checking status with no user or account', () => {
    const state = accountReducer(undefined, { type: '@@INIT' });
    expect(state.status).toBe('checking');
    expect(state.user).toBeNull();
    expect(state.account).toBeNull();
  });

  it('transitions to loading and sets user when auth state resolves with a user', () => {
    const state = accountReducer(
      initialAccountState,
      authActions.authStateResolved({ user: mockUser })
    );
    expect(state.status).toBe('loading');
    expect(state.user).toEqual(mockUser);
    expect(state.account).toBeNull();
  });

  it('transitions to unauthenticated and clears state when auth state is empty', () => {
    const withUser = accountReducer(
      initialAccountState,
      authActions.authStateResolved({ user: mockUser })
    );
    const state = accountReducer(withUser, authActions.authStateEmpty());
    expect(state.status).toBe('unauthenticated');
    expect(state.user).toBeNull();
    expect(state.account).toBeNull();
  });

  it('transitions to authenticated and sets account when account loads', () => {
    const withUser = accountReducer(
      initialAccountState,
      authActions.authStateResolved({ user: mockUser })
    );
    const state = accountReducer(
      withUser,
      accountActions.accountLoaded({ account: mockAccount })
    );
    expect(state.status).toBe('authenticated');
    expect(state.account).toEqual(mockAccount);
    expect(state.user).toEqual(mockUser);
  });

  it('transitions to access_denied when account returns access denied', () => {
    const withUser = accountReducer(
      initialAccountState,
      authActions.authStateResolved({ user: mockUser })
    );
    const state = accountReducer(withUser, accountActions.accessDenied());
    expect(state.status).toBe('access_denied');
    expect(state.user).toEqual(mockUser);
    expect(state.account).toBeNull();
  });

  it('resets to unauthenticated and clears all state on sign out', () => {
    const authenticated = accountReducer(
      accountReducer(
        accountReducer(initialAccountState, authActions.authStateResolved({ user: mockUser })),
        accountActions.accountLoaded({ account: mockAccount })
      ),
      authActions.signedOut()
    );
    expect(authenticated.status).toBe('unauthenticated');
    expect(authenticated.user).toBeNull();
    expect(authenticated.account).toBeNull();
  });
});
