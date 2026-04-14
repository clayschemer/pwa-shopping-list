import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import {
  Auth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Observable, from, switchMap } from 'rxjs';
import type { User } from '../../models/user.model';
import type { Account } from '../../models/account.model';
import type { AccessDeniedError, AuthError } from '../../models/errors.model';
import type { AccountId, UserId } from '../../models/ids.model';

/**
 * Account API service — the ONLY place that touches Firebase for auth and account operations.
 *
 * Implements:
 * - getAuthState() — observable auth state, awaiting any pending redirect result first
 * - signInWithGoogle() — Google OAuth via redirect
 * - signInWithEmail() — email/password for pre-created users
 * - signOut()
 * - getAccount() — resolves account from Firestore after auth
 */
@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);

  /**
   * Observe auth state. Awaits any pending redirect result before subscribing
   * to authState to avoid the race condition where authState emits null before
   * the redirect completes.
   */
  getAuthState(): Observable<User | null> {
    const redirectDone$ = from(
      runInInjectionContext(this.injector, () =>
        getRedirectResult(this.auth).catch(() => null),
      ),
    );

    return redirectDone$.pipe(
      switchMap(() =>
        new Observable<User | null>((subscriber) => {
          const unsubscribe = onAuthStateChanged(this.auth, (firebaseUser) => {
            if (!firebaseUser) {
              subscriber.next(null);
            } else {
              subscriber.next({
                id: firebaseUser.uid as UserId,
                accountId: '' as AccountId,
                email: firebaseUser.email ?? '',
                displayName: firebaseUser.displayName ?? firebaseUser.email ?? '',
              });
            }
          });
          return unsubscribe;
        }),
      ),
    );
  }

  /**
   * Initiate Google OAuth sign-in via popup.
   * The COOP warning from Chrome is non-fatal — auth completes successfully
   * and authState() picks up the user. We catch and ignore it here.
   */
  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    try {
      await runInInjectionContext(this.injector, () =>
        signInWithPopup(this.auth, provider),
      );
    } catch {
      // signInWithPopup may throw a COOP warning even when auth succeeds.
      // The authState observable will emit the authenticated user regardless.
    }
  }

  /**
   * Sign in with pre-created email/password credentials.
   * Returns void on success, AuthError on failure.
   */
  async signInWithEmail(email: string, password: string): Promise<void | AuthError> {
    try {
      await runInInjectionContext(this.injector, () =>
        signInWithEmailAndPassword(this.auth, email, password),
      );
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? 'auth/unknown';
      return { type: 'AUTH_FAILED', code };
    }
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }

  /**
   * Fetch the account for the current user.
   * Reads /users/{uid} → accountId → /accounts/{accountId}.
   * Returns AccessDeniedError if user is not on the allowlist.
   */
  async getAccount(): Promise<Account | AccessDeniedError> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) {
      return { type: 'ACCESS_DENIED' };
    }

    try {
      const userRef = doc(this.firestore, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return { type: 'ACCESS_DENIED' } satisfies AccessDeniedError;
      }

      const userData = userSnap.data();
      const accountId = userData['accountId'] as AccountId;

      const accountRef = doc(this.firestore, 'accounts', accountId);
      const accountSnap = await getDoc(accountRef);

      if (!accountSnap.exists()) {
        return { type: 'ACCESS_DENIED' } satisfies AccessDeniedError;
      }

      const accountData = accountSnap.data();
      return {
        id: accountId,
        name: accountData['name'] ?? '',
        aiConfig: accountData['aiConfig'] ?? null,
      };
    } catch {
      return { type: 'ACCESS_DENIED' };
    }
  }
}
