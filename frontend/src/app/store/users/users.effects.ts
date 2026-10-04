import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, map, switchMap } from 'rxjs';
import { accountActions } from '../account/account.actions';
import { usersActions } from './users.actions';
import { UserApiService } from '../../core/api/user-api.service';
import type { User } from '../../models/user.model';
import type { UserId } from '../../models/ids.model';

@Injectable()
export class UsersEffects {
  private readonly actions$ = inject(Actions);
  private readonly userApi = inject(UserApiService);

  readonly fetchAccountUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        from(this.userApi.fetchAccountUsers()).pipe(
          map((users) => usersActions.usersLoaded({ users })),
        ),
      ),
    ),
  );

  readonly watchUserChanges$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        this.userApi.userChanges$().pipe(
          map((batch) => {
            const users: User[] = batch
              .filter((c) => c.changeType !== 'removed')
              .map((c) => c.entity);
            const removed: UserId[] = batch
              .filter((c) => c.changeType === 'removed')
              .map((c) => c.entity.id);
            return usersActions.userChangesReceived({ users, removed });
          }),
        ),
      ),
    ),
  );
}
