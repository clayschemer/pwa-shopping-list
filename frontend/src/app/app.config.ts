import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withViewTransitions,
  withPreloading,
  PreloadAllModules,
  ActivatedRouteSnapshot,
} from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth, connectAuthEmulator } from '@angular/fire/auth';
import {
  getFirestore,
  provideFirestore,
  connectFirestoreEmulator,
} from '@angular/fire/firestore';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { accountReducer } from './store/account/account.reducer';
import { AccountEffects } from './store/account/account.effects';
import { uiReducer } from './store/ui/ui.reducer';
import { UiEffects } from './store/ui/ui.effects';
import { UiFeedbackEffects } from './store/ui/ui-feedback.effects';
import { categoriesReducer } from './store/categories/categories.reducer';
import { CategoriesEffects } from './store/categories/categories.effects';
import { categoryGroupsReducer } from './store/category-groups/category-groups.reducer';
import { CategoryGroupsEffects } from './store/category-groups/category-groups.effects';
import { shopsReducer } from './store/shops/shops.reducer';
import { ShopsEffects } from './store/shops/shops.effects';
import { itemsReducer } from './store/items/items.reducer';
import { ItemsEffects } from './store/items/items.effects';
import { sessionsReducer } from './store/sessions/sessions.reducer';
import { SessionsEffects } from './store/sessions/sessions.effects';
import { usersReducer } from './store/users/users.reducer';
import { UsersEffects } from './store/users/users.effects';
import { ReconnectEffects } from './store/reconnect/reconnect.effects';
import { environment } from '../environments/environment';
import { provideAppTransloco } from './core/i18n/transloco-config';

const OVERLAY_PATHS = new Set(['settings', 'manage-shops', 'history']);

function leafPath(snapshot: ActivatedRouteSnapshot): string {
  let node = snapshot;
  while (node.firstChild) node = node.firstChild;
  return node.routeConfig?.path ?? '';
}

function viewTransitionClass(
  from: ActivatedRouteSnapshot,
  to: ActivatedRouteSnapshot,
): string | null {
  const fromPath = leafPath(from);
  const toPath = leafPath(to);
  const fromOverlay = OVERLAY_PATHS.has(fromPath);
  const toOverlay = OVERLAY_PATHS.has(toPath);
  if (toOverlay && !fromOverlay) return 'app-vt-overlay-in';
  if (fromOverlay && !toOverlay) return 'app-vt-overlay-out';
  if (fromPath === '' && toPath === 'shop') return 'app-vt-swap-forward';
  if (fromPath === 'shop' && toPath === '') return 'app-vt-swap-backward';
  return null;
}

const USE_EMULATORS =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1') &&
  (window as unknown as { __SHOP_USE_EMULATORS__?: boolean }).__SHOP_USE_EMULATORS__ === true;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // Pull the remaining route chunks down once the first navigation settles, so
      // switching mode or opening Settings costs no network round-trip.
      withPreloading(PreloadAllModules),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          const cls = viewTransitionClass(from, to);
          if (!cls) {
            transition.skipTransition();
            return;
          }
          const html = document.documentElement;
          html.classList.add(cls);
          transition.finished.finally(() => html.classList.remove(cls));
        },
      }),
    ),
    ...provideAppTransloco(),
    provideStore({
      account: accountReducer,
      ui: uiReducer,
      categories: categoriesReducer,
      categoryGroups: categoryGroupsReducer,
      shops: shopsReducer,
      items: itemsReducer,
      sessions: sessionsReducer,
      users: usersReducer,
    }),
    provideEffects([
      AccountEffects,
      UiEffects,
      UiFeedbackEffects,
      CategoriesEffects,
      CategoryGroupsEffects,
      ShopsEffects,
      ItemsEffects,
      SessionsEffects,
      UsersEffects,
      ReconnectEffects,
    ]),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => {
      const auth = getAuth();
      if (USE_EMULATORS) {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
          disableWarnings: true,
        });
      }
      return auth;
    }),
    provideFirestore(() => {
      const db = getFirestore();
      if (USE_EMULATORS) {
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
      }
      return db;
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
