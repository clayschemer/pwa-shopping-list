import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { firstValueFrom, lastValueFrom, of, throwError, toArray } from 'rxjs';
import { catchError, defaultIfEmpty } from 'rxjs/operators';
import { apiErrorCode, classifyApiFailure, ignoreApiFailure, onApiFailure } from './api-failure';
import { uiActions } from '../../store/ui/ui.actions';

const NOTHING_EMITTED = Symbol('nothing emitted');

function firebaseError(code: string, message = 'boom'): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.name = 'FirebaseError';
  err.code = code;
  return err;
}

describe('apiErrorCode', () => {
  it('reads the code off a FirebaseError', () => {
    expect(apiErrorCode(firebaseError('permission-denied'))).toBe('permission-denied');
  });

  it('falls back to the error name when there is no code', () => {
    expect(apiErrorCode(new TypeError('nope'))).toBe('TypeError');
  });

  it('reports a code for values that are not errors at all', () => {
    expect(apiErrorCode('just a string')).toBe('unknown');
    expect(apiErrorCode(undefined)).toBe('unknown');
  });
});

/**
 * The whole point of classification: "check your connection" was shown for
 * every one of these, and it sent the user hunting a network problem that did
 * not exist. A message that names the wrong cause is worse than no message.
 */
describe('classifyApiFailure', () => {
  it.each([
    ['unavailable', 'offline'],
    ['deadline-exceeded', 'offline'],
    ['resource-exhausted', 'quotaExceeded'],
    ['permission-denied', 'permissionDenied'],
    ['unauthenticated', 'authExpired'],
    ['failed-precondition', 'notConfigured'],
    ['aborted', 'contention'],
    ['internal', 'unknown'],
  ])('maps %s to %s', (code, kind) => {
    expect(classifyApiFailure(firebaseError(code))).toBe(kind);
  });

  it('treats an unrecognised failure as offline when the device is offline', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      expect(classifyApiFailure(new TypeError('Failed to fetch'))).toBe('offline');
    } finally {
      onLine.mockRestore();
    }
  });

  /**
   * A recognised code always wins. `permission-denied` while the device happens
   * to be offline is still undeployed rules, and blaming the connection would
   * hide the real cause for as long as the rules stay unpushed.
   */
  it('keeps a recognised code even when the device is offline', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      expect(classifyApiFailure(firebaseError('permission-denied'))).toBe('permissionDenied');
    } finally {
      onLine.mockRestore();
    }
  });
});

describe('onApiFailure', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('emits the fallback action so the effect survives', async () => {
    const action = { type: '[Items] Item Save Failed' };

    const result = await firstValueFrom(
      throwError(() => firebaseError('unavailable')).pipe(
        catchError(onApiFailure('items.updateItem', () => action)),
      ),
    );

    expect(result).toBe(action);
  });

  /**
   * Write failures are swallowed into a generic "check your connection"
   * snackbar. Without the code in the console there is no way to tell a dead
   * connection from permission-denied (undeployed rules) or failed-precondition
   * (missing index) after the fact — every one of those looks identical to the
   * user, and they are the failures that have actually bitten this app.
   */
  it('logs the operation and the error code', async () => {
    await firstValueFrom(
      throwError(() => firebaseError('permission-denied', 'Missing rules')).pipe(
        catchError(onApiFailure('items.updateItem', () => ({ type: 'noop' }))),
      ),
    );

    expect(consoleError).toHaveBeenCalledOnce();
    const [message, detail] = consoleError.mock.calls[0];
    expect(message).toContain('items.updateItem');
    expect(detail).toMatchObject({
      code: 'permission-denied',
      message: 'Missing rules',
    });
  });

  /**
   * The announcement rides along with every fallback action rather than being
   * wired up per call site, so a new API call cannot be added with a failure
   * path that says nothing — or says the wrong thing — to the user.
   */
  it('announces the classified cause alongside the fallback action', async () => {
    const action = { type: '[Items] Item Check Failed' };

    const emitted = await firstValueFrom(
      throwError(() => firebaseError('resource-exhausted')).pipe(
        catchError(onApiFailure('items.checkItem', () => action)),
        toArray(),
      ),
    );

    expect(emitted).toEqual([
      action,
      uiActions.apiFailureObserved({
        operation: 'items.checkItem',
        kind: 'quotaExceeded',
      }),
    ]);
  });

  it('does not log when nothing fails', async () => {
    await firstValueFrom(
      of({ type: 'ok' }).pipe(
        catchError(onApiFailure('items.updateItem', () => ({ type: 'noop' }))),
      ),
    );

    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('ignoreApiFailure', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('logs the failure but emits nothing', async () => {
    const result = await lastValueFrom(
      throwError(() => firebaseError('unavailable')).pipe(
        catchError(ignoreApiFailure('items.enqueuePriceLookup')),
        defaultIfEmpty(NOTHING_EMITTED),
      ),
    );

    expect(result).toBe(NOTHING_EMITTED);
    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError.mock.calls[0][0]).toContain('items.enqueuePriceLookup');
  });
});
