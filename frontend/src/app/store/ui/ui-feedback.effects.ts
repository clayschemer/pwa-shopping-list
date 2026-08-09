import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';
import { itemsActions } from '../items/items.actions';
import { sessionsActions } from '../sessions/sessions.actions';
import { categoriesActions } from '../categories/categories.actions';
import { categoryGroupsActions } from '../category-groups/category-groups.actions';
import { shopsActions } from '../shops/shops.actions';

const SNACKBAR_DURATION_MS = 6000;

/**
 * Surfaces failed API operations to the user. Failures used to die silently
 * (the write never happened but nothing said so) — every failure action now
 * shows a transient snackbar telling the user their change was not saved.
 */
@Injectable()
export class UiFeedbackEffects {
  private readonly actions$ = inject(Actions);
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);

  readonly showFailureSnackbar$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          itemsActions.itemSaveFailed,
          itemsActions.itemCheckFailed,
          itemsActions.itemUncheckFailed,
          sessionsActions.sessionStartFailed,
          sessionsActions.sessionCloseFailed,
          sessionsActions.sessionDiscardFailed,
          categoriesActions.categorySaveFailed,
          categoryGroupsActions.categoryGroupSaveFailed,
          shopsActions.shopSaveFailed,
        ),
        tap((action) => {
          this.snackBar.open(
            this.transloco.translate(this.messageKey(action.type)),
            undefined,
            { duration: SNACKBAR_DURATION_MS },
          );
        }),
      ),
    { dispatch: false },
  );

  private messageKey(actionType: string): string {
    switch (actionType) {
      case itemsActions.itemCheckFailed.type:
        return 'errors.checkFailed';
      case itemsActions.itemUncheckFailed.type:
        return 'errors.uncheckFailed';
      case sessionsActions.sessionStartFailed.type:
        return 'errors.sessionStartFailed';
      case sessionsActions.sessionCloseFailed.type:
        return 'errors.sessionCloseFailed';
      case sessionsActions.sessionDiscardFailed.type:
        return 'errors.sessionDiscardFailed';
      default:
        return 'errors.saveFailed';
    }
  }
}
