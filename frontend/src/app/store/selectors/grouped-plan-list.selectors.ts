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

  // Layout position of every category the selected shop stocks. With no shop
  // selected this is simply every category in global order.
  const layoutIndex = new Map<CategoryId, number>();
  orderedCategories.forEach((cat, i) => layoutIndex.set(cat.id, i));

  for (const item of items) {
    const catId = resolveCategory(item, layoutIndex);
    if (catId !== null) {
      const bucket = byCategory.get(catId) ?? [];
      bucket.push(item);
      byCategory.set(catId, bucket);
      continue;
    }
    // No stocked category resolved. An item with no assignments at all belongs
    // in the uncategorised bucket; one whose categories are all excluded from
    // the selected shop stays hidden while that shop is selected.
    if (item.primaryCategoryId === null && item.secondaryCategoryIds.length === 0) {
      uncategorised.push(item);
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

/**
 * The single category a plan-mode item is listed under: its primary category
 * when the selected shop stocks it, otherwise the first of its secondary
 * categories the shop does stock, resolved in shop layout order rather than
 * assignment order (`secondaryCategoryIds` order is arbitrary). Returns null
 * when the shop stocks none of the item's categories — unlike shop mode, plan
 * mode never lists an item twice.
 */
function resolveCategory(
  item: Item,
  layoutIndex: Map<CategoryId, number>,
): CategoryId | null {
  const primary = item.primaryCategoryId;
  if (primary !== null && layoutIndex.has(primary)) return primary;

  let fallback: CategoryId | null = null;
  let fallbackIndex = Infinity;
  for (const secondary of item.secondaryCategoryIds) {
    const index = layoutIndex.get(secondary);
    if (index !== undefined && index < fallbackIndex) {
      fallback = secondary;
      fallbackIndex = index;
    }
  }
  return fallback;
}

function sumPrices(items: Item[], shopId: ShopId | null = null): number {
  let total = 0;
  for (const item of items) {
    const p = effectivePrice(item, shopId);
    if (p !== null) total += p;
  }
  return total;
}
