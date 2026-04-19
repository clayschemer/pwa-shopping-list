import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
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
import { categoriesReducer } from './store/categories/categories.reducer';
import { CategoriesEffects } from './store/categories/categories.effects';
import { shopsReducer } from './store/shops/shops.reducer';
import { ShopsEffects } from './store/shops/shops.effects';
import { itemsReducer } from './store/items/items.reducer';
import { ItemsEffects } from './store/items/items.effects';
import { sessionsReducer } from './store/sessions/sessions.reducer';
import { SessionsEffects } from './store/sessions/sessions.effects';
import { usersReducer } from './store/users/users.reducer';
import { UsersEffects } from './store/users/users.effects';
import { environment } from '../environments/environment';
import { provideAppTransloco } from './core/i18n/transloco-config';

const USE_EMULATORS =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1') &&
  (window as unknown as { __SHOP_USE_EMULATORS__?: boolean }).__SHOP_USE_EMULATORS__ === true;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    ...provideAppTransloco(),
    provideStore({
      account: accountReducer,
      ui: uiReducer,
      categories: categoriesReducer,
      shops: shopsReducer,
      items: itemsReducer,
      sessions: sessionsReducer,
      users: usersReducer,
    }),
    provideEffects([
      AccountEffects,
      UiEffects,
      CategoriesEffects,
      ShopsEffects,
      ItemsEffects,
      SessionsEffects,
      UsersEffects,
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
