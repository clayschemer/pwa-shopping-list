import { describe, it, expect } from 'vitest';
import { selectAllShops, selectShopEntities, selectShopsLoaded } from './shops.selectors';
import { shopsAdapter, ShopsState } from './shops.reducer';
import type { Shop } from '../../models/shop.model';
import type { AccountId, ShopId } from '../../models/ids.model';

const shop = (id: string, name: string): Shop => ({
  id: id as ShopId,
  accountId: 'a1' as AccountId,
  name,
  categoryOrder: [],
});

function makeState(shops: Shop[], loaded = true): ShopsState {
  return shopsAdapter.setAll(shops, {
    ...shopsAdapter.getInitialState({ loaded }),
  });
}

describe('shops selectors', () => {
  it('selectAllShops returns array', () => {
    const state = makeState([shop('s1', 'Tesco'), shop('s2', 'Lidl')]);
    const result = selectAllShops.projector(state);
    expect(result).toHaveLength(2);
  });

  it('selectShopEntities returns dictionary', () => {
    const state = makeState([shop('s1', 'Tesco')]);
    const result = selectShopEntities.projector(state);
    expect(result['s1']!.name).toBe('Tesco');
  });

  it('selectShopsLoaded returns loaded flag', () => {
    expect(selectShopsLoaded.projector(makeState([], false))).toBe(false);
    expect(selectShopsLoaded.projector(makeState([], true))).toBe(true);
  });
});
