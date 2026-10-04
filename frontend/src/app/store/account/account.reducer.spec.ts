import { describe, it, expect } from 'vitest';
import { accountReducer, initialAccountState } from './account.reducer';
import { authActions, accountActions, accountApiActions } from './account.actions';
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
  autoAddEnabled: false,
  autoAddLastRunAt: null,
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
      accountActions.accountLoaded({ account: mockAccount, selectedShopId: null }),
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

  it('transitions to pending_verification on pendingVerification', () => {
    const loadingState = accountReducer(
      initialAccountState,
      authActions.authStateResolved({ user: mockUser }),
    );
    const state = accountReducer(
      loadingState,
      accountActions.pendingVerification(),
    );
    expect(state.status).toBe('pending_verification');
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

  /**
   * The account document is not streamed, so the toggle has to be applied
   * optimistically on the request and reverted on failure — nothing else would
   * ever correct the displayed value.
   */
  describe('auto-add toggle', () => {
    function loaded() {
      return accountReducer(
        initialAccountState,
        accountActions.accountLoaded({ account: mockAccount, selectedShopId: null }),
      );
    }

    it('applies the new value as soon as the write is requested', () => {
      const state = accountReducer(
        loaded(),
        accountApiActions.setAutoAddEnabledRequested({ enabled: true }),
      );

      expect(state.account?.autoAddEnabled).toBe(true);
    });

    it('confirms the value on success without changing it', () => {
      const requested = accountReducer(
        loaded(),
        accountApiActions.setAutoAddEnabledRequested({ enabled: true }),
      );
      const state = accountReducer(
        requested,
        accountActions.autoAddEnabledChanged({ enabled: true }),
      );

      expect(state.account?.autoAddEnabled).toBe(true);
    });

    it('reverts the value when the write fails', () => {
      const requested = accountReducer(
        loaded(),
        accountApiActions.setAutoAddEnabledRequested({ enabled: true }),
      );
      const state = accountReducer(
        requested,
        accountActions.autoAddEnableFailed({ enabled: true }),
      );

      expect(state.account?.autoAddEnabled).toBe(false);
    });

    it('reverts a disable that failed back to enabled', () => {
      const enabled = accountReducer(
        loaded(),
        accountApiActions.setAutoAddEnabledRequested({ enabled: true }),
      );
      const disabling = accountReducer(
        enabled,
        accountApiActions.setAutoAddEnabledRequested({ enabled: false }),
      );
      const state = accountReducer(
        disabling,
        accountActions.autoAddEnableFailed({ enabled: false }),
      );

      expect(state.account?.autoAddEnabled).toBe(true);
    });

    it('ignores the toggle when no account is loaded', () => {
      const state = accountReducer(
        initialAccountState,
        accountApiActions.setAutoAddEnabledRequested({ enabled: true }),
      );

      expect(state.account).toBeNull();
    });
  });
});
