import { createSelector } from '@ngrx/store';
import { selectAllCategories, selectCategoryEntities } from '../categories/categories.selectors';
import { selectShopEntities } from '../shops/shops.selectors';
import { selectSelectedShopId } from '../ui/ui.selectors';
import type { Category } from '../../models/category.model';
import type { CategoryId } from '../../models/ids.model';
import { Dictionary } from '@ngrx/entity';
import type { Shop } from '../../models/shop.model';

/**
 * Every category, ordered for the selected shop. Categories the shop excludes
 * are kept (appended last) — this is the list to use where the user must still
 * be able to reach every category regardless of shop, e.g. the category chips
 * in the item edit sheet.
 *
 * For anything that renders the shopping list, use
 * {@link selectShopAvailableCategories} instead.
 */
export const selectOrderedCategories = createSelector(
  selectAllCategories,
  selectShopEntities,
  selectSelectedShopId,
  (categories, shopEntities, selectedShopId): Category[] => {
    if (!selectedShopId) {
      return categories; // already sorted by globalSortOrder via adapter
    }

    const shop = shopEntities[selectedShopId];
    if (!shop) {
      return categories;
    }

    return orderByShop(categories, shop.categoryOrder);
  },
);

/**
 * Categories available at the selected shop, in that shop's order. A category
 * absent from the shop's `categoryOrder` has been explicitly excluded via
 * "Available in shops…", so it — and every item under it — is dropped from
 * both plan and shop lists while that shop is selected. With no shop selected
 * ("Global") every category is available.
 */
export const selectShopAvailableCategories = createSelector(
  selectAllCategories,
  selectShopEntities,
  selectSelectedShopId,
  (categories, shopEntities, selectedShopId): Category[] => {
    if (!selectedShopId) {
      return categories;
    }

    const shop = shopEntities[selectedShopId];
    if (!shop) {
      return categories;
    }

    const catMap = new Map(categories.map((c) => [c.id, c]));
    const available: Category[] = [];
    for (const id of shop.categoryOrder) {
      const cat = catMap.get(id);
      if (cat) available.push(cat);
    }
    return available;
  },
);

function orderByShop(categories: Category[], categoryOrder: CategoryId[]): Category[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const ordered: Category[] = [];
  const seen = new Set<CategoryId>();

  for (const id of categoryOrder) {
    const cat = catMap.get(id);
    if (cat) {
      ordered.push(cat);
      seen.add(id);
    }
  }

  // Append categories not in the shop's order (sorted by globalSortOrder, which is the input order)
  for (const cat of categories) {
    if (!seen.has(cat.id)) {
      ordered.push(cat);
    }
  }

  return ordered;
}
