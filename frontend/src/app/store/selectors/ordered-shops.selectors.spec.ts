import { describe, it, expect } from 'vitest';
import { selectOrderedShops } from './ordered-shops.selectors';
import type { Shop } from '../../models/shop.model';
import type { AccountId, ShopId } from '../../models/ids.model';

const shop = (id: string, name: string): Shop => ({
  id: id as ShopId,
  accountId: 'a1' as AccountId,
  name,
  categoryOrder: [],
  priceSearchUrl: null,
});

describe('selectOrderedShops', () => {
  it('returns shops in adapter order when no shopOrder is set', () => {
    const shops = [shop('s1', 'Tesco'), shop('s2', 'ICA'), shop('s3', 'Coop')];
    const result = selectOrderedShops.projector(shops, []);
    expect(result.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  });

  it('respects an explicit shopOrder', () => {
    const shops = [shop('s1', 'Tesco'), shop('s2', 'ICA'), shop('s3', 'Coop')];
    const result = selectOrderedShops.projector(shops, [
      's3' as ShopId,
      's1' as ShopId,
      's2' as ShopId,
    ]);
    expect(result.map((s) => s.id)).toEqual(['s3', 's1', 's2']);
  });

  it('appends shops not in shopOrder at the end (newly-added)', () => {
    const shops = [
      shop('s1', 'Tesco'),
      shop('s2', 'ICA'),
      shop('s3', 'Coop'),
      shop('s4', 'New'),
    ];
    const result = selectOrderedShops.projector(shops, [
      's3' as ShopId,
      's2' as ShopId,
      's1' as ShopId,
    ]);
    expect(result.map((s) => s.id)).toEqual(['s3', 's2', 's1', 's4']);
  });

  it('ignores stale ids in shopOrder that no longer exist as shops', () => {
    const shops = [shop('s1', 'Tesco'), shop('s2', 'ICA')];
    const result = selectOrderedShops.projector(shops, [
      's3' as ShopId,
      's2' as ShopId,
      's1' as ShopId,
    ]);
    expect(result.map((s) => s.id)).toEqual(['s2', 's1']);
  });
});
