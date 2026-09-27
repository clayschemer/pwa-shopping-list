// Imports the effects module for its message tables, which pulls in Angular's
// DI — the shared testbed init is what makes that importable under Vitest.
import '../../../testing/init-testbed';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  WHAT_BY_OPERATION,
  WHY_BY_KIND,
  whatKeyFor,
} from './ui-feedback.effects';

/**
 * Guard test: every failure the app can classify has something true to say.
 *
 * `WHY_BY_KIND` is typed against `ApiFailureKind`, so the compiler already
 * catches a new kind with no entry. What it cannot catch is an entry pointing at
 * a translation key that does not exist — transloco renders a missing key as the
 * key itself or as nothing, which would put us back where this started: a
 * failure the user cannot interpret. The keys are asserted against `en.json`
 * only; `i18n-parity.spec.ts` is what guarantees the other five locales match.
 */

// Vitest runs with cwd = frontend/
const en = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/assets/i18n/en.json'), 'utf8'),
) as Record<string, unknown>;

function has(key: string): boolean {
  let node: unknown = en;
  for (const segment of key.split('.')) {
    if (node === null || typeof node !== 'object') return false;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === 'string' && node.length > 0;
}

describe('failure message keys', () => {
  it('finds the reference locale', () => {
    expect(has('errors.saveFailed')).toBe(true);
  });

  /** The composed sentence itself — without it there is no message at all. */
  it('has the composition string', () => {
    expect(has('errors.withCause')).toBe(true);
    expect(en['errors']).toMatchObject({
      withCause: expect.stringContaining('{{what}}'),
    });
    expect(en['errors']).toMatchObject({
      withCause: expect.stringContaining('{{why}}'),
    });
  });

  it.each(Object.entries(WHY_BY_KIND))(
    'has a cause message for %s',
    (_kind, key) => {
      expect(has(key), `missing translation key: ${key}`).toBe(true);
    },
  );

  it.each(Object.entries(WHAT_BY_OPERATION))(
    'has an operation message for %s',
    (_operation, key) => {
      expect(has(key), `missing translation key: ${key}`).toBe(true);
    },
  );

  /** Both fallbacks are reachable from any unmapped operation, so both must exist. */
  it('has messages for the unmapped fallbacks', () => {
    expect(whatKeyFor('shops.renameShop')).toBe('errors.saveFailed');
    expect(whatKeyFor('shops.fetchAllShops')).toBe('errors.loadFailed');
    expect(has('errors.saveFailed')).toBe(true);
    expect(has('errors.loadFailed')).toBe(true);
  });

  /** The sync snackbar has no failure action behind it — nothing else would catch this. */
  it('has a message for the auto-add sync in progress', () => {
    expect(has('autoAdd.syncing')).toBe(true);
  });
});
