import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY, filter, from, map, switchMap, take, timer } from 'rxjs';
import { sessionsActions, sessionsApiActions } from './sessions.actions';
import { selectActiveSessionForCurrentUser } from './sessions.selectors';
import { accountActions } from '../account/account.actions';
import { uiActions } from '../ui/ui.actions';
import { itemsActions } from '../items/items.actions';
import { SessionApiService } from '../../core/api/session-api.service';
import type { Session } from '../../models/session.model';
import type { SessionId } from '../../models/ids.model';
import type { NotFoundError, SessionConflictError } from '../../models/errors.model';

export const SESSION_INACTIVITY_MS = 30 * 60 * 1000;

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

  readonly watchSessionChanges$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountActions.accountLoaded),
      switchMap(() =>
        this.sessionApi.sessionChanges$().pipe(
          map((batch) => {
            const sessions: Session[] = batch
              .filter((c) => c.changeType !== 'removed')
              .map((c) => c.entity);
            const removed: SessionId[] = batch
              .filter((c) => c.changeType === 'removed')
              .map((c) => c.entity.id);
            return sessionsActions.sessionChangesReceived({ sessions, removed });
          }),
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

  readonly inactivityTimer$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        sessionsActions.sessionStarted,
        sessionsActions.sessionJoined,
        sessionsActions.sessionUpdated,
        sessionsActions.sessionInactivityDismissed,
        itemsActions.checkItemPending,
        itemsActions.checkItemUndoneDuringWindow,
      ),
      switchMap(() =>
        this.store.select(selectActiveSessionForCurrentUser).pipe(
          take(1),
          switchMap((session) => {
            if (!session) return EMPTY;
            const lastActivity =
              session.checkedItems.length > 0
                ? Math.max(
                    session.startedAt,
                    ...session.checkedItems.map((c) => c.checkedAt),
                  )
                : session.startedAt;
            const elapsed = Date.now() - lastActivity;
            const delay = Math.max(0, SESSION_INACTIVITY_MS - elapsed);
            return timer(delay).pipe(
              map(() =>
                sessionsActions.sessionInactive({ sessionId: session.id }),
              ),
            );
          }),
        ),
      ),
    ),
  );
}
