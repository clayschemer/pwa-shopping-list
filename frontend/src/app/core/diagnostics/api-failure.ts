import { EMPTY, Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { uiActions } from '../../store/ui/ui.actions';

/**
 * Diagnostics for swallowed API failures.
 *
 * Every write effect converts a rejected API promise into a failure action so
 * the effect stream survives. The failure is logged with its error code — on a
 * phone running the deployed PWA the console is the only diagnostic channel
 * there is — and classified, so the snackbar can name the actual cause instead
 * of guessing at the connection.
 *
 * Logging is deliberately NOT gated on dev mode — production is exactly where
 * these failures happen, and the volume is one line per failed write.
 */

/**
 * Why an API call failed, at the granularity the user needs to act on.
 *
 * These were all reported as "check your connection and try again", which is
 * true for exactly one of them. The others sent the user hunting a network
 * problem that did not exist — a full shopping trip's worth, more than once.
 */
export type ApiFailureKind =
  /** No usable connection, or the server never answered. */
  | 'offline'
  /** Firestore's daily free-tier allowance is spent. Nothing works until it resets. */
  | 'quotaExceeded'
  /** Security rules rejected the call — typically rules that were never deployed. */
  | 'permissionDenied'
  /** The auth token is gone or revoked; the user has to sign in again. */
  | 'authExpired'
  /** The backend is missing something the call needs, usually a Firestore index. */
  | 'notConfigured'
  /** Transaction contention — a genuine retry-worthy collision. */
  | 'contention'
  /** Anything unrecognised. The only kind that may be reported vaguely. */
  | 'unknown';

/**
 * `deadline-exceeded` folds into `offline` on purpose: the server not answering
 * in time and not being reachable are the same problem from the user's side,
 * and the advice is identical.
 */
const KIND_BY_CODE: Readonly<Record<string, ApiFailureKind>> = {
  unavailable: 'offline',
  'deadline-exceeded': 'offline',
  'resource-exhausted': 'quotaExceeded',
  'permission-denied': 'permissionDenied',
  unauthenticated: 'authExpired',
  'failed-precondition': 'notConfigured',
  aborted: 'contention',
};

/**
 * Classifies a rejected API call so the UI can tell the truth about it.
 *
 * A recognised Firebase code always decides, even when the device is offline:
 * `permission-denied` on a phone with no signal is still undeployed rules, and
 * blaming the connection would hide that for as long as the rules stay unpushed.
 */
export function classifyApiFailure(err: unknown): ApiFailureKind {
  const mapped = KIND_BY_CODE[apiErrorCode(err)];
  if (mapped) return mapped;
  // Not a code we know. A browser that reports itself offline is the better
  // guess than "something went wrong".
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'offline';
  }
  return 'unknown';
}

/** Best-effort error code: FirebaseError `code`, else the error name. */
export function apiErrorCode(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const candidate = err as { code?: unknown; name?: unknown };
    if (typeof candidate.code === 'string' && candidate.code) {
      return candidate.code;
    }
    if (typeof candidate.name === 'string' && candidate.name) {
      return candidate.name;
    }
  }
  return 'unknown';
}

function logApiFailure(operation: string, err: unknown): void {
  console.error(`[api] ${operation} failed`, {
    code: apiErrorCode(err),
    kind: classifyApiFailure(err),
    message: err instanceof Error ? err.message : String(err),
    error: err,
  });
}

/**
 * `catchError` handler that logs the failure, emits a fallback action, and
 * announces the classified cause for the UI to report.
 *
 * The announcement rides along with the fallback action rather than being wired
 * up per call site: that way an API call cannot be added with a failure path
 * that tells the user nothing, and the operation → message mapping stays in one
 * table instead of being spread across every effect.
 *
 * @param operation dot-separated label, e.g. `items.updateItem` — this is what
 *   you grep the console for *and* what picks the user-facing message, so keep
 *   it stable and specific.
 */
export function onApiFailure<A extends Action>(
  operation: string,
  action: (err: unknown) => A,
): (err: unknown) => Observable<A | Action> {
  return (err: unknown) => {
    logApiFailure(operation, err);
    return of(
      action(err),
      uiActions.apiFailureObserved({
        operation,
        kind: classifyApiFailure(err),
      }),
    );
  };
}

/**
 * `catchError` handler for best-effort background writes that have no user-
 * visible failure state. The failure is still logged — an invisible failure
 * that leaves no trace anywhere is the hardest kind to diagnose.
 */
export function ignoreApiFailure(
  operation: string,
): (err: unknown) => Observable<never> {
  return (err: unknown) => {
    logApiFailure(operation, err);
    return EMPTY;
  };
}
