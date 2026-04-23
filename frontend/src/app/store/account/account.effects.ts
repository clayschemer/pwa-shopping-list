import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, defer, from, map, of, switchMap, tap } from 'rxjs';
import { authActions, accountActions } from './account.actions';
import { AccountApiService } from '../../core/api/account-api.service';
import { StreamErrorService } from '../../core/api/stream-error.service';
import type { Account } from '../../models/account.model';
import type { ShopId } from '../../models/ids.model';
import type {
  AccessDeniedError,
  AuthError,
  PendingVerificationError,
} from '../../models/errors.model';

@Injectable()
export class AccountEffects {
  private readonly actions$ = inject(Actions);
  private readonly accountApi = inject(AccountApiService);
  private readonly router = inject(Router);
  private readonly streamError = inject(StreamErrorService);

  readonly watchStreamErrors$ = createEffect(() =>
    this.streamError.stream$.pipe(
      map((err) => {
        if (err.type === 'AUTH_REVOKED') {
          return accountActions.streamAuthRevoked();
        }
        if (err.type === 'ACCOUNT_NOT_FOUND') {
          return accountActions.streamAccountNotFound();
        }
        return accountActions.streamFailed({ message: err.message });
      }),
    ),
  );

  /** Subscribe to Firebase auth state on app init. */
  readonly watchAuthState$ = createEffect(() =>
    defer(() => this.accountApi.getAuthState()).pipe(
      map((user) =>
        user
          ? authActions.authStateResolved({ user })
          : authActions.authStateEmpty(),
      ),
    ),
  );

  /** Once auth resolves, fetch the account (allowlist check). */
  readonly loadAccount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(authActions.authStateResolved),
      switchMap(() =>
        from(this.accountApi.getAccount()).pipe(
          map((result) => {
            const tag = (result as AccessDeniedError | PendingVerificationError).type;
            if (tag === 'ACCESS_DENIED') {
              return accountActions.accessDenied();
            }
            if (tag === 'PENDING_VERIFICATION') {
              return accountActions.pendingVerification();
            }
            const { account, selectedShopId } = result as {
              account: Account;
              selectedShopId: ShopId | null;
            };
            return accountActions.accountLoaded({ account, selectedShopId });
          }),
          catchError(() => of(accountActions.accessDenied())),
        ),
      ),
    ),
  );

  /** Google OAuth popup. Auth result is picked up by watchAuthState$. */
  readonly signInWithGoogle$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(authActions.signInWithGoogleRequested),
        switchMap(() => from(this.accountApi.signInWithGoogle())),
      ),
    { dispatch: false },
  );

  /** Email/password sign-in. */
  readonly signInWithEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(authActions.signInWithEmailRequested),
      switchMap(({ email, password }) =>
        from(this.accountApi.signInWithEmail(email, password)).pipe(
          map((result) => {
            if (result && (result as AuthError).type === 'AUTH_FAILED') {
              return authActions.signInFailed({ code: (result as AuthError).code });
            }
            // Success — authState observable will emit the new user
            return { type: '[Auth] Email Sign In Success (noop)' };
          }),
          catchError(() => of(authActions.signInFailed({ code: 'auth/unknown' }))),
        ),
      ),
    ),
  );

  /** Sign out. */
  readonly signOut$ = createEffect(() =>
    this.actions$.pipe(
      ofType(authActions.signOutRequested),
      switchMap(() =>
        from(this.accountApi.signOut()).pipe(
          map(() => authActions.signedOut()),
        ),
      ),
    ),
  );

  /** Navigate to sign-in after sign out completes. */
  readonly navigateOnSignOut$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(authActions.signedOut),
        tap(() => this.router.navigateByUrl('/sign-in')),
      ),
    { dispatch: false },
  );

  /** Navigate to sign-in when auth session expires or is revoked mid-use. */
  readonly navigateOnAuthLost$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(authActions.authStateEmpty, accountActions.streamAuthRevoked),
        tap(() => this.router.navigateByUrl('/sign-in')),
      ),
    { dispatch: false },
  );
}
