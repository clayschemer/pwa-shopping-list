import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { firstValueFrom, lastValueFrom, of, throwError } from 'rxjs';
import { catchError, defaultIfEmpty } from 'rxjs/operators';
import { apiErrorCode, ignoreApiFailure, onApiFailure } from './api-failure';

const NOTHING_EMITTED = Symbol('nothing emitted');

function firebaseError(code: string, message = 'boom'): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.name = 'FirebaseError';
  err.code = code;
  return err;
}

describe('apiErrorCode', () => {
  it('reads the code off a FirebaseError', () => {
    expect(apiErrorCode(firebaseError('permission-denied'))).toBe(
      'permission-denied',
    );
  });

  it('falls back to the error name when there is no code', () => {
    expect(apiErrorCode(new TypeError('nope'))).toBe('TypeError');
  });

  it('reports a code for values that are not errors at all', () => {
    expect(apiErrorCode('just a string')).toBe('unknown');
    expect(apiErrorCode(undefined)).toBe('unknown');
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
    expect(consoleError.mock.calls[0][0]).toContain(
      'items.enqueuePriceLookup',
    );
  });
});
