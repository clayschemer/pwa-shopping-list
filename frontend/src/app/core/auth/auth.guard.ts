import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs';
import { selectAuthStatus } from '../../store/account/account.selectors';

/**
 * Functional route guard. Waits for auth status to stabilise (past 'checking'/'loading'),
 * then allows or redirects based on the resolved status.
 */
export const authGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectAuthStatus).pipe(
    filter((status) => status !== 'checking' && status !== 'loading'),
    take(1),
    map((status) => {
      if (status === 'authenticated') {
        return true;
      }
      if (status === 'access_denied') {
        return router.createUrlTree(['/access-denied']);
      }
      return router.createUrlTree(['/sign-in']);
    }),
  );
};
