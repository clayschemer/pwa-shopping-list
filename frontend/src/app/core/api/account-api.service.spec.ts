import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { AccountApiService } from './account-api.service';

/**
 * `getRedirectResult` is stubbed with a promise that never settles. The app signs in
 * exclusively via `signInWithPopup`, so nothing on the boot path may wait on it —
 * doing so delays auth resolution, and with it every downstream Firestore read.
 */
const getRedirectResultMock = vi.hoisted(() =>
  vi.fn(() => new Promise<never>(() => {})),
);
const onAuthStateChangedMock = vi.hoisted(() => vi.fn());

vi.mock('@angular/fire/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@angular/fire/auth')>();
  return {
    ...actual,
    getRedirectResult: getRedirectResultMock,
    onAuthStateChanged: onAuthStateChangedMock,
  };
});

const firebaseUser = {
  uid: 'uid-1',
  email: 'shopper@example.com',
  displayName: 'Shopper',
};

const TIMED_OUT = Symbol('timed out');

function withTimeout<T>(promise: Promise<T>, ms = 100): Promise<T | symbol> {
  return Promise.race([
    promise,
    new Promise<symbol>((resolve) => setTimeout(() => resolve(TIMED_OUT), ms)),
  ]);
}

describe('AccountApiService', () => {
  let service: AccountApiService;

  beforeEach(async () => {
    vi.clearAllMocks();
    getRedirectResultMock.mockImplementation(() => new Promise<never>(() => {}));

    await TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: {} },
        { provide: Firestore, useValue: {} },
      ],
    }).compileComponents();
    service = TestBed.inject(AccountApiService);
  });

  describe('getAuthState', () => {
    it('emits the signed-in user without waiting on a redirect result', async () => {
      onAuthStateChangedMock.mockImplementation((_auth, callback) => {
        callback(firebaseUser);
        return () => {};
      });

      const result = await withTimeout(firstValueFrom(service.getAuthState()));

      expect(result).not.toBe(TIMED_OUT);
      expect(result).toEqual({
        id: 'uid-1',
        accountId: '',
        email: 'shopper@example.com',
        displayName: 'Shopper',
      });
    });

    it('emits null without waiting on a redirect result when signed out', async () => {
      onAuthStateChangedMock.mockImplementation((_auth, callback) => {
        callback(null);
        return () => {};
      });

      const result = await withTimeout(firstValueFrom(service.getAuthState()));

      expect(result).toBeNull();
    });

    it('falls back to the email address when the account has no display name', async () => {
      onAuthStateChangedMock.mockImplementation((_auth, callback) => {
        callback({ ...firebaseUser, displayName: null });
        return () => {};
      });

      const result = await withTimeout(firstValueFrom(service.getAuthState()));

      expect(result).toMatchObject({ displayName: 'shopper@example.com' });
    });

    it('unsubscribes from the auth listener when the stream is torn down', async () => {
      const unsubscribe = vi.fn();
      onAuthStateChangedMock.mockImplementation((_auth, callback) => {
        callback(firebaseUser);
        return unsubscribe;
      });

      await withTimeout(firstValueFrom(service.getAuthState()));

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
