import { describe, it, expect } from 'vitest';
import { shopsReducer, initialShopsState } from './shops.reducer';
import { shopsApiActions } from './shops.actions';
import type { Shop } from '../../models/shop.model';
import type { ShopId, AccountId, CategoryId } from '../../models/ids.model';

const shop = (id: string, name: string, categoryOrder: string[] = []): Shop => ({
  id: id as ShopId,
  accountId: 'acc-1' as AccountId,
  name,
  categoryOrder: categoryOrder as CategoryId[],
});

describe('shopsReducer', () => {
  it('starts with empty shops', () => {
    const state = shopsReducer(undefined, { type: '@@INIT' });
    expect(state.ids).toHaveLength(0);
    expect(state.loaded).toBe(false);
  });

  it('seeds shops on fetch success', () => {
    const shops = [shop('s1', 'Tesco', ['c1']), shop('s2', 'Lidl', [])];
    const state = shopsReducer(
      initialShopsState,
      shopsApiActions.fetchAllShopsSuccess({ shops }),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.entities['s1']?.name).toBe('Tesco');
    expect(state.loaded).toBe(true);
  });

  it('adds a shop on stream added', () => {
    const state = shopsReducer(
      initialShopsState,
      shopsApiActions.shopStreamUpdated({
        changes: [{ entity: shop('s1', 'Tesco'), changeType: 'added' }],
      }),
    );
    expect(state.entities['s1']?.name).toBe('Tesco');
  });

  it('updates shop categoryOrder on stream modified', () => {
    let state = shopsReducer(
      initialShopsState,
      shopsApiActions.fetchAllShopsSuccess({ shops: [shop('s1', 'Tesco', ['c1'])] }),
    );
    state = shopsReducer(
      state,
      shopsApiActions.shopStreamUpdated({
        changes: [{ entity: shop('s1', 'Tesco', ['c2', 'c1']), changeType: 'modified' }],
      }),
    );
    expect(state.entities['s1']?.categoryOrder).toEqual(['c2', 'c1']);
  });

  it('removes a shop on stream removed', () => {
    let state = shopsReducer(
      initialShopsState,
      shopsApiActions.fetchAllShopsSuccess({ shops: [shop('s1', 'Tesco')] }),
    );
    state = shopsReducer(
      state,
      shopsApiActions.shopStreamUpdated({
        changes: [{ entity: shop('s1', 'Tesco'), changeType: 'removed' }],
      }),
    );
    expect(state.ids).toHaveLength(0);
  });
});
