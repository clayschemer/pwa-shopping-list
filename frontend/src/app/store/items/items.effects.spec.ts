import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { ItemsEffects } from './items.effects';
import { itemsActions, itemsApiActions } from './items.actions';
import { accountActions } from '../account/account.actions';
import { ItemApiService } from '../../core/api/item-api.service';
import { PriceQueueApiService } from '../../core/api/price-queue-api.service';
import type { Item } from '../../models/item.model';
import type { AccountId, ItemId, SessionId } from '../../models/ids.model';

const mockItem: Item = {
  id: 'i1' as ItemId,
  accountId: 'a1' as AccountId,
  name: 'Milk',
  description: null,
  quantity: null,
  unit: null,
  primaryCategoryId: null,
  secondaryCategoryIds: [],
  removed: false,
  removedAt: null,
  addedBy: 'user',
  aiMotivation: null,
  price: null,
  priceQuantity: null,
  priceUnit: null,
  priceUpdatedAt: null,
  sizePerPieceQuantity: null,
  sizePerPieceUnit: null,
  purchaseCount: 0,
};

const mockAccount = { id: 'a1' as AccountId, name: 'Test', aiConfig: null };

describe('ItemsEffects', () => {
  let effects: ItemsEffects;
  let actions$: Subject<unknown>;
  let itemApi: {
    fetchActiveList: ReturnType<typeof vi.fn>;
    addItem: ReturnType<typeof vi.fn>;
    updateItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    checkItem: ReturnType<typeof vi.fn>;
    uncheckItem: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    actions$ = new Subject();
    itemApi = {
      fetchActiveList: vi.fn(),
      addItem: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      checkItem: vi.fn(),
      uncheckItem: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        ItemsEffects,
        provideMockActions(() => actions$),
        { provide: ItemApiService, useValue: itemApi },
        { provide: PriceQueueApiService, useValue: { enqueue: vi.fn() } },
        provideMockStore(),
      ],
    });
    effects = TestBed.inject(ItemsEffects);
  });

  const flush = () => new Promise<void>((r) => setTimeout(r));

  it('dispatches itemsLoaded on accountLoaded', async () => {
    itemApi.fetchActiveList.mockResolvedValue([mockItem]);
    const results: unknown[] = [];
    effects.fetchActiveList$.subscribe((a) => results.push(a));
    actions$.next(accountActions.accountLoaded({ account: mockAccount, selectedShopId: null }));
    await flush();
    expect(results).toEqual([itemsActions.itemsLoaded({ items: [mockItem] })]);
  });

  it('dispatches itemAdded on successful add', async () => {
    itemApi.addItem.mockResolvedValue(mockItem);
    const results: unknown[] = [];
    effects.addItem$.subscribe((a) => results.push(a));
    actions$.next(
      itemsApiActions.addItemRequested({
        name: 'Milk',
        description: null,
        quantity: null,
        unit: null,
        primaryCategoryId: null,
        secondaryCategoryIds: [],
      }),
    );
    await flush();
    expect(results).toEqual([itemsActions.itemAdded({ item: mockItem })]);
  });

  it('dispatches itemNameConflict on add conflict', async () => {
    itemApi.addItem.mockResolvedValue({
      type: 'NAME_CONFLICT',
      entityKind: 'item',
      name: 'Milk',
    });
    const results: unknown[] = [];
    effects.addItem$.subscribe((a) => results.push(a));
    actions$.next(
      itemsApiActions.addItemRequested({
        name: 'Milk',
        description: null,
        quantity: null,
        unit: null,
        primaryCategoryId: null,
        secondaryCategoryIds: [],
      }),
    );
    await flush();
    expect(results).toEqual([itemsActions.itemNameConflict({ name: 'Milk' })]);
  });

  it('dispatches itemUpdated on successful update', async () => {
    itemApi.updateItem.mockResolvedValue({ ...mockItem, name: 'Whole Milk' });
    const results: unknown[] = [];
    effects.updateItem$.subscribe((a) => results.push(a));
    actions$.next(
      itemsApiActions.updateItemRequested({
        id: 'i1' as ItemId,
        name: 'Whole Milk',
        description: null,
        quantity: null,
        unit: null,
        primaryCategoryId: null,
        secondaryCategoryIds: [],
      }),
    );
    await flush();
    expect((results[0] as { type: string }).type).toContain('Item Updated');
  });

  it('dispatches itemRemoved on remove request', async () => {
    itemApi.removeItem.mockResolvedValue(undefined);
    const results: unknown[] = [];
    effects.removeItem$.subscribe((a) => results.push(a));
    actions$.next(itemsApiActions.removeItemRequested({ id: 'i1' as ItemId }));
    await flush();
    expect(results).toEqual([
      itemsActions.itemRemoved({ id: 'i1' as ItemId }),
    ]);
  });

  it('dispatches itemCheckConflict when the API returns CHECK_CONFLICT', async () => {
    itemApi.checkItem.mockResolvedValue({
      type: 'CHECK_CONFLICT',
      itemId: 'i1',
    });
    const results: unknown[] = [];
    effects.checkItem$.subscribe((a) => results.push(a));
    actions$.next(
      itemsApiActions.checkItemRequested({
        id: 'i1' as ItemId,
        sessionId: 's1' as SessionId,
      }),
    );
    await flush();
    expect(results).toEqual([
      itemsActions.itemCheckConflict({ id: 'i1' as ItemId }),
    ]);
  });

  it('dispatches itemChecked on CHECK_SUCCESS', async () => {
    itemApi.checkItem.mockResolvedValue({
      type: 'CHECK_SUCCESS',
      item: { ...mockItem, removed: true },
      session: {},
    });
    const results: unknown[] = [];
    effects.checkItem$.subscribe((a) => results.push(a));
    actions$.next(
      itemsApiActions.checkItemRequested({
        id: 'i1' as ItemId,
        sessionId: 's1' as SessionId,
      }),
    );
    await flush();
    expect((results[0] as { type: string }).type).toContain('Item Checked');
  });

  it('dispatches itemUnchecked on uncheck request', async () => {
    itemApi.uncheckItem.mockResolvedValue(undefined);
    const results: unknown[] = [];
    effects.uncheckItem$.subscribe((a) => results.push(a));
    actions$.next(
      itemsApiActions.uncheckItemRequested({
        id: 'i1' as ItemId,
        sessionId: 's1' as SessionId,
      }),
    );
    await flush();
    expect(results).toEqual([
      itemsActions.itemUnchecked({ id: 'i1' as ItemId }),
    ]);
  });

  // A rejected API call (offline / flaky in-store connectivity) must never
  // kill the effect stream. Each spec fails the first call, then verifies a
  // failure action was dispatched AND that a subsequent request still works.
  describe('failure resilience', () => {
    const checkReq = () =>
      itemsApiActions.checkItemRequested({
        id: 'i1' as ItemId,
        sessionId: 's1' as SessionId,
      });

    it('checkItem$ dispatches itemCheckFailed and survives a rejected call', async () => {
      itemApi.checkItem
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce({ item: mockItem, session: {} });
      const results: unknown[] = [];
      let errored = false;
      effects.checkItem$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });

      actions$.next(checkReq());
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        itemsActions.itemCheckFailed({ id: 'i1' as ItemId }),
      ]);

      actions$.next(checkReq());
      await flush();
      expect((results[1] as { type: string }).type).toContain('Item Checked');
    });

    it('updateItem$ dispatches itemSaveFailed and survives a rejected call', async () => {
      itemApi.updateItem
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(mockItem);
      const results: unknown[] = [];
      let errored = false;
      effects.updateItem$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = itemsApiActions.updateItemRequested({
        id: 'i1' as ItemId,
        name: 'Milk',
        description: null,
        quantity: null,
        unit: null,
        primaryCategoryId: null,
        secondaryCategoryIds: [],
        sizePerPieceQuantity: null,
        sizePerPieceUnit: null,
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        itemsActions.itemSaveFailed({ id: 'i1' as ItemId }),
      ]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain('Item Updated');
    });

    it('addItem$ dispatches itemSaveFailed and survives a rejected call', async () => {
      itemApi.addItem
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(mockItem);
      const results: unknown[] = [];
      let errored = false;
      effects.addItem$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = itemsApiActions.addItemRequested({
        name: 'Milk',
        description: null,
        quantity: null,
        unit: null,
        primaryCategoryId: null,
        secondaryCategoryIds: [],
        sizePerPieceQuantity: null,
        sizePerPieceUnit: null,
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([itemsActions.itemSaveFailed({ id: null })]);

      actions$.next(req);
      await flush();
      expect((results[1] as { type: string }).type).toContain('Item Added');
    });

    it('removeItem$ dispatches itemSaveFailed and survives a rejected call', async () => {
      itemApi.removeItem
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const results: unknown[] = [];
      let errored = false;
      effects.removeItem$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });

      actions$.next(itemsApiActions.removeItemRequested({ id: 'i1' as ItemId }));
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        itemsActions.itemSaveFailed({ id: 'i1' as ItemId }),
      ]);

      actions$.next(itemsApiActions.removeItemRequested({ id: 'i1' as ItemId }));
      await flush();
      expect(results[1]).toEqual(
        itemsActions.itemRemoved({ id: 'i1' as ItemId }),
      );
    });

    it('uncheckItem$ dispatches itemUncheckFailed and survives a rejected call', async () => {
      itemApi.uncheckItem
        .mockRejectedValueOnce(new Error('client is offline'))
        .mockResolvedValueOnce(undefined);
      const results: unknown[] = [];
      let errored = false;
      effects.uncheckItem$.subscribe({
        next: (a) => results.push(a),
        error: () => (errored = true),
      });
      const req = itemsApiActions.uncheckItemRequested({
        id: 'i1' as ItemId,
        sessionId: 's1' as SessionId,
      });

      actions$.next(req);
      await flush();
      expect(errored).toBe(false);
      expect(results).toEqual([
        itemsActions.itemUncheckFailed({ id: 'i1' as ItemId }),
      ]);

      actions$.next(req);
      await flush();
      expect(results[1]).toEqual(
        itemsActions.itemUnchecked({ id: 'i1' as ItemId }),
      );
    });
  });
});
