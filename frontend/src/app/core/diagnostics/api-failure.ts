import { EMPTY, Observable, of } from 'rxjs';

/**
 * Diagnostics for swallowed API failures.
 *
 * Every write effect converts a rejected API promise into a failure action so
 * the effect stream survives, and the user sees one generic snackbar. That is
 * right for the UI and useless for debugging: `unavailable` (dead connection),
 * `permission-denied` (rules not deployed) and `failed-precondition` (missing
 * index) all render as "check your connection". These helpers keep the failure
 * action behaviour intact and additionally put the operation and the error code
 * on the console, which is the only diagnostic channel available on a phone
 * running the deployed PWA.
 *
 * Logging is deliberately NOT gated on dev mode — production is exactly where
 * these failures happen, and the volume is one line per failed write.
 */

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
    message: err instanceof Error ? err.message : String(err),
    error: err,
  });
}

/**
 * `catchError` handler that logs the failure and emits a fallback action.
 *
 * @param operation dot-separated label, e.g. `items.updateItem` — this is what
 *   you grep the console for, so keep it stable and specific.
 */
export function onApiFailure<A>(
  operation: string,
  action: (err: unknown) => A,
): (err: unknown) => Observable<A> {
  return (err: unknown) => {
    logApiFailure(operation, err);
    return of(action(err));
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
