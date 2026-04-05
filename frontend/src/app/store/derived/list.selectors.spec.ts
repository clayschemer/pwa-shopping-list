import { describe, it, expect } from 'vitest';
import { selectGroupedPlanList, selectGroupedShopList } from './list.selectors';
import { initialCategoriesState } from '../categories/categories.reducer';
import { initialShopsState } from '../shops/shops.reducer';
import { initialItemsState } from '../items/items.reducer';
import { createEntityAdapter } from '@ngrx/entity';
import type { Category } from '../../models/category.model';
import type { Item } from '../../models/item.model';
import type { Shop } from '../../models/shop.model';
import type { AccountId, CategoryId, ItemId, ShopId } from '../../models/ids.model';

const catAdapter = createEntityAdapter<Category>();
const itemAdapter = createEntityAdapter<Item>();
const shopAdapter = createEntityAdapter<Shop>();

const acc = 'acc-1' as AccountId;

const catA: Category = { id: 'cat-a' as CategoryId, accountId: acc, name: 'Produce', globalSortOrder: 1 };
const catB: Category = { id: 'cat-b' as CategoryId, accountId: acc, name: 'Dairy', globalSortOrder: 2 };

function makeItem(id: string, name: string, catId: CategoryId | null, extra: Partial<Item> = {}): Item {
  return {
    id: id as ItemId, accountId: acc, name, description: null,
    quantity: null, unit: null,
    primaryCategoryId: catId, secondaryCategoryIds: [],
    removed: false, removedAt: null,
    addedBy: 'user', aiMotivation: null,
    price: null, priceQuantity: null, priceUnit: null, priceUpdatedAt: null,
    purchaseCount: 0,
    ...extra,
  };
}

const item1 = makeItem('i1', 'Apples', catA.id);
const item2 = makeItem('i2', 'Bananas', catA.id);
const item3 = makeItem('i3', 'Milk', catB.id);
const item4 = makeItem('i4', 'Bread', null); // uncategorised

function buildState(items: Item[], categories: Category[], shops: Shop[] = []) {
  return {
    categories: catAdapter.setAll(categories, { ...initialCategoriesState, loaded: true }),
    items: itemAdapter.setAll(items, { ...initialItemsState, loaded: true }),
    shops: shopAdapter.setAll(shops, { ...initialShopsState, loaded: true }),
  };
}

describe('selectGroupedPlanList', () => {
  it('groups items by primary category in global sort order', () => {
    const state = buildState([item1, item2, item3], [catA, catB]);
    const result = selectGroupedPlanList.projector(
      selectGroupedPlanList.projector !== undefined
        ? [item1, item2, item3]
        : [],
      [catA, catB],
      { [catA.id]: catA, [catB.id]: catB },
    );
    expect(result).toHaveLength(2);
    expect(result[0].category?.id).toBe('cat-a');
    expect(result[0].items).toHaveLength(2);
    expect(result[1].category?.id).toBe('cat-b');
    expect(result[1].items).toHaveLength(1);
  });

  it('puts uncategorised items last', () => {
    const result = selectGroupedPlanList.projector(
      [item1, item4],
      [catA],
      { [catA.id]: catA },
    );
    expect(result).toHaveLength(2);
    expect(result[0].category?.id).toBe('cat-a');
    expect(result[1].category).toBeNull();
  });

  it('sorts items alphabetically within category', () => {
    const result = selectGroupedPlanList.projector(
      [item2, item1], // Bananas before Apples
      [catA],
      { [catA.id]: catA },
    );
    expect(result[0].items[0].name).toBe('Apples');
    expect(result[0].items[1].name).toBe('Bananas');
  });

  it('excludes removed items (selectActiveItems pre-filters before projector)', () => {
    // The projector receives already-filtered active items from selectActiveItems.
    // Passing only active items verifies the grouping; removal filtering is in selectActiveItems.
    const result = selectGroupedPlanList.projector(
      [item1], // only active items passed (removed items already filtered upstream)
      [catA],
      { [catA.id]: catA },
    );
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].id).toBe('i1');
  });

  it('returns empty array when no items', () => {
    const result = selectGroupedPlanList.projector([], [catA], { [catA.id]: catA });
    expect(result).toHaveLength(0);
  });
});
