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
import {
  Firestore,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
import { Observable, from, switchMap } from 'rxjs';
import type { User } from '../../models/user.model';
import type { Account } from '../../models/account.model';
import type {
  AccessDeniedError,
  AuthError,
  PendingVerificationError,
} from '../../models/errors.model';
import type { AccountId, ShopId, UserId } from '../../models/ids.model';
import { AccountContext } from './account-context';
import { paths } from './firestore-paths';

/**
 * Account API service — the ONLY place that touches Firebase for auth and account operations.
 */
@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);
  private readonly context = inject(AccountContext);

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
              this.context.clear();
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

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    try {
      await runInInjectionContext(this.injector, () =>
        signInWithPopup(this.auth, provider),
      );
    } catch {
      // signInWithPopup may throw a COOP warning even when auth succeeds.
    }
  }

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
    this.context.clear();
    await firebaseSignOut(this.auth);
  }

  /**
   * Resolve the account for the current user via the /users/{uid} allowlist.
   *
   * Branches:
   *  - No Firebase user           → ACCESS_DENIED
   *  - No /users/{uid} doc        → self-register with verified:false, return PENDING_VERIFICATION
   *  - doc with verified === false → PENDING_VERIFICATION
   *  - doc verified (true or absent for legacy) + accountId resolvable → Account
   *  - doc verified but accountId missing/unresolvable → PENDING_VERIFICATION
   *    (admin flipped the flag but hasn't set accountId yet)
   */
  async getAccount(): Promise<
    | { account: Account; selectedShopId: ShopId | null }
    | AccessDeniedError
    | PendingVerificationError
  > {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) {
      return { type: 'ACCESS_DENIED' };
    }

    return runInInjectionContext(this.injector, async () => {
      try {
        const userRef = paths.userAllowlistDoc(this.firestore, firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            verified: false,
            email: firebaseUser.email ?? '',
            displayName: firebaseUser.displayName ?? firebaseUser.email ?? '',
            createdAt: serverTimestamp(),
          });
          return { type: 'PENDING_VERIFICATION' } satisfies PendingVerificationError;
        }

        const userData = userSnap.data();
        const verified = userData['verified'];
        // Legacy docs without the field are treated as verified.
        if (verified === false) {
          return { type: 'PENDING_VERIFICATION' } satisfies PendingVerificationError;
        }

        const accountId = userData['accountId'] as AccountId | undefined;
        if (!accountId) {
          return { type: 'PENDING_VERIFICATION' } satisfies PendingVerificationError;
        }

        const accountRef = doc(this.firestore, 'accounts', accountId);
        const accountSnap = await getDoc(accountRef);

        if (!accountSnap.exists()) {
          return { type: 'PENDING_VERIFICATION' } satisfies PendingVerificationError;
        }

        this.context.set(accountId, firebaseUser.uid as UserId);

        // Mirror this user into the account roster for display resolution.
        // Tolerated best-effort — failure here should not block sign-in.
        let selectedShopId: ShopId | null = null;
        try {
          const memberRef = paths.memberDoc(this.firestore, accountId, firebaseUser.uid);
          await setDoc(
            memberRef,
            {
              email: firebaseUser.email ?? '',
              displayName: firebaseUser.displayName ?? firebaseUser.email ?? '',
            },
            { merge: true },
          );
          const memberSnap = await getDoc(memberRef);
          selectedShopId = (memberSnap.data()?.['selectedShopId'] ?? null) as ShopId | null;
        } catch {
          // ignore — roster population is a nice-to-have
        }

        const accountData = accountSnap.data();
        return {
          account: {
            id: accountId,
            name: accountData['name'] ?? '',
            aiConfig: accountData['aiConfig'] ?? null,
          },
          selectedShopId,
        };
      } catch {
        return { type: 'ACCESS_DENIED' };
      }
    });
  }
}
