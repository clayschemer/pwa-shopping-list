import { describe, it, expect } from 'vitest';
import {
  selectActiveSessionCheckedItemIds,
  selectGroupedPlanList,
  selectGroupedPlanListWithChecked,
} from './grouped-plan-list.selectors';
import type { Item } from '../../models/item.model';
import type { Category } from '../../models/category.model';
import type { Session } from '../../models/session.model';
import type { AccountId, CategoryId, ItemId, SessionId, ShopId, UserId } from '../../models/ids.model';

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
    sizePerPieceQuantity: null,
    sizePerPieceUnit: null,
    purchaseCount: 0,
  }) as Item;

const cat = (id: string, name: string, color: string | null = null): Category => ({
  id: id as CategoryId,
  accountId: 'a1' as AccountId,
  name,
  color,
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

  it('sums prices into estTotal per category', () => {
    const a = { ...item('i1', 'Apples', 'c1'), price: 1.5 };
    const b = { ...item('i2', 'Bananas', 'c1'), price: 0.8 };
    const c = { ...item('i3', 'Cherries', 'c1'), price: null };
    const groups = selectGroupedPlanList.projector(
      [a, b, c] as Item[],
      [cat('c1', 'Produce')],
    );
    expect(groups[0]!.estTotal).toBeCloseTo(2.3);
  });

  it('passes categoryColor through to groups', () => {
    const items = [item('i1', 'Milk', 'c1')];
    const categories = [cat('c1', 'Dairy', '#2196F3')];
    const groups = selectGroupedPlanList.projector(items, categories);
    expect(groups[0]!.categoryColor).toBe('#2196F3');
  });

  it('sets categoryColor to null for uncategorised group', () => {
    const items = [item('i1', 'Loose', null)];
    const groups = selectGroupedPlanList.projector(items, []);
    expect(groups[0]!.categoryColor).toBeNull();
  });

  it('sets estTotal to 0 for the uncategorised group', () => {
    const items = [{ ...item('i1', 'Loose', null), price: 5 }] as Item[];
    const groups = selectGroupedPlanList.projector(items, []);
    expect(groups[0]!.estTotal).toBe(0);
  });
});

const removed = (i: Item): Item => ({ ...i, removed: true, removedAt: 1 } as Item);

const session = (id: string, shopId: string | null, checkedItemIds: string[]): Session => ({
  id: id as SessionId,
  accountId: 'a1' as AccountId,
  shopId: shopId ? (shopId as ShopId) : null,
  participants: ['u1' as UserId],
  startedBy: 'u1' as UserId,
  startedAt: 1,
  completedAt: null,
  checkedItems: checkedItemIds.map((iid) => ({
    itemId: iid as ItemId,
    checkedBy: 'u1' as UserId,
    checkedAt: 2,
    priceSnapshot: null,
    priceQuantitySnapshot: null,
    priceUnitSnapshot: null,
    nameSnapshot: null,
    quantitySnapshot: null,
    unitSnapshot: null,
  })),
});

describe('selectActiveSessionCheckedItemIds', () => {
  it('unions checkedItem ids across all active sessions', () => {
    const sessions = [
      session('s1', 'shop-a', ['i1', 'i2']),
      session('s2', 'shop-b', ['i2', 'i3']),
    ];
    const ids = selectActiveSessionCheckedItemIds.projector(sessions);
    expect([...ids].sort()).toEqual(['i1', 'i2', 'i3']);
  });

  it('returns empty set when no active sessions exist', () => {
    expect(selectActiveSessionCheckedItemIds.projector([]).size).toBe(0);
  });
});

describe('selectGroupedPlanListWithChecked', () => {
  it('falls back to plain grouped list when no items are checked', () => {
    const active = [item('i1', 'Apples', 'c1')];
    const all = active;
    const groups = selectGroupedPlanListWithChecked.projector(
      active,
      new Set<ItemId>(),
      all,
      [cat('c1', 'Produce')],
    );
    expect(groups[0]!.items.map((i) => i.id)).toEqual(['i1']);
  });

  it('includes session-checked items alongside active items in the same category', () => {
    const active = [item('i1', 'Apples', 'c1')];
    const checked = removed(item('i2', 'Bananas', 'c1'));
    const all: Item[] = [active[0]!, checked];
    const groups = selectGroupedPlanListWithChecked.projector(
      active,
      new Set<ItemId>(['i2' as ItemId]),
      all,
      [cat('c1', 'Produce')],
    );
    expect(groups[0]!.items.map((i) => i.name)).toEqual(['Apples', 'Bananas']);
  });

  it('excludes session-checked items from the category total', () => {
    const active = [{ ...item('i1', 'Apples', 'c1'), price: 2 }] as Item[];
    const checked = removed({ ...item('i2', 'Bananas', 'c1'), price: 5 } as Item);
    const all: Item[] = [active[0]!, checked];
    const groups = selectGroupedPlanListWithChecked.projector(
      active,
      new Set<ItemId>(['i2' as ItemId]),
      all,
      [cat('c1', 'Produce')],
    );
    expect(groups[0]!.estTotal).toBeCloseTo(2);
  });
});
