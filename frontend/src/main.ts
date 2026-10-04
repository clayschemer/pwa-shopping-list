import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/** Matches the transition duration on `.app-splash--out` in index.html. */
const SPLASH_FADE_MS = 160;

/**
 * Warm the default route chunk immediately.
 *
 * The router only requests it once `authGuard` resolves — that is, after Firebase auth
 * and every boot Firestore read have completed. Starting the download here lets it
 * overlap that wait instead of queueing behind it.
 */
void import('./app/features/plan/plan.component');

/** Hand off from the static first-frame placeholder to the rendered app. */
function dismissSplash(): void {
  document.querySelector('app-root')?.removeAttribute('aria-busy');

  const splash = document.getElementById('app-splash');
  if (!splash) {
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    splash.remove();
    return;
  }

  splash.addEventListener('transitionend', () => splash.remove(), { once: true });
  splash.classList.add('app-splash--out');
  // Fallback: never leave the overlay covering the app if the transition never fires
  // (backgrounded tab, motion preference flipped mid-session).
  setTimeout(() => splash.remove(), SPLASH_FADE_MS * 4);
}

bootstrapApplication(App, appConfig)
  .then(dismissSplash)
  .catch((err) => {
    dismissSplash();
    console.error(err);
  });
