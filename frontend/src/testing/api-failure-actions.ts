import type { Action } from '@ngrx/store';
import { uiActions } from '../app/store/ui/ui.actions';
import type { ApiFailureKind } from '../app/core/diagnostics/api-failure';

/**
 * The pair of actions `onApiFailure` emits for one rejected call: the domain
 * fallback that keeps the effect stream alive, then the classified cause for the
 * UI to report.
 *
 * Specs assert both. The `operation` label is what selects the user-facing
 * message, so pinning it here means a renamed or mistyped label fails the suite
 * instead of quietly downgrading the snackbar to the generic wording.
 *
 * `kind` defaults to `unknown` because a spec that rejects with a plain `Error`
 * carries no Firebase error code to classify.
 */
export function apiFailureActions(
  fallback: Action,
  operation: string,
  kind: ApiFailureKind = 'unknown',
): Action[] {
  return [fallback, uiActions.apiFailureObserved({ operation, kind })];
}
