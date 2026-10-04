import { describe, it, expect } from 'vitest';
import {
  selectOrderedCategories,
  selectShopAvailableCategories,
} from './ordered-categories.selectors';
import type { Category } from '../../models/category.model';
import type { Shop } from '../../models/shop.model';
import type { AccountId, CategoryId, ShopId } from '../../models/ids.model';
import { Dictionary } from '@ngrx/entity';

const cat = (id: string, name: string, order: number): Category => ({
  id: id as CategoryId,
  accountId: 'a1' as AccountId,
  name,
  color: null,
  globalSortOrder: order,
  groupIds: [],
});

const shop = (id: string, name: string, categoryOrder: string[]): Shop => ({
  id: id as ShopId,
  accountId: 'a1' as AccountId,
  name,
  categoryOrder: categoryOrder as CategoryId[],
  priceSearchUrl: null,
});

describe('selectOrderedCategories', () => {
  const categories = [cat('c1', 'Produce', 0), cat('c2', 'Dairy', 1), cat('c3', 'Bakery', 2)];

  it('returns categories sorted by globalSortOrder when no shop selected', () => {
    const result = selectOrderedCategories.projector(categories, {}, null);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('returns categories sorted by shop categoryOrder when shop selected', () => {
    const shopEntities: Dictionary<Shop> = {
      s1: shop('s1', 'Tesco', ['c3', 'c1', 'c2']),
    };
    const result = selectOrderedCategories.projector(categories, shopEntities, 's1' as ShopId);
    expect(result.map((c) => c.id)).toEqual(['c3', 'c1', 'c2']);
  });

  it('falls back to globalSortOrder when selected shop not found', () => {
    const result = selectOrderedCategories.projector(categories, {}, 'missing' as ShopId);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('appends categories not in shop categoryOrder at the end', () => {
    const shopEntities: Dictionary<Shop> = {
      s1: shop('s1', 'Tesco', ['c2']),
    };
    const result = selectOrderedCategories.projector(categories, shopEntities, 's1' as ShopId);
    // c2 first (in categoryOrder), then c1 and c3 in globalSortOrder
    expect(result.map((c) => c.id)).toEqual(['c2', 'c1', 'c3']);
  });

  it('skips category IDs in shop categoryOrder that no longer exist', () => {
    const shopEntities: Dictionary<Shop> = {
      s1: shop('s1', 'Tesco', ['c3', 'deleted', 'c1']),
    };
    const result = selectOrderedCategories.projector(categories, shopEntities, 's1' as ShopId);
    // c3, c1 from order; c2 appended (not in order)
    expect(result.map((c) => c.id)).toEqual(['c3', 'c1', 'c2']);
  });

  it('returns empty array when no categories exist', () => {
    const result = selectOrderedCategories.projector([], {}, null);
    expect(result).toEqual([]);
  });
});

describe('selectShopAvailableCategories', () => {
  const categories = [cat('c1', 'Produce', 0), cat('c2', 'Dairy', 1), cat('c3', 'Bakery', 2)];

  it('returns every category when no shop is selected', () => {
    const result = selectShopAvailableCategories.projector(categories, {}, null);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('drops categories excluded from the selected shop', () => {
    const shopEntities: Dictionary<Shop> = {
      s1: shop('s1', 'Tesco', ['c2', 'c1']),
    };
    const result = selectShopAvailableCategories.projector(categories, shopEntities, 's1' as ShopId);
    expect(result.map((c) => c.id)).toEqual(['c2', 'c1']);
  });

  it('keeps the shop-specific order for the categories it retains', () => {
    const shopEntities: Dictionary<Shop> = {
      s1: shop('s1', 'Tesco', ['c3', 'c1', 'c2']),
    };
    const result = selectShopAvailableCategories.projector(categories, shopEntities, 's1' as ShopId);
    expect(result.map((c) => c.id)).toEqual(['c3', 'c1', 'c2']);
  });

  it('returns every category when the selected shop is not found', () => {
    const result = selectShopAvailableCategories.projector(categories, {}, 'missing' as ShopId);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('skips category IDs in shop categoryOrder that no longer exist', () => {
    const shopEntities: Dictionary<Shop> = {
      s1: shop('s1', 'Tesco', ['c3', 'deleted', 'c1']),
    };
    const result = selectShopAvailableCategories.projector(categories, shopEntities, 's1' as ShopId);
    expect(result.map((c) => c.id)).toEqual(['c3', 'c1']);
  });

  it('returns no categories when the shop excludes all of them', () => {
    const shopEntities: Dictionary<Shop> = {
      s1: shop('s1', 'Tesco', []),
    };
    const result = selectShopAvailableCategories.projector(categories, shopEntities, 's1' as ShopId);
    expect(result).toEqual([]);
  });
});
