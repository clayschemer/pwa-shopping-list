import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { ShopApiService } from './shop-api.service';
import { AccountContext } from './account-context';
import type { AccountId, CategoryId, ShopId, UserId } from '../../models/ids.model';

/**
 * See the header of `item-api.service.spec.ts` for why the choice of write
 * primitive is worth asserting: a transaction cannot be applied to the local
 * cache, so it rejects on a dead connection where a plain write would queue.
 */
const updateDocMock = vi.hoisted(() => vi.fn());
const runTransactionMock = vi.hoisted(() => vi.fn());

vi.mock('@angular/fire/firestore', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@angular/fire/firestore')>();
  return {
    ...actual,
    collection: vi.fn((_db: unknown, ...segments: string[]) => ({
      path: segments.join('/'),
    })),
    doc: vi.fn((_db: unknown, ...segments: string[]) => ({
      id: segments[segments.length - 1],
      path: segments.join('/'),
    })),
    updateDoc: updateDocMock,
    runTransaction: runTransactionMock,
  };
});

const ACCOUNT_ID = 'acc-1' as AccountId;
const USER_ID = 'user-1' as UserId;
const SHOP_ID = 'shop-1' as ShopId;
const ORDER = ['cat-a', 'cat-b'] as CategoryId[];

const PENDING = Symbol('pending');

function settledWithin<T>(promise: Promise<T>, ms = 50): Promise<T | symbol> {
  return Promise.race([
    promise,
    new Promise<symbol>((resolve) => setTimeout(() => resolve(PENDING), ms)),
  ]);
}

describe('ShopApiService', () => {
  let service: ShopApiService;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      providers: [{ provide: Firestore, useValue: {} }],
    }).compileComponents();

    TestBed.inject(AccountContext).set(ACCOUNT_ID, USER_ID);
    service = TestBed.inject(ShopApiService);
    updateDocMock.mockResolvedValue(undefined);
  });

  describe('setShopCategoryOrder', () => {
    it('writes the order to the shop document', async () => {
      await service.setShopCategoryOrder(SHOP_ID, ORDER);

      expect(updateDocMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: SHOP_ID }),
        { categoryOrder: ORDER },
      );
    });

    it('stays pending instead of rejecting when the backend never acknowledges the write', async () => {
      updateDocMock.mockImplementation(() => new Promise<never>(() => {}));

      const outcome = await settledWithin(
        service.setShopCategoryOrder(SHOP_ID, ORDER).then(
          (v) => v,
          (e: unknown) => e,
        ),
      );

      expect(outcome).toBe(PENDING);
      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it('reports NOT_FOUND when the shop is gone', async () => {
      updateDocMock.mockRejectedValue({ code: 'not-found' });

      await expect(service.setShopCategoryOrder(SHOP_ID, ORDER)).resolves.toEqual({
        type: 'NOT_FOUND',
        entityKind: 'shop',
        id: SHOP_ID,
      });
    });

    it('surfaces non-not-found failures to the caller', async () => {
      updateDocMock.mockRejectedValue({ code: 'permission-denied' });

      await expect(service.setShopCategoryOrder(SHOP_ID, ORDER)).rejects.toEqual({
        code: 'permission-denied',
      });
    });
  });
});
