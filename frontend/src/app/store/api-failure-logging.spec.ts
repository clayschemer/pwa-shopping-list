import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guard test: no effect may swallow an API failure without logging it.
 *
 * Every write effect turns a rejected promise into a failure action so the
 * stream survives, and the user gets one generic snackbar. That leaves the
 * console as the only place the real cause can appear — and on a phone running
 * the deployed PWA it is the only diagnostic channel there is. A bare
 * `catchError(() => …)` throws the error code away, which is how a dead
 * connection, undeployed rules and a missing index all came to look identical.
 *
 * Route failures through `onApiFailure` (emits a fallback action) or
 * `ignoreApiFailure` (best-effort background writes, emits nothing).
 */

// Vitest runs with cwd = frontend/
const storeDir = resolve(process.cwd(), 'src/app/store');

const ALLOWED_HANDLERS = ['onApiFailure(', 'ignoreApiFailure('];

function effectsFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...effectsFiles(path));
    } else if (entry.name.endsWith('.effects.ts')) {
      found.push(path);
    }
  }
  return found;
}

/** Returns the `catchError(` call sites in `source` not using an allowed handler. */
function unloggedCatchSites(source: string): string[] {
  const offenders: string[] = [];
  const needle = 'catchError(';
  let index = source.indexOf(needle);

  while (index !== -1) {
    const rest = source.slice(index + needle.length).trimStart();
    if (!ALLOWED_HANDLERS.some((handler) => rest.startsWith(handler))) {
      const line = source.slice(0, index).split('\n').length;
      offenders.push(`line ${line}: ${rest.split('\n')[0].trim()}`);
    }
    index = source.indexOf(needle, index + needle.length);
  }

  return offenders;
}

describe('API failure logging', () => {
  const files = effectsFiles(storeDir);

  it('finds the effects files to check', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((f) => [f.slice(storeDir.length + 1), f]))(
    '%s routes every swallowed failure through the diagnostics helpers',
    (_name, path) => {
      const offenders = unloggedCatchSites(readFileSync(path, 'utf8'));
      expect(offenders).toEqual([]);
    },
  );
});
