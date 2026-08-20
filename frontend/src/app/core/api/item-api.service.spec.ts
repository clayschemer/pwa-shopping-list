import '../../../testing/init-testbed';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { ItemApiService } from './item-api.service';
import { AccountContext } from './account-context';
import type { AccountId, CategoryId, ItemId, UserId } from '../../models/ids.model';

/**
 * The Firestore SDK is mocked wholesale: these specs are about *which write
 * primitive* each operation reaches for, because that choice decides whether
 * the operation survives a dead connection. Plain writes (`addDoc`,
 * `updateDoc`, `writeBatch`) are applied to the local cache immediately and
 * their promise simply stays pending until the backend acknowledges them —
 * the UI updates from the snapshot listener meanwhile. `runTransaction`
 * cannot do that: it needs a server read, so it retries and then rejects.
 * Any operation that reaches for a transaction without needing atomicity is
 * an operation that hard-fails offline while the rest of the app carries on.
 */
const addDocMock = vi.hoisted(() => vi.fn());
const updateDocMock = vi.hoisted(() => vi.fn());
const getDocMock = vi.hoisted(() => vi.fn());
const getDocsMock = vi.hoisted(() => vi.fn());
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
    query: vi.fn((ref: unknown) => ref),
    where: vi.fn((field: string, _op: string, value: unknown) => ({
      field,
      value,
    })),
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    addDoc: addDocMock,
    updateDoc: updateDocMock,
    getDoc: getDocMock,
    getDocs: getDocsMock,
    runTransaction: runTransactionMock,
  };
});

const ACCOUNT_ID = 'acc-1' as AccountId;
const USER_ID = 'user-1' as UserId;
const ITEM_ID = 'item-1' as ItemId;

/** A write the backend never acknowledges — the offline case. */
function neverSettles(): Promise<never> {
  return new Promise<never>(() => {});
}

const PENDING = Symbol('pending');

function settledWithin<T>(promise: Promise<T>, ms = 50): Promise<T | symbol> {
  return Promise.race([
    promise,
    new Promise<symbol>((resolve) => setTimeout(() => resolve(PENDING), ms)),
  ]);
}

function itemDocSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    exists: () => true,
    data: () => ({
      name: 'Milk',
      description: null,
      quantity: 1,
      unit: 'pcs',
      primaryCategoryId: null,
      secondaryCategoryIds: [],
      removed: false,
      price: 12.5,
      priceQuantity: 1,
      priceUnit: 'l',
      purchaseCount: 7,
      ...overrides,
    }),
  };
}

describe('ItemApiService', () => {
  let service: ItemApiService;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      providers: [{ provide: Firestore, useValue: {} }],
    }).compileComponents();

    TestBed.inject(AccountContext).set(ACCOUNT_ID, USER_ID);
    service = TestBed.inject(ItemApiService);

    // No name conflicts by default.
    getDocsMock.mockResolvedValue({ empty: true, docs: [] });
    getDocMock.mockResolvedValue(itemDocSnapshot());
    updateDocMock.mockResolvedValue(undefined);
  });

  describe('updateItem', () => {
    it('returns the item with the edited fields applied', async () => {
      const result = await service.updateItem({
        id: ITEM_ID,
        name: 'Milk',
        description: 'organic',
        quantity: 2,
        unit: 'l',
        primaryCategoryId: 'cat-dairy' as CategoryId,
        secondaryCategoryIds: ['cat-breakfast' as CategoryId],
        sizePerPieceQuantity: null,
        sizePerPieceUnit: null,
      });

      expect(result).toMatchObject({
        id: ITEM_ID,
        name: 'Milk',
        description: 'organic',
        quantity: 2,
        unit: 'l',
        primaryCategoryId: 'cat-dairy',
        secondaryCategoryIds: ['cat-breakfast'],
        // Untouched fields survive the edit.
        price: 12.5,
        purchaseCount: 7,
      });
      expect(updateDocMock).toHaveBeenCalledOnce();
    });

    it('reports a name conflict when another active item already has the name', async () => {
      getDocsMock.mockResolvedValue({
        empty: false,
        docs: [{ id: 'item-2', exists: () => true, data: () => ({}) }],
      });

      const result = await service.updateItem({
        id: ITEM_ID,
        name: 'Bread',
        description: null,
        quantity: null,
        unit: null,
        primaryCategoryId: null,
        secondaryCategoryIds: [],
        sizePerPieceQuantity: null,
        sizePerPieceUnit: null,
      });

      expect(result).toEqual({
        type: 'NAME_CONFLICT',
        entityKind: 'item',
        name: 'Bread',
      });
      expect(updateDocMock).not.toHaveBeenCalled();
    });

    /**
     * The regression this file exists for. An edit made while the connection
     * is dead used to reject — the user got "check your connection" and lost
     * the edit — even though adding and removing items in the same state
     * queued silently and re-appeared on reconnect.
     */
    it('stays pending instead of rejecting when the backend never acknowledges the write', async () => {
      updateDocMock.mockImplementation(() => neverSettles());

      const outcome = await settledWithin(
        service
          .updateItem({
            id: ITEM_ID,
            name: 'Milk',
            description: null,
            quantity: 1,
            unit: 'pcs',
            primaryCategoryId: 'cat-dairy' as CategoryId,
            secondaryCategoryIds: [],
            sizePerPieceQuantity: null,
            sizePerPieceUnit: null,
          })
          .then(
            (v) => v,
            (e: unknown) => e,
          ),
      );

      expect(outcome).toBe(PENDING);
      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it('reports NOT_FOUND when the item is gone', async () => {
      getDocMock.mockResolvedValue({
        id: ITEM_ID,
        exists: () => false,
        data: () => undefined,
      });

      const result = await service.updateItem({
        id: ITEM_ID,
        name: 'Milk',
        description: null,
        quantity: null,
        unit: null,
        primaryCategoryId: null,
        secondaryCategoryIds: [],
        sizePerPieceQuantity: null,
        sizePerPieceUnit: null,
      });

      expect(result).toEqual({
        type: 'NOT_FOUND',
        entityKind: 'item',
        id: ITEM_ID,
      });
      expect(updateDocMock).not.toHaveBeenCalled();
    });
  });
});
