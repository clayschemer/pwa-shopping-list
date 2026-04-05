import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY, filter, interval, map, switchMap, take, timer, withLatestFrom } from 'rxjs';
import { uiActions } from './ui.actions';
import { sessionsActions } from '../sessions/sessions.actions';
import { itemsActions } from '../items/items.actions';
import { selectCurrentUser } from '../account/account.selectors';
import { selectMyActiveSession } from '../sessions/sessions.selectors';
import { selectPendingUndo } from './ui.selectors';

const UNDO_WINDOW_MS = 4000;
const INACTIVE_SESSION_CHECK_MS = 30_000;
const INACTIVE_THRESHOLD_MS = 30 * 60 * 1000;

@Injectable()
export class UiEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);

  /** Auto-start a session when the user enters shop mode. */
  readonly autoStartSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(uiActions.switchToShopModeWithShop),
      withLatestFrom(this.store.select(selectCurrentUser)),
      switchMap(([{ shopId }, user]) => {
        if (!user) return EMPTY;
        return this.store.select(selectMyActiveSession(user.id)).pipe(
          take(1),
          filter((activeSession) => activeSession === null),
          map(() => sessionsActions.startSessionRequested({ shopId })),
        );
      }),
    ),
  );

  /** Start the 4-second undo expiry timer when an item is checked. */
  readonly startUndoTimer$ = createEffect(() =>
    this.actions$.pipe(
      ofType(uiActions.checkUndoPending),
      switchMap(() =>
        timer(UNDO_WINDOW_MS).pipe(map(() => uiActions.checkUndoExpired())),
      ),
    ),
  );

  /** When undo is cancelled by the user (re-tap), call uncheckItem. */
  readonly executeUndo$ = createEffect(() =>
    this.actions$.pipe(
      ofType(uiActions.checkUndoCancelled),
      withLatestFrom(this.store.select(selectPendingUndo)),
      filter(([, pendingUndo]) => pendingUndo !== null),
      map(([, pendingUndo]) =>
        itemsActions.uncheckItemRequested({
          id: pendingUndo!.itemId,
          sessionId: pendingUndo!.sessionId,
        }),
      ),
    ),
  );

  /** Poll every 30 seconds; if the active session has been idle 30+ min, show reminder. */
  readonly inactiveSessionReminder$ = createEffect(() =>
    interval(INACTIVE_SESSION_CHECK_MS).pipe(
      withLatestFrom(this.store.select(selectCurrentUser)),
      switchMap(([, user]) => {
        if (!user) return EMPTY;
        return this.store.select(selectMyActiveSession(user.id)).pipe(
          take(1),
          filter((session) => {
            if (!session) return false;
            const lastActivity =
              session.checkedItems.length > 0
                ? Math.max(...session.checkedItems.map((ci) => ci.checkedAt))
                : session.startedAt;
            return Date.now() - lastActivity >= INACTIVE_THRESHOLD_MS;
          }),
          map(() => uiActions.showInactiveSessionReminder()),
        );
      }),
    ),
  );
}
