/**
 * Cross-slice derived selectors for the list display.
 * These join data from items + categories + shops + sessions and belong here to
 * avoid circular imports between domain folders.
 */
import { createSelector } from '@ngrx/store';
import { selectCategoriesOrderedGlobally, selectCategoryEntities } from '../categories/categories.selectors';
import { selectShopById } from '../shops/shops.selectors';
import { selectActiveItems, selectAllItems, selectItemEntities } from '../items/items.selectors';
import { selectAllSessions } from '../sessions/sessions.selectors';
import type { Category } from '../../models/category.model';
import type { Item } from '../../models/item.model';
import type { CategoryId, SessionId, ShopId, UserId } from '../../models/ids.model';

export interface CategoryTotals {
  estimated: number | null;     // sum of price for active unchecked items in category
  sessionChecked: number;        // sum of priceSnapshot for checked items this session
}

export interface GroupedListEntry {
  category: Category | null;
  items: Item[];
}

/**
 * Items grouped by primary category, in global category order.
 * Uncategorised items appear last.
 * Used by PlanComponent.
 */
export const selectGroupedPlanList = createSelector(
  selectActiveItems,
  selectCategoriesOrderedGlobally,
  selectCategoryEntities,
  (items, orderedCategories, categoryEntities): GroupedListEntry[] => {
    const grouped = new Map<CategoryId | null, Item[]>();

    for (const item of items) {
      const key = item.primaryCategoryId;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    }

    // Sort items alphabetically within each group
    for (const list of grouped.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    const result: GroupedListEntry[] = [];

    // Categories in global order first
    for (const category of orderedCategories) {
      const catItems = grouped.get(category.id);
      if (catItems?.length) {
        result.push({ category, items: catItems });
      }
    }

    // Uncategorised items last
    const uncategorised = grouped.get(null);
    if (uncategorised?.length) {
      result.push({ category: null, items: uncategorised });
    }

    return result;
  },
);

/**
 * Items grouped by ALL assigned categories (primary + secondary), in shop-specific order
 * with global fallback. Used by ShopComponent.
 *
 * Items appear under every category they belong to.
 */
export const selectGroupedShopList = (shopId: ShopId | null) =>
  createSelector(
    selectActiveItems,
    selectCategoriesOrderedGlobally,
    selectCategoryEntities,
    shopId ? selectShopById(shopId) : createSelector(
      selectCategoriesOrderedGlobally,
      () => null,
    ),
    (items, globalOrder, categoryEntities, shop): GroupedListEntry[] => {
      // Determine display order: shop-specific if available, else global
      const orderedCategoryIds: CategoryId[] =
        shop?.categoryOrder?.length
          ? shop.categoryOrder
          : globalOrder.map((c) => c.id);

      const grouped = new Map<CategoryId, Item[]>();

      for (const item of items) {
        const allCategoryIds = [
          ...(item.primaryCategoryId ? [item.primaryCategoryId] : []),
          ...item.secondaryCategoryIds,
        ];
        for (const catId of allCategoryIds) {
          if (!grouped.has(catId)) grouped.set(catId, []);
          grouped.get(catId)!.push(item);
        }
      }

      // Sort items alphabetically within each group
      for (const list of grouped.values()) {
        list.sort((a, b) => a.name.localeCompare(b.name));
      }

      const result: GroupedListEntry[] = [];

      for (const catId of orderedCategoryIds) {
        const catItems = grouped.get(catId);
        if (catItems?.length) {
          const category = categoryEntities[catId] ?? null;
          result.push({ category, items: catItems });
        }
      }

      // Uncategorised items: items with no categories at all
      const uncategorised = items.filter(
        (i) => !i.primaryCategoryId && i.secondaryCategoryIds.length === 0,
      );
      if (uncategorised.length) {
        uncategorised.sort((a, b) => a.name.localeCompare(b.name));
        result.push({ category: null, items: uncategorised });
      }

      return result;
    },
  );

/**
 * Categories ordered for a specific shop — shop order with global fallback.
 * Used by nav drawer to render category list in correct order.
 */
export const selectOrderedCategoriesForShop = (shopId: ShopId | null) =>
  createSelector(
    selectCategoriesOrderedGlobally,
    selectCategoryEntities,
    shopId ? selectShopById(shopId) : createSelector(
      selectCategoriesOrderedGlobally,
      () => null,
    ),
    (globalOrder, categoryEntities, shop): Category[] => {
      if (!shop?.categoryOrder?.length) return globalOrder;

      const result: Category[] = [];
      for (const catId of shop.categoryOrder) {
        const cat = categoryEntities[catId];
        if (cat) result.push(cat);
      }
      // Append any categories not in the shop's order
      const inOrder = new Set(shop.categoryOrder);
      for (const cat of globalOrder) {
        if (!inOrder.has(cat.id)) result.push(cat);
      }
      return result;
    },
  );

/**
 * Per-category totals for a given session and active items.
 * Returns a map from CategoryId → CategoryTotals.
 * Null category key covers uncategorised items.
 */
export const selectCategoryTotalsForSession = (sessionId: SessionId | null) =>
  createSelector(
    selectActiveItems,
    selectItemEntities,
    selectAllSessions,
    (activeItems, itemEntities, sessions): Map<CategoryId | null, CategoryTotals> => {
      const result = new Map<CategoryId | null, CategoryTotals>();

      // Estimated totals from active (unchecked) items
      for (const item of activeItems) {
        const key = item.primaryCategoryId;
        if (!result.has(key)) {
          result.set(key, { estimated: null, sessionChecked: 0 });
        }
        const entry = result.get(key)!;
        if (item.price !== null) {
          entry.estimated = (entry.estimated ?? 0) + item.price;
        }
      }

      // Session checked totals — look up item category from entity store
      // (items may be removed but still in the entity map)
      if (sessionId) {
        const session = sessions.find((s) => s.id === sessionId);
        if (session) {
          for (const ci of session.checkedItems) {
            if (ci.priceSnapshot === null) continue;
            const item = itemEntities[ci.itemId];
            const key = (item?.primaryCategoryId ?? null) as CategoryId | null;
            if (!result.has(key)) {
              result.set(key, { estimated: null, sessionChecked: 0 });
            }
            result.get(key)!.sessionChecked += ci.priceSnapshot;
          }
        }
      }

      return result;
    },
  );
