import { describe, it, expect } from 'vitest';
import { selectGroupedPlanList } from './grouped-plan-list.selectors';
import type { Item } from '../../models/item.model';
import type { Category } from '../../models/category.model';
import type { AccountId, CategoryId, ItemId } from '../../models/ids.model';

const item = (id: string, name: string, primary: string | null): Item =>
  ({
    id: id as ItemId,
    accountId: 'a1' as AccountId,
    name,
    description: null,
    quantity: null,
    unit: null,
    primaryCategoryId: primary ? (primary as CategoryId) : null,
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
  }) as Item;

const cat = (id: string, name: string): Category => ({
  id: id as CategoryId,
  accountId: 'a1' as AccountId,
  name,
  globalSortOrder: 0,
});

describe('selectGroupedPlanList', () => {
  it('groups items by primary category in the order of orderedCategories', () => {
    const items = [
      item('i1', 'Milk', 'c-dairy'),
      item('i2', 'Apples', 'c-produce'),
      item('i3', 'Bread', 'c-bakery'),
    ];
    const categories = [
      cat('c-produce', 'Produce'),
      cat('c-dairy', 'Dairy'),
      cat('c-bakery', 'Bakery'),
    ];

    const groups = selectGroupedPlanList.projector(items, categories);

    expect(groups.map((g) => g.categoryId)).toEqual([
      'c-produce',
      'c-dairy',
      'c-bakery',
    ]);
  });

  it('sorts items alphabetically within a group', () => {
    const items = [
      item('i1', 'Bananas', 'c1'),
      item('i2', 'Apples', 'c1'),
    ];
    const groups = selectGroupedPlanList.projector(items, [cat('c1', 'Produce')]);
    expect(groups[0]!.items.map((i) => i.name)).toEqual(['Apples', 'Bananas']);
  });

  it('omits categories with no items', () => {
    const items = [item('i1', 'Milk', 'c-dairy')];
    const categories = [cat('c-produce', 'Produce'), cat('c-dairy', 'Dairy')];
    const groups = selectGroupedPlanList.projector(items, categories);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.categoryId).toBe('c-dairy');
  });

  it('places uncategorised items in a distinct group at the end', () => {
    const items = [
      item('i1', 'Milk', 'c-dairy'),
      item('i2', 'Loose thing', null),
    ];
    const categories = [cat('c-dairy', 'Dairy')];
    const groups = selectGroupedPlanList.projector(items, categories);
    expect(groups.map((g) => g.categoryId)).toEqual(['c-dairy', null]);
    expect(groups[1]!.categoryName).toBeNull();
  });

  it('returns empty when no items', () => {
    const groups = selectGroupedPlanList.projector([], [cat('c1', 'Produce')]);
    expect(groups).toEqual([]);
  });
});
