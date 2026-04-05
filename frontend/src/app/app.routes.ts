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
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'plan',
        loadComponent: () =>
          import('./features/plan/plan.component').then((m) => m.PlanComponent),
      },
      {
        path: 'shop',
        loadComponent: () =>
          import('./features/shop/shop.component').then((m) => m.ShopComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      { path: '', redirectTo: 'plan', pathMatch: 'full' },
    ],
  },
];
