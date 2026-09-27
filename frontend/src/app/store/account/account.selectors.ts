import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { AccountState } from './account.reducer';

export const selectAccountState = createFeatureSelector<AccountState>('account');

export const selectAuthStatus = createSelector(
  selectAccountState,
  (state) => state.status,
);

export const selectCurrentUser = createSelector(
  selectAccountState,
  (state) => state.user,
);

export const selectAccount = createSelector(
  selectAccountState,
  (state) => state.account,
);

export const selectIsAuthenticated = createSelector(
  selectAuthStatus,
  (status) => status === 'authenticated',
);

export const selectIsAuthChecking = createSelector(
  selectAuthStatus,
  (status) => status === 'checking' || status === 'loading',
);

export const selectSignInError = createSelector(
  selectAccountState,
  (state) => state.signInError,
);

export const selectShopOrder = createSelector(
  selectAccount,
  (a) => a?.shopOrder ?? [],
);

export const selectAiConfig = createSelector(
  selectAccount,
  (a) => a?.aiConfig ?? null,
);

export const selectStalePriceDays = createSelector(
  selectAiConfig,
  (cfg) => cfg?.stalePriceDays ?? 90,
);

/**
 * Shared, account-level. Read from the top-level account field rather than from
 * `aiConfig`: rule-driven auto-add works with no AI provider configured.
 */
export const selectAutoAddEnabled = createSelector(
  selectAccount,
  (a) => a?.autoAddEnabled === true,
);
