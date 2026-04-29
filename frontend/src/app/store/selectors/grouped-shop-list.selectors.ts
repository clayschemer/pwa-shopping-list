import { createSelector } from '@ngrx/store';
import { selectVisibleActiveItems } from '../items/items.selectors';
import { selectOrderedCategories } from './ordered-categories.selectors';
import { selectActiveSessionForCurrentShop } from '../sessions/sessions.selectors';
import { selectShopEntities } from '../shops/shops.selectors';
import { selectSelectedShopId } from '../ui/ui.selectors';
import type { Item } from '../../models/item.model';
import type { CategoryId } from '../../models/ids.model';

export interface ShopListGroup {
  categoryId: CategoryId | null; // null = uncategorised bucket
  categoryName: string | null;
  categoryColor: string | null;
  items: Item[];
  estTotal: number;
  sessionCheckedTotal: number;
}

export const selectGroupedShopList = createSelector(
  selectVisibleActiveItems,
  selectOrderedCategories,
  selectActiveSessionForCurrentShop,
  selectShopEntities,
  selectSelectedShopId,
  (items, categories, activeSession, shopEntities, selectedShopId): ShopListGroup[] => {
    const shop = selectedShopId ? shopEntities[selectedShopId] : null;
    const includedCategoryIds = shop
      ? new Set(shop.categoryOrder)
      : new Set(categories.map((c) => c.id));

    const uncategorised: Item[] = [];
    const byCategory = new Map<CategoryId, Item[]>();

    for (const item of items) {
      const assigned: (CategoryId | null)[] = [];
      if (item.primaryCategoryId) assigned.push(item.primaryCategoryId);
      for (const sid of item.secondaryCategoryIds) {
        if (!assigned.includes(sid)) assigned.push(sid);
      }
      if (assigned.length === 0) {
        uncategorised.push(item);
        continue;
      }
      for (const catId of assigned) {
        if (catId === null) continue;
        if (!includedCategoryIds.has(catId)) continue;
        const bucket = byCategory.get(catId) ?? [];
        bucket.push(item);
        byCategory.set(catId, bucket);
      }
    }

    const sessionItemIds = new Set(
      activeSession?.checkedItems.map((c) => c.itemId) ?? [],
    );
    const sessionItemPrices = new Map(
      activeSession?.checkedItems.map((c) => [c.itemId, c.priceSnapshot]) ?? [],
    );

    const groups: ShopListGroup[] = [];

    for (const cat of categories) {
      if (!includedCategoryIds.has(cat.id)) continue;
      const bucket = byCategory.get(cat.id);
      if (!bucket || bucket.length === 0) continue;

      const sorted = [...bucket].sort((a, b) => a.name.localeCompare(b.name));
      const estTotal = sorted
        .filter((i) => !i.removed && i.price !== null)
        .reduce((acc, i) => acc + (i.price ?? 0), 0);
      const sessionCheckedTotal = sorted
        .filter((i) => sessionItemIds.has(i.id))
        .reduce((acc, i) => acc + (sessionItemPrices.get(i.id) ?? 0), 0);

      groups.push({
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        items: sorted,
        estTotal,
        sessionCheckedTotal,
      });
    }

    if (uncategorised.length > 0) {
      const sorted = [...uncategorised].sort((a, b) => a.name.localeCompare(b.name));
      groups.push({
        categoryId: null,
        categoryName: null,
        categoryColor: null,
        items: sorted,
        estTotal: sorted
          .filter((i) => !i.removed && i.price !== null)
          .reduce((acc, i) => acc + (i.price ?? 0), 0),
        sessionCheckedTotal: sorted
          .filter((i) => sessionItemIds.has(i.id))
          .reduce((acc, i) => acc + (sessionItemPrices.get(i.id) ?? 0), 0),
      });
    }

    return groups;
  },
);

export const selectActiveSessionTotal = createSelector(
  selectActiveSessionForCurrentShop,
  (session) => {
    if (!session) return 0;
    return session.checkedItems.reduce(
      (acc, c) => acc + (c.priceSnapshot ?? 0),
      0,
    );
  },
);
