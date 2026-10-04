import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';
import { autoAddActions } from '../items/items.actions';
import { uiActions } from './ui.actions';
import type { ApiFailureKind } from '../../core/diagnostics/api-failure';

const SNACKBAR_DURATION_MS = 6000;

/**
 * What could not be done, keyed by the failing operation.
 *
 * Only operations whose failure reads oddly under the generic message need an
 * entry. The fallback rules below cover the rest, so adding an API call does not
 * require touching this table to get a sensible message.
 */
export const WHAT_BY_OPERATION: Readonly<Record<string, string>> = {
  'items.checkItem': 'errors.checkFailed',
  'items.uncheckItem': 'errors.uncheckFailed',
  'sessions.startSession': 'errors.sessionStartFailed',
  'sessions.joinSession': 'errors.sessionStartFailed',
  'sessions.closeSession': 'errors.sessionCloseFailed',
  'sessions.discardSession': 'errors.sessionDiscardFailed',
  'autoAdd.evaluate': 'errors.autoAddFailed',
  'account.getAccount': 'errors.accountLoadFailed',
  'stream.listen': 'errors.streamFailed',
};

/** Why it could not be done. One message per classified cause, no overlap. */
export const WHY_BY_KIND: Readonly<Record<ApiFailureKind, string>> = {
  offline: 'errors.cause.offline',
  quotaExceeded: 'errors.cause.quotaExceeded',
  permissionDenied: 'errors.cause.permissionDenied',
  authExpired: 'errors.cause.authExpired',
  notConfigured: 'errors.cause.notConfigured',
  contention: 'errors.cause.contention',
  unknown: 'errors.cause.unknown',
};

/**
 * Operations that already render their own error where the user is looking. A
 * snackbar on top of those repeats the same thing in vaguer words.
 */
export const OWN_ERROR_SURFACE: ReadonlySet<string> = new Set(['auth.signInWithEmail']);

/**
 * The message key for what an operation was trying to do.
 *
 * Reads get their own key: "your change could not be saved" is wrong when nothing
 * was being saved, and a boot fetch that fails silently is how a list comes to
 * look empty rather than unloaded.
 */
export function whatKeyFor(operation: string): string {
  const mapped = WHAT_BY_OPERATION[operation];
  if (mapped) return mapped;
  return /\.(fetch|get)/i.test(operation) ? 'errors.loadFailed' : 'errors.saveFailed';
}

/**
 * Tells the user what the app could not do, and why.
 *
 * Failures used to die silently; then they all shared one message that blamed
 * the connection. That message is true for `unavailable` and a lie for the rest
 * — an exhausted Firestore read quota, undeployed rules and a missing index all
 * presented as "check your connection", and cost several shopping trips spent
 * debugging a network that was fine. Every snackbar is now composed from the
 * operation that failed and its classified cause, so the two halves stay
 * independently translatable and neither can be guessed at.
 */
@Injectable()
export class UiFeedbackEffects {
  private readonly actions$ = inject(Actions);
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);

  private syncRef: MatSnackBarRef<unknown> | null = null;

  readonly showFailureSnackbar$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(uiActions.apiFailureObserved),
        tap(({ operation, kind }) => {
          if (OWN_ERROR_SURFACE.has(operation)) return;
          this.snackBar.open(
            this.transloco.translate('errors.withCause', {
              what: this.transloco.translate(whatKeyFor(operation)),
              why: this.transloco.translate(WHY_BY_KIND[kind]),
            }),
            undefined,
            { duration: SNACKBAR_DURATION_MS },
          );
        }),
      ),
    { dispatch: false },
  );

  /**
   * Brackets the recurring-item evaluation with a snackbar that lasts exactly as
   * long as the run does — no duration, because a timer would either lie about a
   * long sync or linger past a short one.
   */
  readonly showSyncSnackbar$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(autoAddActions.syncStarted, autoAddActions.syncFinished),
        tap((action) => {
          if (action.type === autoAddActions.syncStarted.type) {
            this.syncRef = this.snackBar.open(
              this.transloco.translate('autoAdd.syncing'),
              undefined,
              {},
            );
            return;
          }
          // Dismissing an already-dismissed ref is a no-op, which is what makes
          // it safe when a failure snackbar has replaced this one meanwhile.
          this.syncRef?.dismiss();
          this.syncRef = null;
        }),
      ),
    { dispatch: false },
  );
}
