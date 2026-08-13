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
import { initialUiState } from '../ui/ui.reducer';
import { initialCategoriesState } from '../categories/categories.reducer';
import { initialShopsState } from '../shops/shops.reducer';
import { initialItemsState } from '../items/items.reducer';
import { initialSessionsState } from '../sessions/sessions.reducer';

const item = (
  id: string,
  name: string,
  primary: string | null,
  secondaries: string[] = [],
): Item =>
  ({
    id: id as ItemId,
    accountId: 'a1' as AccountId,
    name,
    description: null,
    quantity: null,
    unit: null,
    primaryCategoryId: primary ? (primary as CategoryId) : null,
    secondaryCategoryIds: secondaries as CategoryId[],
    removed: false,
    removedAt: null,
    addedBy: 'user',
    aiMotivation: null,
    price: null,
    priceQuantity: null,
    priceUnit: null,
    shopPrices: {},
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

// ---------------------------------------------------------------------------
// Secondary-category fallback. Plan mode lists an item exactly once: under its
// primary category, or — when the selected shop does not stock that category —
// under the first of its secondary categories the shop does stock, resolved in
// shop layout order. `categories` here is already shop-filtered and ordered by
// selectShopAvailableCategories.
// ---------------------------------------------------------------------------

describe('selectGroupedPlanList (secondary category fallback)', () => {
  it('falls back to a stocked secondary when the shop does not stock the primary', () => {
    const items = [item('i1', 'Cat food', 'c-pets', ['c-dairy'])];
    // Shop does not stock Pets.
    const categories = [cat('c-dairy', 'Dairy')];

    const groups = selectGroupedPlanList.projector(items, categories);

    expect(groups.map((g) => g.categoryId)).toEqual(['c-dairy']);
    expect(groups[0]!.items.map((i) => i.name)).toEqual(['Cat food']);
  });

  it('lists the item exactly once when several of its categories are stocked', () => {
    const items = [item('i1', 'Cat food', 'c-pets', ['c-dairy', 'c-bakery'])];
    const categories = [
      cat('c-dairy', 'Dairy'),
      cat('c-bakery', 'Bakery'),
      cat('c-pets', 'Pets'),
    ];

    const groups = selectGroupedPlanList.projector(items, categories);

    // Primary is stocked, so no fallback applies and it appears only there.
    expect(groups.map((g) => g.categoryId)).toEqual(['c-pets']);
    expect(groups.flatMap((g) => g.items)).toHaveLength(1);
  });

  it('resolves in shop layout order when several secondaries are stocked', () => {
    const items = [item('i1', 'Cat food', 'c-pets', ['c-bakery', 'c-dairy'])];
    // Dairy comes before Bakery in this shop's layout, so Dairy wins even
    // though Bakery is listed first on the item.
    const categories = [cat('c-dairy', 'Dairy'), cat('c-bakery', 'Bakery')];

    const groups = selectGroupedPlanList.projector(items, categories);

    expect(groups.map((g) => g.categoryId)).toEqual(['c-dairy']);
  });

  it('hides the item when the shop stocks none of its categories', () => {
    const items = [item('i1', 'Cat food', 'c-pets', ['c-frozen'])];
    const categories = [cat('c-dairy', 'Dairy')];

    const groups = selectGroupedPlanList.projector(items, categories);

    expect(groups).toEqual([]);
  });

  it('uses a stocked secondary for an item that has no primary category', () => {
    const items = [item('i1', 'Cat food', null, ['c-dairy'])];
    const categories = [cat('c-dairy', 'Dairy')];

    const groups = selectGroupedPlanList.projector(items, categories);

    expect(groups.map((g) => g.categoryId)).toEqual(['c-dairy']);
  });

  it('keeps an item with no categories at all in the uncategorised group', () => {
    const items = [item('i1', 'Loose thing', null, [])];
    const categories = [cat('c-dairy', 'Dairy')];

    const groups = selectGroupedPlanList.projector(items, categories);

    expect(groups.map((g) => g.categoryId)).toEqual([null]);
  });

  it('counts a fallen-back item in the fallback category total only', () => {
    const items = [
      { ...item('i1', 'Cat food', 'c-pets', ['c-dairy', 'c-bakery']), price: 4 },
      { ...item('i2', 'Milk', 'c-dairy'), price: 1 },
    ] as Item[];
    const categories = [cat('c-dairy', 'Dairy'), cat('c-bakery', 'Bakery')];

    const groups = selectGroupedPlanList.projector(items, categories);

    expect(groups.map((g) => g.categoryId)).toEqual(['c-dairy']);
    expect(groups[0]!.estTotal).toBeCloseTo(5);
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

  it('applies the secondary-category fallback to checked items too', () => {
    const checked = removed(item('i2', 'Cat food', 'c-pets', ['c-dairy']));
    const groups = selectGroupedPlanListWithChecked.projector(
      [],
      new Set<ItemId>(['i2' as ItemId]),
      [checked],
      [cat('c-dairy', 'Dairy')],
    );
    expect(groups.map((g) => g.categoryId)).toEqual(['c-dairy']);
    expect(groups[0]!.items.map((i) => i.name)).toEqual(['Cat food']);
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

// ---------------------------------------------------------------------------
// Wiring regression: the plan list must consume the shop-availability-filtered
// category selector, not the ordering-only one. Projector tests above cannot
// catch this — they inject the category list directly.
// ---------------------------------------------------------------------------

describe('selectGroupedPlanList (composed against real state)', () => {
  const entityState = <T extends { id: string }>(list: T[]) => ({
    ids: list.map((e) => e.id),
    entities: Object.fromEntries(list.map((e) => [e.id, e])),
  });

  const stateWith = (selectedShopId: string | null) => ({
    ...({} as Record<string, unknown>),
    ui: { ...initialUiState, selectedShopId: selectedShopId as ShopId | null },
    categories: {
      ...initialCategoriesState,
      ...entityState([cat('c-produce', 'Produce'), cat('c-bakery', 'Bakery')]),
    },
    shops: {
      ...initialShopsState,
      // Bakery has been excluded from this shop.
      ...entityState([
        {
          id: 's1',
          accountId: 'a1' as AccountId,
          name: 'Lidl',
          categoryOrder: ['c-produce'] as CategoryId[],
        },
      ]),
    },
    items: {
      ...initialItemsState,
      ...entityState([item('i1', 'Apples', 'c-produce'), item('i2', 'Bread', 'c-bakery')]),
    },
    sessions: initialSessionsState,
  });

  it('hides a category excluded from the selected shop, along with its items', () => {
    const groups = selectGroupedPlanList(stateWith('s1') as never);

    expect(groups.map((g) => g.categoryId)).toEqual(['c-produce']);
    expect(groups.flatMap((g) => g.items.map((i) => i.name))).toEqual(['Apples']);
  });

  it('shows every category again when no shop is selected', () => {
    const groups = selectGroupedPlanList(stateWith(null) as never);

    expect(groups.map((g) => g.categoryId)).toEqual(['c-produce', 'c-bakery']);
  });

  const fallbackState = (selectedShopId: string | null) => {
    const state = stateWith(selectedShopId) as Record<string, unknown>;
    return {
      ...state,
      items: {
        ...initialItemsState,
        // Primary Bakery is excluded from shop s1; secondary Produce is not.
        ...entityState([item('i3', 'Cat food', 'c-bakery', ['c-produce'])]),
      },
    };
  };

  it('surfaces an item under its secondary when the shop excludes its primary', () => {
    const groups = selectGroupedPlanList(fallbackState('s1') as never);

    expect(groups.map((g) => g.categoryId)).toEqual(['c-produce']);
    expect(groups[0]!.items.map((i) => i.name)).toEqual(['Cat food']);
  });

  it('uses the primary category when no shop is selected', () => {
    const groups = selectGroupedPlanList(fallbackState(null) as never);

    expect(groups.map((g) => g.categoryId)).toEqual(['c-bakery']);
  });
});
