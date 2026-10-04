/**
 * Initialise Angular's TestBed environment once per VM context.
 * Import this at the top of every spec file that uses TestBed.
 *
 * Background: In Vitest's vmThreads/vmForks pools, the Vite plugin for Angular
 * does not guarantee that `setupFiles` share a module instance with the test
 * file itself. Importing this helper directly in the spec file ensures that
 * `initTestEnvironment` is called on the exact same TestBed instance the test
 * will use.
 */
import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

const SETUP_KEY = Symbol.for('angular-testbed-init');

if (!(globalThis as Record<symbol, unknown>)[SETUP_KEY]) {
  (globalThis as Record<symbol, unknown>)[SETUP_KEY] = true;
  getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
    { teardown: { destroyAfterEach: true } },
  );
}
