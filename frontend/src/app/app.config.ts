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
import { uiReducer } from './store/ui/ui.reducer';
import { categoriesReducer } from './store/categories/categories.reducer';
import { CategoriesEffects } from './store/categories/categories.effects';
import { shopsReducer } from './store/shops/shops.reducer';
import { ShopsEffects } from './store/shops/shops.effects';
import { itemsReducer } from './store/items/items.reducer';
import { ItemsEffects } from './store/items/items.effects';
import { environment } from '../environments/environment';
import { provideAppTransloco } from './core/i18n/transloco-config';

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
    }),
    provideEffects([AccountEffects, CategoriesEffects, ShopsEffects, ItemsEffects]),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
  ],
};
