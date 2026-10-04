import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, EMPTY, filter, from, map, switchMap, take, tap, timer } from 'rxjs';
import { sessionsActions, sessionsApiActions } from './sessions.actions';
import { selectActiveSessionForCurrentShop } from './sessions.selectors';
import { accountActions } from '../account/account.actions';
import { uiActions } from '../ui/ui.actions';
import { itemsActions, itemsApiActions } from '../items/items.actions';
import { SessionApiService } from '../../core/api/session-api.service';
import { onApiFailure } from '../../core/diagnostics/api-failure';
import type { Session } from '../../models/session.model';
import type { SessionId } from '../../models/ids.model';
import type { NotFoundError, SessionConflictError } from '../../models/errors.model';

export const SESSION_INACTIVITY_MS = 30 * 60 * 1000;

@Injectable()
export class SessionsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly sessionApi = inject(SessionApiService);
  private lastActivityOverride: number | null = null;

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
      map(({ shopId }) => sessionsApiActions.startSessionRequested({ shopId })),
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
          // Rejection (offline / flaky connectivity) must not kill the
          // effect stream — see the same pattern in items.effects.ts.
          catchError(
            onApiFailure('sessions.startSession', () =>
              sessionsActions.sessionStartFailed(),
            ),
          ),
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
          catchError(
            onApiFailure('sessions.joinSession', () =>
              sessionsActions.sessionStartFailed(),
            ),
          ),
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
          catchError(
            onApiFailure('sessions.closeSession', () =>
              sessionsActions.sessionCloseFailed({ sessionId }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly discardSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(sessionsApiActions.discardSessionRequested),
      switchMap(({ sessionId }) =>
        from(this.sessionApi.discardSession(sessionId)).pipe(
          map(() => sessionsActions.sessionDiscarded({ id: sessionId })),
          catchError(
            onApiFailure('sessions.discardSession', () =>
              sessionsActions.sessionDiscardFailed({ sessionId }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly leaveShopModeOnClose$ = createEffect(() =>
    this.actions$.pipe(
      ofType(sessionsActions.sessionClosed, sessionsActions.sessionDiscarded),
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
        itemsApiActions.checkItemRequested,
        itemsActions.itemUnchecked,
      ),
      tap((action) => {
        // Treat dismissal as fresh activity so the timer resets to a full 30 min
        if (action.type === sessionsActions.sessionInactivityDismissed.type) {
          this.lastActivityOverride = Date.now();
        } else {
          this.lastActivityOverride = null;
        }
      }),
      switchMap(() =>
        this.store.select(selectActiveSessionForCurrentShop).pipe(
          take(1),
          switchMap((session) => {
            if (!session) return EMPTY;
            const sessionActivity =
              session.checkedItems.length > 0
                ? Math.max(
                    session.startedAt,
                    ...session.checkedItems.map((c) => c.checkedAt),
                  )
                : session.startedAt;
            const lastActivity = this.lastActivityOverride
              ? Math.max(sessionActivity, this.lastActivityOverride)
              : sessionActivity;
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
