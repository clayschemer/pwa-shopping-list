import { describe, it, expect } from 'vitest';
import { itemsReducer, initialItemsState } from './items.reducer';
import { itemsApiActions } from './items.actions';
import type { Item } from '../../models/item.model';
import type { ItemId, AccountId } from '../../models/ids.model';

const item = (id: string, name: string, removed = false): Item => ({
  id: id as ItemId,
  accountId: 'acc-1' as AccountId,
  name,
  description: null,
  quantity: null,
  unit: null,
  primaryCategoryId: null,
  secondaryCategoryIds: [],
  removed,
  removedAt: removed ? Date.now() : null,
  addedBy: 'user',
  aiMotivation: null,
  price: null,
  priceQuantity: null,
  priceUnit: null,
  priceUpdatedAt: null,
  purchaseCount: 0,
});

describe('itemsReducer', () => {
  it('starts with empty items', () => {
    const state = itemsReducer(undefined, { type: '@@INIT' });
    expect(state.ids).toHaveLength(0);
    expect(state.loaded).toBe(false);
  });

  it('seeds active items on fetch success', () => {
    const items = [item('i1', 'Milk'), item('i2', 'Eggs')];
    const state = itemsReducer(
      initialItemsState,
      itemsApiActions.fetchActiveListSuccess({ items }),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.entities['i1']?.name).toBe('Milk');
    expect(state.loaded).toBe(true);
  });

  it('upserts an item on stream added', () => {
    const state = itemsReducer(
      initialItemsState,
      itemsApiActions.itemStreamUpdated({
        changes: [{ entity: item('i1', 'Milk'), changeType: 'added' }],
      }),
    );
    expect(state.entities['i1']?.name).toBe('Milk');
  });

  it('updates an item on stream modified', () => {
    let state = itemsReducer(
      initialItemsState,
      itemsApiActions.fetchActiveListSuccess({ items: [item('i1', 'Milk')] }),
    );
    const updated = { ...item('i1', 'Milk'), removed: true };
    state = itemsReducer(
      state,
      itemsApiActions.itemStreamUpdated({
        changes: [{ entity: updated, changeType: 'modified' }],
      }),
    );
    expect(state.entities['i1']?.removed).toBe(true);
  });

  it('removes an item on stream removed', () => {
    let state = itemsReducer(
      initialItemsState,
      itemsApiActions.fetchActiveListSuccess({ items: [item('i1', 'Milk')] }),
    );
    state = itemsReducer(
      state,
      itemsApiActions.itemStreamUpdated({
        changes: [{ entity: item('i1', 'Milk'), changeType: 'removed' }],
      }),
    );
    expect(state.ids).toHaveLength(0);
  });
});
