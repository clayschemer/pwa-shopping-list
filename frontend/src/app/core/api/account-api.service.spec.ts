import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { AccountApiService } from './account-api.service';
import { AccountContext } from './account-context';
import type { AccountId, UserId } from '../../models/ids.model';

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

const updateDocMock = vi.hoisted(() => vi.fn());
const runTransactionMock = vi.hoisted(() => vi.fn());

vi.mock('@angular/fire/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@angular/fire/firestore')>();
  return {
    ...actual,
    doc: vi.fn((_db: unknown, ...segments: string[]) => ({
      id: segments[segments.length - 1],
      path: segments.join('/'),
    })),
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    updateDoc: updateDocMock,
    runTransaction: runTransactionMock,
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

  describe('setAutoAddEnabled', () => {
    beforeEach(() => {
      TestBed.inject(AccountContext).set('acc-1' as AccountId, 'uid-1' as UserId);
      updateDocMock.mockResolvedValue(undefined);
    });

    it('writes the shared toggle to the account document', async () => {
      await service.setAutoAddEnabled(true);

      expect(updateDocMock).toHaveBeenCalledOnce();
      const [ref, payload] = updateDocMock.mock.calls[0];
      expect(ref.path).toBe('accounts/acc-1');
      expect(payload).toEqual({ autoAddEnabled: true });
    });

    it('writes the disabled state too', async () => {
      await service.setAutoAddEnabled(false);

      const [, payload] = updateDocMock.mock.calls[0];
      expect(payload).toEqual({ autoAddEnabled: false });
    });
  });

  describe('claimAutoAddRun', () => {
    function stubTransaction(accountData: Record<string, unknown> | undefined) {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => accountData !== undefined,
          data: () => accountData,
        }),
        update: vi.fn(),
      };
      runTransactionMock.mockImplementation(
        async (_db: unknown, cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
      );
      return tx;
    }

    beforeEach(() => {
      TestBed.inject(AccountContext).set('acc-1' as AccountId, 'uid-1' as UserId);
    });

    it('claims the run and stamps the account when none has happened', async () => {
      const tx = stubTransaction({ autoAddLastRunAt: null });

      await expect(service.claimAutoAddRun()).resolves.toBe(true);
      expect(tx.update).toHaveBeenCalledWith(expect.anything(), {
        autoAddLastRunAt: 'SERVER_TIMESTAMP',
      });
    });

    it('claims the run when the last one was longer ago than the gap', async () => {
      const tx = stubTransaction({
        autoAddLastRunAt: Date.now() - 21 * 60 * 60 * 1000,
      });

      await expect(service.claimAutoAddRun(20)).resolves.toBe(true);
      expect(tx.update).toHaveBeenCalled();
    });

    /**
     * The read-budget guard: both users' clients boot independently, and the
     * loser has to bail out having spent one read rather than the couple of
     * hundred a full evaluation costs.
     */
    it('refuses the run and writes nothing when one already happened inside the gap', async () => {
      const tx = stubTransaction({
        autoAddLastRunAt: Date.now() - 2 * 60 * 60 * 1000,
      });

      await expect(service.claimAutoAddRun(20)).resolves.toBe(false);
      expect(tx.update).not.toHaveBeenCalled();
    });

    it('refuses the run when the account document is missing', async () => {
      stubTransaction(undefined);

      await expect(service.claimAutoAddRun()).resolves.toBe(false);
    });

    /**
     * A transaction needs a live server round-trip, so it rejects when offline.
     * Skipping is the safe direction — the cost is auto-add waiting for the next
     * app open, whereas treating a failure as a win risks two clients both
     * running the evaluation.
     */
    it('refuses the run rather than throwing when the transaction fails', async () => {
      runTransactionMock.mockRejectedValue(new Error('offline'));

      await expect(service.claimAutoAddRun()).resolves.toBe(false);
    });
  });

  describe('recordAutoAddRunTimings', () => {
    beforeEach(() => {
      TestBed.inject(AccountContext).set('acc-1' as AccountId, 'uid-1' as UserId);
      updateDocMock.mockResolvedValue(undefined);
    });

    it('persists rounded timings so runs can be compared across devices', async () => {
      await service.recordAutoAddRunTimings({ totalMs: 812.47, computeMs: 3.61 });

      const [, payload] = updateDocMock.mock.calls[0];
      expect(payload).toEqual({
        autoAddLastRunTotalMs: 812,
        autoAddLastRunComputeMs: 4,
      });
    });
  });
});
