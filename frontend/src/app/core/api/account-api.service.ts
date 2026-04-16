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
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Observable, from, switchMap } from 'rxjs';
import type { User } from '../../models/user.model';
import type { Account } from '../../models/account.model';
import type { AccessDeniedError, AuthError } from '../../models/errors.model';
import type { AccountId, UserId } from '../../models/ids.model';
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
   * Populates AccountContext on success. Mirrors the authenticated user into
   * the account's member roster so displayName/email are visible to the other
   * participant.
   */
  async getAccount(): Promise<Account | AccessDeniedError> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) {
      return { type: 'ACCESS_DENIED' };
    }

    return runInInjectionContext(this.injector, async () => {
      try {
        const userRef = paths.userAllowlistDoc(this.firestore, firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          return { type: 'ACCESS_DENIED' } satisfies AccessDeniedError;
        }

        const accountId = userSnap.data()['accountId'] as AccountId;
        const accountRef = doc(this.firestore, 'accounts', accountId);
        const accountSnap = await getDoc(accountRef);

        if (!accountSnap.exists()) {
          return { type: 'ACCESS_DENIED' } satisfies AccessDeniedError;
        }

        this.context.set(accountId, firebaseUser.uid as UserId);

        // Mirror this user into the account roster for display resolution.
        // Tolerated best-effort — failure here should not block sign-in.
        try {
          await setDoc(
            paths.memberDoc(this.firestore, accountId, firebaseUser.uid),
            {
              email: firebaseUser.email ?? '',
              displayName: firebaseUser.displayName ?? firebaseUser.email ?? '',
            },
            { merge: true },
          );
        } catch {
          // ignore — roster population is a nice-to-have
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
    });
  }
}
