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

  describe('auto-add fields on read', () => {
    it('reads a stored periodicity reason', async () => {
      getDocsMock.mockResolvedValue({
        empty: false,
        docs: [
          itemDocSnapshot({
            addedBy: 'auto',
            autoAddReason: {
              kind: 'periodicity',
              medianIntervalDays: 7,
              daysSinceLastPurchase: 9,
              purchaseCount: 5,
            },
            autoAddedAt: 1_700_000_000_000,
          }),
        ],
      });

      const [item] = await service.fetchActiveList();

      expect(item.addedBy).toBe('auto');
      expect(item.autoAddReason).toEqual({
        kind: 'periodicity',
        medianIntervalDays: 7,
        daysSinceLastPurchase: 9,
        purchaseCount: 5,
      });
      expect(item.autoAddedAt).toBe(1_700_000_000_000);
    });

    it('defaults the auto-add fields on documents written before the feature', async () => {
      getDocsMock.mockResolvedValue({ empty: false, docs: [itemDocSnapshot()] });

      const [item] = await service.fetchActiveList();

      expect(item.addedBy).toBe('user');
      expect(item.autoAddReason).toBeNull();
      expect(item.autoAddedAt).toBeNull();
      expect(item.autoAddDeclinedAt).toBeNull();
      expect(item.autoAddMotivation).toBeNull();
    });

    /**
     * The indicator is tappable whenever a reason is present, so a reason the
     * renderer cannot switch on would open an empty dialog. Unknown kinds and
     * malformed payloads have to read as "no reason" rather than as data.
     */
    it('discards a reason whose kind it cannot render', async () => {
      getDocsMock.mockResolvedValue({
        empty: false,
        docs: [
          itemDocSnapshot({
            addedBy: 'ai',
            autoAddReason: { kind: 'recipe', recipeName: 'lasagne' },
          }),
        ],
      });

      const [item] = await service.fetchActiveList();

      expect(item.autoAddReason).toBeNull();
    });

    it('discards a periodicity reason with no usable interval', async () => {
      getDocsMock.mockResolvedValue({
        empty: false,
        docs: [
          itemDocSnapshot({
            autoAddReason: { kind: 'periodicity', medianIntervalDays: 0 },
          }),
        ],
      });

      const [item] = await service.fetchActiveList();

      expect(item.autoAddReason).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('marks the item removed without touching the decline stamp by default', async () => {
      await service.removeItem(ITEM_ID);

      expect(updateDocMock).toHaveBeenCalledOnce();
      const [, payload] = updateDocMock.mock.calls[0];
      expect(payload).toEqual({ removed: true, removedAt: 'SERVER_TIMESTAMP' });
    });

    /**
     * A removal of an auto-added item is the user saying "no". Recorded in the
     * same write as the removal so the two can never diverge.
     */
    it('records a decline in the same write when asked to', async () => {
      await service.removeItem(ITEM_ID, { declineAutoAdd: true });

      expect(updateDocMock).toHaveBeenCalledOnce();
      const [, payload] = updateDocMock.mock.calls[0];
      expect(payload).toEqual({
        removed: true,
        removedAt: 'SERVER_TIMESTAMP',
        autoAddDeclinedAt: 'SERVER_TIMESTAMP',
      });
    });

    it('does not record a decline when the flag is false', async () => {
      await service.removeItem(ITEM_ID, { declineAutoAdd: false });

      const [, payload] = updateDocMock.mock.calls[0];
      expect(payload).not.toHaveProperty('autoAddDeclinedAt');
    });
  });

  describe('autoAddItem', () => {
    const REASON = {
      kind: 'periodicity' as const,
      medianIntervalDays: 7,
      daysSinceLastPurchase: 9,
      purchaseCount: 5,
    };

    function stubTransaction(snapshot: {
      exists: () => boolean;
      data: () => Record<string, unknown> | undefined;
    }) {
      const tx = {
        get: vi.fn().mockResolvedValue(snapshot),
        update: vi.fn(),
        set: vi.fn(),
      };
      runTransactionMock.mockImplementation(
        async (_db: unknown, cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
      );
      return tx;
    }

    it('restores the removed item and marks it auto-added', async () => {
      const tx = stubTransaction({
        exists: () => true,
        data: () => ({ name: 'Milk', removed: true, purchaseCount: 7 }),
      });

      const result = await service.autoAddItem(ITEM_ID, REASON);

      expect(result).toBeUndefined();
      expect(tx.update).toHaveBeenCalledOnce();
      const [, payload] = tx.update.mock.calls[0];
      expect(payload).toEqual({
        removed: false,
        removedAt: null,
        addedBy: 'auto',
        autoAddReason: REASON,
        autoAddedAt: 'SERVER_TIMESTAMP',
      });
    });

    /**
     * Nothing the household has taught the item may be disturbed — the whole
     * point of restoring in place rather than creating a document.
     */
    it('leaves name, category, quantity, prices and purchase count alone', async () => {
      const tx = stubTransaction({
        exists: () => true,
        data: () => ({ removed: true }),
      });

      await service.autoAddItem(ITEM_ID, REASON);

      const [, payload] = tx.update.mock.calls[0];
      for (const field of [
        'name',
        'primaryCategoryId',
        'secondaryCategoryIds',
        'quantity',
        'unit',
        'price',
        'purchaseCount',
        'priceFeedback',
      ]) {
        expect(payload).not.toHaveProperty(field);
      }
    });

    /**
     * The evaluation races a user adding the same item by hand. Their item is
     * already on the list and is theirs — relabelling it as auto-added would
     * put an indicator on an item they added themselves.
     */
    it('leaves an already-active item untouched', async () => {
      const tx = stubTransaction({
        exists: () => true,
        data: () => ({ name: 'Milk', removed: false }),
      });

      const result = await service.autoAddItem(ITEM_ID, REASON);

      expect(result).toBeUndefined();
      expect(tx.update).not.toHaveBeenCalled();
    });

    it('reports NOT_FOUND when the item document is gone', async () => {
      stubTransaction({ exists: () => false, data: () => undefined });

      const result = await service.autoAddItem(ITEM_ID, REASON);

      expect(result).toEqual({
        type: 'NOT_FOUND',
        entityKind: 'item',
        id: ITEM_ID,
      });
    });
  });

  describe('addItem restoring a removed item', () => {
    beforeEach(() => {
      // First query: no active name conflict. Second: a removed item matches.
      getDocsMock
        .mockResolvedValueOnce({ empty: true, docs: [] })
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            {
              ...itemDocSnapshot({
                removed: true,
                addedBy: 'auto',
                autoAddReason: {
                  kind: 'periodicity',
                  medianIntervalDays: 7,
                  daysSinceLastPurchase: 9,
                  purchaseCount: 5,
                },
                autoAddedAt: 1_700_000_000_000,
                autoAddDeclinedAt: 1_700_000_000_000,
              }),
              ref: { path: `accounts/${ACCOUNT_ID}/items/${ITEM_ID}` },
            },
          ],
        });
    });

    /**
     * `addedBy` is otherwise only written at creation, so without this reset an
     * item the app once added keeps its indicator for good — even after the
     * user adds it back by hand and owns it outright.
     */
    it('returns the item to user ownership', async () => {
      const result = await service.addItem({
        name: 'Milk',
        description: null,
        quantity: 1,
        unit: 'l',
        primaryCategoryId: null,
        secondaryCategoryIds: [],
        sizePerPieceQuantity: null,
        sizePerPieceUnit: null,
      });

      const [, payload] = updateDocMock.mock.calls[0];
      expect(payload).toMatchObject({
        removed: false,
        addedBy: 'user',
        autoAddReason: null,
        autoAddedAt: null,
        autoAddMotivation: null,
      });
      expect(result).toMatchObject({ addedBy: 'user', autoAddReason: null });
    });

    /** Asking for the item back withdraws the earlier refusal. */
    it('clears the decline stamp so the item can be auto-added again later', async () => {
      await service.addItem({
        name: 'Milk',
        description: null,
        quantity: null,
        unit: null,
        primaryCategoryId: null,
        secondaryCategoryIds: [],
        sizePerPieceQuantity: null,
        sizePerPieceUnit: null,
      });

      const [, payload] = updateDocMock.mock.calls[0];
      expect(payload).toMatchObject({ autoAddDeclinedAt: null });
    });
  });
});
