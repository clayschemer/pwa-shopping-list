import '../../../testing/init-testbed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import { ItemsEffects } from './items.effects';
import { itemsActions, itemsApiActions } from './items.actions';
import { accountActions } from '../account/account.actions';
import { ItemApiService } from '../../core/api/item-api.service';
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
      ],
    });
    effects = TestBed.inject(ItemsEffects);
  });

  const flush = () => new Promise<void>((r) => setTimeout(r));

  it('dispatches itemsLoaded on accountLoaded', async () => {
    itemApi.fetchActiveList.mockResolvedValue([mockItem]);
    const results: unknown[] = [];
    effects.fetchActiveList$.subscribe((a) => results.push(a));
    actions$.next(accountActions.accountLoaded({ account: mockAccount }));
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
});
