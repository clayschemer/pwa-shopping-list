import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { filter, from, map, switchMap, take, withLatestFrom } from 'rxjs';
import { sessionsActions, sessionsApiActions } from './sessions.actions';
import { selectActiveSessionForCurrentUser } from './sessions.selectors';
import { accountActions } from '../account/account.actions';
import { uiActions } from '../ui/ui.actions';
import { SessionApiService } from '../../core/api/session-api.service';
import type { Session } from '../../models/session.model';
import type { NotFoundError, SessionConflictError } from '../../models/errors.model';

@Injectable()
export class SessionsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly sessionApi = inject(SessionApiService);

  readonly fetchActiveSessions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        from(this.sessionApi.fetchActiveSessions()).pipe(
          map((sessions) => sessionsActions.sessionsLoaded({ sessions })),
        ),
      ),
    ),
  );

  readonly autoStartOnShopSelected$ = createEffect(() =>
    this.actions$.pipe(
      ofType(uiActions.switchToShopModeWithShop),
      switchMap(({ shopId }) =>
        this.store.select(selectActiveSessionForCurrentUser).pipe(
          take(1),
          filter((existing) => existing === null),
          map(() => sessionsApiActions.startSessionRequested({ shopId })),
        ),
      ),
    ),
  );

  readonly startSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(sessionsApiActions.startSessionRequested),
      switchMap(({ shopId }) =>
        from(this.sessionApi.startSession(shopId)).pipe(
          map((result) => {
            if ((result as SessionConflictError).type === 'SESSION_CONFLICT') {
              return sessionsActions.sessionStartConflict();
            }
            return sessionsActions.sessionStarted({ session: result as Session });
          }),
        ),
      ),
    ),
  );

  readonly joinSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(sessionsApiActions.joinSessionRequested),
      switchMap(({ sessionId }) =>
        from(this.sessionApi.joinSession(sessionId)).pipe(
          map((result) => {
            if ((result as NotFoundError).type === 'NOT_FOUND') {
              return { type: '[Sessions] Join Not Found (noop)' };
            }
            return sessionsActions.sessionJoined({
              session: result as Session,
            });
          }),
        ),
      ),
    ),
  );

  readonly closeSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(sessionsApiActions.closeSessionRequested),
      switchMap(({ sessionId }) =>
        from(this.sessionApi.closeSession(sessionId)).pipe(
          map(() => sessionsActions.sessionClosed({ id: sessionId })),
        ),
      ),
    ),
  );

  readonly leaveShopModeOnClose$ = createEffect(() =>
    this.actions$.pipe(
      ofType(sessionsActions.sessionClosed),
      map(() => uiActions.switchToPlanMode()),
    ),
  );
}
