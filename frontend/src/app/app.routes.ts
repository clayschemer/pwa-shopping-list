import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'sign-in',
    loadComponent: () =>
      import('./features/auth/sign-in.component').then((m) => m.SignInComponent),
  },
  {
    path: 'access-denied',
    loadComponent: () =>
      import('./features/auth/access-denied.component').then((m) => m.AccessDeniedComponent),
  },
  {
    path: 'pending-verification',
    loadComponent: () =>
      import('./features/auth/pending-verification.component').then(
        (m) => m.PendingVerificationComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/plan/plan.component').then((m) => m.PlanComponent),
      },
      {
        path: 'shop',
        loadComponent: () =>
          import('./features/shop/shop.component').then((m) => m.ShopComponent),
      },
      {
        path: 'stores',
        loadComponent: () =>
          import('./features/manage-shops/manage-shops.component').then((m) => m.ManageShopsComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/categories.component').then((m) => m.CategoriesComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/history/history.component').then((m) => m.HistoryComponent),
      },
    ],
  },
];
