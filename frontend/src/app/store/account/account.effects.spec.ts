import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, Subject } from 'rxjs';
import { AccountEffects } from './account.effects';
import { authActions, accountActions, accountApiActions } from './account.actions';
import { AccountApiService } from '../../core/api/account-api.service';
import type { Account } from '../../models/account.model';
import type {
  AccessDeniedError,
  PendingVerificationError,
} from '../../models/errors.model';
import type { AccountId, UserId } from '../../models/ids.model';
import type { User } from '../../models/user.model';

const mockUser: User = {
  id: 'u1' as UserId,
  accountId: '' as AccountId,
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockAccount: Account = {
  id: 'a1' as AccountId,
  name: 'Test Account',
  aiConfig: null,
  autoAddEnabled: false,
  autoAddLastRunAt: null,
};

describe('AccountEffects', () => {
  let effects: AccountEffects;
  let actions$: Subject<unknown>;
  let accountApi: {
    getAuthState: ReturnType<typeof vi.fn>;
    getAccount: ReturnType<typeof vi.fn>;
    signInWithGoogle: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    setAutoAddEnabled: ReturnType<typeof vi.fn>;
  };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    actions$ = new Subject();
    accountApi = {
      getAuthState: vi.fn(),
      getAccount: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      setAutoAddEnabled: vi.fn(),
    };
    router = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AccountEffects,
        provideMockActions(() => actions$),
        { provide: AccountApiService, useValue: accountApi },
        { provide: Router, useValue: router },
      ],
    });

    effects = TestBed.inject(AccountEffects);
  });

  describe('loadAccount$', () => {
    it('dispatches accountLoaded when getAccount returns an account', () => {
      accountApi.getAccount.mockResolvedValue({ account: mockAccount, selectedShopId: null });

      const results: unknown[] = [];
      effects.loadAccount$.subscribe((action) => results.push(action));

      actions$.next(authActions.authStateResolved({ user: mockUser }));

      // Flush the microtask queue
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(accountApi.getAccount).toHaveBeenCalled();
          expect(results).toEqual([
            accountActions.accountLoaded({ account: mockAccount, selectedShopId: null }),
          ]);
          resolve();
        });
      });
    });

    it('dispatches accessDenied when getAccount returns ACCESS_DENIED', () => {
      const denied: AccessDeniedError = { type: 'ACCESS_DENIED' };
      accountApi.getAccount.mockResolvedValue(denied);

      const results: unknown[] = [];
      effects.loadAccount$.subscribe((action) => results.push(action));

      actions$.next(authActions.authStateResolved({ user: mockUser }));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(results).toEqual([accountActions.accessDenied()]);
          resolve();
        });
      });
    });

    it('dispatches pendingVerification when getAccount returns PENDING_VERIFICATION', () => {
      const pending: PendingVerificationError = { type: 'PENDING_VERIFICATION' };
      accountApi.getAccount.mockResolvedValue(pending);

      const results: unknown[] = [];
      effects.loadAccount$.subscribe((action) => results.push(action));

      actions$.next(authActions.authStateResolved({ user: mockUser }));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(results).toEqual([accountActions.pendingVerification()]);
          resolve();
        });
      });
    });

    it('dispatches accessDenied when getAccount throws', () => {
      accountApi.getAccount.mockRejectedValue(new Error('Firestore error'));

      const results: unknown[] = [];
      effects.loadAccount$.subscribe((action) => results.push(action));

      actions$.next(authActions.authStateResolved({ user: mockUser }));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(results).toEqual([accountActions.accessDenied()]);
          resolve();
        });
      });
    });
  });

  describe('watchAuthState$', () => {
    it('dispatches authStateResolved when auth state emits a user', () => {
      const authState$ = new Subject<User | null>();
      accountApi.getAuthState.mockReturnValue(authState$);

      const results: unknown[] = [];
      effects.watchAuthState$.subscribe((action) => results.push(action));

      authState$.next(mockUser);

      expect(results).toEqual([
        authActions.authStateResolved({ user: mockUser }),
      ]);
    });

    it('dispatches authStateEmpty when auth state emits null', () => {
      const authState$ = new Subject<User | null>();
      accountApi.getAuthState.mockReturnValue(authState$);

      const results: unknown[] = [];
      effects.watchAuthState$.subscribe((action) => results.push(action));

      authState$.next(null);

      expect(results).toEqual([authActions.authStateEmpty()]);
    });

    it('re-emits when auth state changes from null to user (post-login)', () => {
      const authState$ = new Subject<User | null>();
      accountApi.getAuthState.mockReturnValue(authState$);

      const results: unknown[] = [];
      effects.watchAuthState$.subscribe((action) => results.push(action));

      authState$.next(null);
      authState$.next(mockUser);

      expect(results).toEqual([
        authActions.authStateEmpty(),
        authActions.authStateResolved({ user: mockUser }),
      ]);
    });
  });

  describe('navigateOnSignOut$', () => {
    it('navigates to /sign-in when signedOut is dispatched', () => {
      effects.navigateOnSignOut$.subscribe();

      actions$.next(authActions.signedOut());

      expect(router.navigateByUrl).toHaveBeenCalledWith('/sign-in');
    });
  });

  describe('navigateOnAuthLost$', () => {
    it('navigates to /sign-in when auth state becomes empty', () => {
      effects.navigateOnAuthLost$.subscribe();

      actions$.next(authActions.authStateEmpty());

      expect(router.navigateByUrl).toHaveBeenCalledWith('/sign-in');
    });

    it('navigates to /sign-in when stream auth is revoked', () => {
      effects.navigateOnAuthLost$.subscribe();

      actions$.next(accountActions.streamAuthRevoked());

      expect(router.navigateByUrl).toHaveBeenCalledWith('/sign-in');
    });
  });

  describe('setAutoAddEnabled$', () => {
    it('confirms the change once the write lands', async () => {
      accountApi.setAutoAddEnabled.mockResolvedValue(undefined);
      const dispatched: unknown[] = [];
      effects.setAutoAddEnabled$.subscribe((a) => dispatched.push(a));

      actions$.next(accountApiActions.setAutoAddEnabledRequested({ enabled: true }));
      await Promise.resolve();

      expect(accountApi.setAutoAddEnabled).toHaveBeenCalledWith(true);
      expect(dispatched).toEqual([accountActions.autoAddEnabledChanged({ enabled: true })]);
    });

    /**
     * Mandatory failure-path cover: the effect has to survive a rejection and
     * surface it, so the optimistic reducer state gets reverted rather than
     * leaving a setting displayed that was never stored.
     */
    it('reports failure and stays alive when the write is rejected', async () => {
      accountApi.setAutoAddEnabled.mockRejectedValue(new Error('permission denied'));
      const dispatched: unknown[] = [];
      effects.setAutoAddEnabled$.subscribe((a) => dispatched.push(a));

      actions$.next(accountApiActions.setAutoAddEnabledRequested({ enabled: true }));
      await Promise.resolve();
      await Promise.resolve();

      expect(dispatched).toEqual([accountActions.autoAddEnableFailed({ enabled: true })]);

      // Still processing actions after the failure.
      accountApi.setAutoAddEnabled.mockResolvedValue(undefined);
      actions$.next(accountApiActions.setAutoAddEnabledRequested({ enabled: false }));
      await Promise.resolve();

      expect(dispatched).toHaveLength(2);
    });
  });
});
