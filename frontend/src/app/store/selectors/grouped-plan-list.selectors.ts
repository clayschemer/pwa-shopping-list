import { createSelector } from '@ngrx/store';
import { selectActiveItems, selectAllItems } from '../items/items.selectors';
import { selectActiveSessions } from '../sessions/sessions.selectors';
import { selectShopAvailableCategories } from './ordered-categories.selectors';
import { selectSelectedShopId } from '../ui/ui.selectors';
import { effectivePrice } from '../../models/item-price.util';
import type { Item } from '../../models/item.model';
import type { CategoryId, ItemId, ShopId } from '../../models/ids.model';

export interface PlanListGroup {
  categoryId: CategoryId | null; // null = uncategorised bucket
  categoryName: string | null;
  categoryColor: string | null;
  items: Item[];
  estTotal: number; // sum of price for active items; 0 means hidden in UI
}

export const UNCATEGORISED_KEY = null;

export const selectGroupedPlanList = createSelector(
  selectActiveItems,
  selectShopAvailableCategories,
  selectSelectedShopId,
  (items, orderedCategories, selectedShopId): PlanListGroup[] =>
    buildGroups(items, orderedCategories, new Set(), selectedShopId),
);

/**
 * Set of item ids that are recorded in any currently-active session's
 * checked-items log. Used by the "Show checked items" plan filter to surface
 * items that have been checked off mid-session but are otherwise hidden
 * from plan view (because `removed=true`).
 */
export const selectActiveSessionCheckedItemIds = createSelector(
  selectActiveSessions,
  (sessions): Set<ItemId> => {
    const ids = new Set<ItemId>();
    for (const s of sessions) {
      for (const c of s.checkedItems) ids.add(c.itemId);
    }
    return ids;
  },
);

/**
 * Grouped plan list that ADDITIONALLY includes session-checked items from
 * any active session, even though those items are `removed=true`. Group
 * totals still reflect only active (un-checked) items, matching the visible
 * sum a user would still expect to spend.
 */
export const selectGroupedPlanListWithChecked = createSelector(
  selectActiveItems,
  selectActiveSessionCheckedItemIds,
  selectAllItems,
  selectShopAvailableCategories,
  selectSelectedShopId,
  (active, checkedIds, all, orderedCategories, selectedShopId): PlanListGroup[] => {
    if (checkedIds.size === 0) return buildGroups(active, orderedCategories, new Set(), selectedShopId);
    const checked = all.filter((i) => checkedIds.has(i.id));
    return buildGroups([...active, ...checked], orderedCategories, checkedIds, selectedShopId);
  },
);

function buildGroups(
  items: Item[],
  orderedCategories: { id: CategoryId; name: string; color: string | null }[],
  excludeFromTotalIds: Set<ItemId> = new Set(),
  shopId: ShopId | null = null,
): PlanListGroup[] {
  const byCategory = new Map<CategoryId, Item[]>();
  const uncategorised: Item[] = [];

  for (const item of items) {
    const catId = item.primaryCategoryId;
    if (catId === null) {
      uncategorised.push(item);
    } else {
      const bucket = byCategory.get(catId) ?? [];
      bucket.push(item);
      byCategory.set(catId, bucket);
    }
  }

  const groups: PlanListGroup[] = [];

  for (const cat of orderedCategories) {
    const bucket = byCategory.get(cat.id);
    if (bucket && bucket.length > 0) {
      groups.push({
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        items: [...bucket].sort((a, b) => a.name.localeCompare(b.name)),
        estTotal: sumPrices(bucket.filter((i) => !excludeFromTotalIds.has(i.id)), shopId),
      });
    }
  }

  if (uncategorised.length > 0) {
    groups.push({
      categoryId: UNCATEGORISED_KEY,
      categoryName: null,
      categoryColor: null,
      items: [...uncategorised].sort((a, b) => a.name.localeCompare(b.name)),
      estTotal: 0,
    });
  }

  return groups;
}

function sumPrices(items: Item[], shopId: ShopId | null = null): number {
  let total = 0;
  for (const item of items) {
    const p = effectivePrice(item, shopId);
    if (p !== null) total += p;
  }
  return total;
}
