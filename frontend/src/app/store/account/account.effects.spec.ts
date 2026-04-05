import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';
import { AccountEffects } from './account.effects';
import { authActions, accountActions } from './account.actions';
import { AccountApiService } from '../../core/api/account-api.service';
import type { User } from '../../models/user.model';
import type { Account } from '../../models/account.model';
import type { AccessDeniedError } from '../../models/errors.model';
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

const mockAccessDenied: AccessDeniedError = { type: 'ACCESS_DENIED' };

describe('AccountEffects', () => {
  let actions$: Observable<Action>;
  let effects: AccountEffects;
  let accountApi: { getAuthState: ReturnType<typeof vi.fn>; getAccount: ReturnType<typeof vi.fn>; signIn: ReturnType<typeof vi.fn>; signOut: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    accountApi = {
      getAuthState: vi.fn().mockReturnValue(of(null)),
      getAccount: vi.fn().mockResolvedValue(mockAccount),
      signIn: vi.fn().mockResolvedValue(mockUser),
      signOut: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        AccountEffects,
        provideMockActions(() => actions$),
        provideRouter([]),
        { provide: AccountApiService, useValue: accountApi },
      ],
    });

    effects = TestBed.inject(AccountEffects);
  });

  describe('watchAuthState$', () => {
    it('dispatches authStateResolved when a user is signed in', async () => {
      accountApi.getAuthState.mockReturnValue(of(mockUser));
      const result = await firstValueFrom(effects.watchAuthState$);
      expect(result).toEqual(authActions.authStateResolved({ user: mockUser }));
    });

    it('dispatches authStateEmpty when no user is signed in', async () => {
      accountApi.getAuthState.mockReturnValue(of(null));
      const result = await firstValueFrom(effects.watchAuthState$);
      expect(result).toEqual(authActions.authStateEmpty());
    });
  });

  describe('loadAccount$', () => {
    it('dispatches accountLoaded when getAccount succeeds', async () => {
      accountApi.getAccount.mockResolvedValue(mockAccount);
      actions$ = of(authActions.authStateResolved({ user: mockUser }));
      const result = await firstValueFrom(effects.loadAccount$);
      expect(result).toEqual(accountActions.accountLoaded({ account: mockAccount }));
    });

    it('dispatches accessDenied when getAccount returns ACCESS_DENIED', async () => {
      accountApi.getAccount.mockResolvedValue(mockAccessDenied);
      actions$ = of(authActions.authStateResolved({ user: mockUser }));
      const result = await firstValueFrom(effects.loadAccount$);
      expect(result).toEqual(accountActions.accessDenied());
    });
  });

  describe('signOut$', () => {
    it('dispatches signedOut after signOut resolves', async () => {
      accountApi.signOut.mockResolvedValue(undefined);
      actions$ = of(authActions.signOutRequested());
      const result = await firstValueFrom(effects.signOut$);
      expect(result).toEqual(authActions.signedOut());
    });
  });
});
