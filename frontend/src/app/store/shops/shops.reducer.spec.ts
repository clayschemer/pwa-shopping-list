import { describe, it, expect } from 'vitest';
import { shopsReducer, initialShopsState } from './shops.reducer';
import { shopsActions } from './shops.actions';
import type { Shop } from '../../models/shop.model';
import type { AccountId, CategoryId, ShopId } from '../../models/ids.model';

const shop = (id: string, name: string, categoryOrder: string[] = []): Shop => ({
  id: id as ShopId,
  accountId: 'a1' as AccountId,
  name,
  categoryOrder: categoryOrder as CategoryId[],
});

describe('shopsReducer', () => {
  it('has empty initial state', () => {
    const state = shopsReducer(undefined, { type: '@@INIT' } as never);
    expect(state.ids).toEqual([]);
    expect(state.entities).toEqual({});
    expect(state.loaded).toBe(false);
  });

  it('populates entities on shopsLoaded', () => {
    const shops = [shop('s1', 'Tesco'), shop('s2', 'Lidl')];
    const state = shopsReducer(
      initialShopsState,
      shopsActions.shopsLoaded({ shops }),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.entities['s1']!.name).toBe('Tesco');
    expect(state.loaded).toBe(true);
  });

  it('inserts a new shop on shopAdded', () => {
    const loaded = shopsReducer(
      initialShopsState,
      shopsActions.shopsLoaded({ shops: [shop('s1', 'Tesco')] }),
    );
    const state = shopsReducer(
      loaded,
      shopsActions.shopAdded({ shop: shop('s2', 'Lidl') }),
    );
    expect(state.ids).toContain('s2');
  });

  it('updates entity on shopRenamed', () => {
    const loaded = shopsReducer(
      initialShopsState,
      shopsActions.shopsLoaded({ shops: [shop('s1', 'Tesco')] }),
    );
    const state = shopsReducer(
      loaded,
      shopsActions.shopRenamed({ shop: { ...shop('s1', 'Tesco Express') } }),
    );
    expect(state.entities['s1']!.name).toBe('Tesco Express');
  });

  it('removes entity on shopDeleted', () => {
    const loaded = shopsReducer(
      initialShopsState,
      shopsActions.shopsLoaded({ shops: [shop('s1', 'Tesco'), shop('s2', 'Lidl')] }),
    );
    const state = shopsReducer(
      loaded,
      shopsActions.shopDeleted({ id: 's1' as ShopId }),
    );
    expect(state.ids).toEqual(['s2']);
  });

  it('updates categoryOrder on shopCategoryOrderSet', () => {
    const loaded = shopsReducer(
      initialShopsState,
      shopsActions.shopsLoaded({
        shops: [shop('s1', 'Tesco', ['c1', 'c2', 'c3'])],
      }),
    );
    const state = shopsReducer(
      loaded,
      shopsActions.shopCategoryOrderSet({
        shopId: 's1' as ShopId,
        orderedIds: ['c3' as CategoryId, 'c1' as CategoryId],
      }),
    );
    expect(state.entities['s1']!.categoryOrder).toEqual(['c3', 'c1']);
  });

  it('handles shopChangesReceived with added and modified', () => {
    const loaded = shopsReducer(
      initialShopsState,
      shopsActions.shopsLoaded({ shops: [shop('s1', 'Tesco')] }),
    );
    const state = shopsReducer(
      loaded,
      shopsActions.shopChangesReceived({
        shops: [shop('s1', 'Tesco Extra'), shop('s2', 'Lidl')],
        removed: [],
      }),
    );
    expect(state.entities['s1']!.name).toBe('Tesco Extra');
    expect(state.entities['s2']!.name).toBe('Lidl');
  });

  it('handles shopChangesReceived with removals', () => {
    const loaded = shopsReducer(
      initialShopsState,
      shopsActions.shopsLoaded({ shops: [shop('s1', 'Tesco'), shop('s2', 'Lidl')] }),
    );
    const state = shopsReducer(
      loaded,
      shopsActions.shopChangesReceived({
        shops: [],
        removed: ['s1' as ShopId],
      }),
    );
    expect(state.ids).toEqual(['s2']);
  });
});
