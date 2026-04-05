import '../../../testing/init-testbed';
import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { authGuard } from './auth.guard';
import { accountReducer } from '../../store/account/account.reducer';
import { authActions, accountActions } from '../../store/account/account.actions';
import { Store } from '@ngrx/store';
import type { User } from '../../models/user.model';
import type { Account } from '../../models/account.model';
import type { UserId, AccountId } from '../../models/ids.model';

const mockUser: User = {
  id: 'uid-1' as UserId,
  accountId: 'acc-1' as AccountId,
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockAccount: Account = {
  id: 'acc-1' as AccountId,
  name: 'Test Account',
  aiConfig: null,
};

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideStore({ account: accountReducer }),
      provideRouter([]),
    ],
  });

  return {
    store: TestBed.inject(Store),
    router: TestBed.inject(Router),
    runGuard: () =>
      TestBed.runInInjectionContext(() =>
        firstValueFrom(authGuard({} as never, {} as never) as ReturnType<typeof authGuard>)
      ),
  };
}

describe('authGuard', () => {
  it('allows navigation when user is authenticated', async () => {
    const { store, runGuard } = setup();
    store.dispatch(authActions.authStateResolved({ user: mockUser }));
    store.dispatch(accountActions.accountLoaded({ account: mockAccount }));
    const result = await runGuard();
    expect(result).toBe(true);
  });

  it('redirects to /sign-in when user is unauthenticated', async () => {
    const { store, router, runGuard } = setup();
    store.dispatch(authActions.authStateEmpty());
    const result = await runGuard();
    expect(result).toEqual(router.createUrlTree(['/sign-in']));
  });

  it('redirects to /access-denied when user is not permitted', async () => {
    const { store, router, runGuard } = setup();
    store.dispatch(authActions.authStateResolved({ user: mockUser }));
    store.dispatch(accountActions.accessDenied());
    const result = await runGuard();
    expect(result).toEqual(router.createUrlTree(['/access-denied']));
  });
});
