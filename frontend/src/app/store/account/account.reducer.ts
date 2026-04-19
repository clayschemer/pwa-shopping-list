import { createReducer, on } from '@ngrx/store';
import { authActions, accountActions } from './account.actions';
import type { User } from '../../models/user.model';
import type { Account } from '../../models/account.model';

export type AuthStatus =
  | 'checking'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'access_denied'
  | 'pending_verification'
  | 'stream_failed';

export interface AccountState {
  status: AuthStatus;
  user: User | null;
  account: Account | null;
  signInError: string | null;
  streamError: string | null;
}

export const initialAccountState: AccountState = {
  status: 'checking',
  user: null,
  account: null,
  signInError: null,
  streamError: null,
};

export const accountReducer = createReducer(
  initialAccountState,

  on(authActions.authStateResolved, (state, { user }) => ({
    ...state,
    status: 'loading' as const,
    user,
    account: null,
    signInError: null,
  })),

  on(authActions.authStateEmpty, () => ({
    status: 'unauthenticated' as const,
    user: null,
    account: null,
    signInError: null,
    streamError: null,
  })),

  on(accountActions.accountLoaded, (state, { account }) => ({
    ...state,
    status: 'authenticated' as const,
    account,
  })),

  on(accountActions.accessDenied, (state) => ({
    ...state,
    status: 'access_denied' as const,
    account: null,
  })),

  on(accountActions.pendingVerification, (state) => ({
    ...state,
    status: 'pending_verification' as const,
    account: null,
  })),

  on(authActions.signInFailed, (state, { code }) => ({
    ...state,
    signInError: code,
  })),

  on(authActions.signedOut, () => ({
    status: 'unauthenticated' as const,
    user: null,
    account: null,
    signInError: null,
    streamError: null,
  })),

  on(accountActions.streamAuthRevoked, (state) => ({
    ...state,
    status: 'unauthenticated' as const,
    user: null,
    account: null,
  })),

  on(accountActions.streamAccountNotFound, (state) => ({
    ...state,
    status: 'access_denied' as const,
    account: null,
  })),

  on(accountActions.streamFailed, (state, { message }) => ({
    ...state,
    status: 'stream_failed' as const,
    streamError: message,
  })),
);
