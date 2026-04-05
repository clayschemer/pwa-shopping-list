import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// TODO: implement using auth state from store
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  // Placeholder — redirect to sign-in until auth is implemented
  return router.createUrlTree(['/sign-in']);
};
