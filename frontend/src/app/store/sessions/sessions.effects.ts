import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { defer, from, map, switchMap } from 'rxjs';
import { sessionsActions, sessionsApiActions } from './sessions.actions';
import { SessionApiService } from '../../core/api/session-api.service';
import { ChangeStreamService } from '../../core/stream/change-stream.service';
import type { SessionConflictError } from '../../models/errors.model';
import type { Session } from '../../models/session.model';

@Injectable()
export class SessionsEffects {
  private readonly actions$ = inject(Actions);
  private readonly sessionApi = inject(SessionApiService);
  private readonly streams = inject(ChangeStreamService);

  readonly loadSessions$ = createEffect(() =>
    this.actions$.pipe(
      ofType('@ngrx/effects/init' as never),
      switchMap(() =>
        from(this.sessionApi.fetchActiveSessions()).pipe(
          map((sessions) =>
            sessionsApiActions.fetchActiveSessionsSuccess({ sessions }),
          ),
        ),
      ),
    ),
  );

  readonly sessionStream$ = createEffect(() =>
    defer(() => this.streams.sessionChanges$).pipe(
      map((changes) => sessionsApiActions.sessionStreamUpdated({ changes })),
    ),
  );

  readonly startSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(sessionsActions.startSessionRequested),
      switchMap(({ shopId }) =>
        from(this.sessionApi.startSession(shopId)).pipe(
          map((result) =>
            (result as SessionConflictError).type === 'SESSION_CONFLICT'
              ? sessionsApiActions.startSessionConflict()
              : sessionsApiActions.startSessionSuccess({
                  session: result as Session,
                }),
          ),
        ),
      ),
    ),
  );

  readonly joinSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(sessionsActions.joinSessionRequested),
      switchMap(({ sessionId }) =>
        from(this.sessionApi.joinSession(sessionId)).pipe(
          map((result) =>
            sessionsApiActions.joinSessionSuccess({ session: result as Session }),
          ),
        ),
      ),
    ),
  );

  readonly closeSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(sessionsActions.closeSessionRequested),
      switchMap(({ sessionId }) =>
        from(this.sessionApi.closeSession(sessionId)).pipe(
          map((result) =>
            sessionsApiActions.closeSessionSuccess({ session: result as Session }),
          ),
        ),
      ),
    ),
  );
}
