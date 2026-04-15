import { createSelector } from '@ngrx/store';
import { selectAllCategories, selectCategoryEntities } from '../categories/categories.selectors';
import { selectShopEntities } from '../shops/shops.selectors';
import { selectSelectedShopId } from '../ui/ui.selectors';
import type { Category } from '../../models/category.model';
import type { CategoryId } from '../../models/ids.model';
import { Dictionary } from '@ngrx/entity';
import type { Shop } from '../../models/shop.model';

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
