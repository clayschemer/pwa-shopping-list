import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { routes } from './app.routes';
import { accountReducer } from './store/account/account.reducer';
import { AccountEffects } from './store/account/account.effects';
import { categoriesReducer } from './store/categories/categories.reducer';
import { CategoriesEffects } from './store/categories/categories.effects';
import { shopsReducer } from './store/shops/shops.reducer';
import { ShopsEffects } from './store/shops/shops.effects';
import { itemsReducer } from './store/items/items.reducer';
import { ItemsEffects } from './store/items/items.effects';
import { sessionsReducer } from './store/sessions/sessions.reducer';
import { SessionsEffects } from './store/sessions/sessions.effects';
import { uiReducer } from './store/ui/ui.reducer';
import { UiEffects } from './store/ui/ui.effects';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideStore({
      account: accountReducer,
      categories: categoriesReducer,
      shops: shopsReducer,
      items: itemsReducer,
      sessions: sessionsReducer,
      ui: uiReducer,
    }),
    provideEffects([AccountEffects, CategoriesEffects, ShopsEffects, ItemsEffects, SessionsEffects, UiEffects]),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
  ],
};
