import { inject, Injectable } from '@angular/core';
import { Auth, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, authState } from '@angular/fire/auth';
import { Firestore, doc, getDoc, collection, getDocs } from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import type { User } from '../../models/user.model';
import type { Account } from '../../models/account.model';
import type { AccessDeniedError } from '../../models/errors.model';
import type { AccountId, UserId } from '../../models/ids.model';

/**
 * Account API service — implements the account operations from API-CONTRACT.md §5.1–5.3.
 * This is the ONLY place that touches Firebase for account-related operations.
 */
@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  getAuthState(): Observable<User | null> {
    return authState(this.auth).pipe(
      map((firebaseUser) => {
        if (!firebaseUser) return null;
        // accountId is stored as a custom claim or resolved after auth state
        // For the auth state observable, we emit a partial User that gets fully populated
        // once getAccount() resolves. The store handles the two-step boot sequence.
        return {
          id: firebaseUser.uid as UserId,
          accountId: '' as AccountId, // resolved by getAccount
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? firebaseUser.email ?? '',
        };
      }),
    );
  }

  async signIn(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(this.auth, provider);
    const firebaseUser = credential.user;
    return {
      id: firebaseUser.uid as UserId,
      accountId: '' as AccountId, // resolved by getAccount
      email: firebaseUser.email ?? '',
      displayName: firebaseUser.displayName ?? firebaseUser.email ?? '',
    };
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth);
  }

  async getAccount(): Promise<Account | AccessDeniedError> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) return { type: 'ACCESS_DENIED' };

    // Look up the user document in Firestore to get their accountId
    const userRef = doc(this.firestore, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return { type: 'ACCESS_DENIED' };

    const userData = userSnap.data();
    const accountId = userData['accountId'] as AccountId;

    const accountRef = doc(this.firestore, 'accounts', accountId);
    const accountSnap = await getDoc(accountRef);

    if (!accountSnap.exists()) return { type: 'ACCESS_DENIED' };

    const accountData = accountSnap.data();
    return {
      id: accountId,
      name: accountData['name'] ?? '',
      aiConfig: accountData['aiConfig'] ?? null,
    };
  }

  async fetchAccountUsers(): Promise<User[]> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) return [];

    const userRef = doc(this.firestore, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return [];

    const accountId = userSnap.data()['accountId'] as AccountId;
    const usersRef = collection(this.firestore, 'accounts', accountId, 'users');
    const usersSnap = await getDocs(usersRef);

    return usersSnap.docs.map((d) => ({
      id: d.id as UserId,
      accountId,
      email: d.data()['email'] ?? '',
      displayName: d.data()['displayName'] ?? '',
    }));
  }
}
