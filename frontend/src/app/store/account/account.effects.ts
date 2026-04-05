import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { defer, from, map, switchMap } from 'rxjs';
import { authActions, accountActions } from './account.actions';
import { AccountApiService } from '../../core/api/account-api.service';
import type { Account } from '../../models/account.model';
import type { AccessDeniedError } from '../../models/errors.model';

@Injectable()
export class AccountEffects {
  private readonly actions$ = inject(Actions);
  private readonly accountApi = inject(AccountApiService);

  readonly watchAuthState$ = createEffect(() =>
    defer(() => this.accountApi.getAuthState()).pipe(
      map((user) =>
        user
          ? authActions.authStateResolved({ user })
          : authActions.authStateEmpty()
      ),
    )
  );

  readonly loadAccount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(authActions.authStateResolved),
      switchMap(() =>
        from(this.accountApi.getAccount()).pipe(
          map((result) =>
            (result as AccessDeniedError).type === 'ACCESS_DENIED'
              ? accountActions.accessDenied()
              : accountActions.accountLoaded({ account: result as Account })
          ),
        )
      ),
    )
  );

  readonly signOut$ = createEffect(() =>
    this.actions$.pipe(
      ofType(authActions.signOutRequested),
      switchMap(() =>
        from(this.accountApi.signOut()).pipe(
          map(() => authActions.signedOut())
        )
      ),
    )
  );
}
