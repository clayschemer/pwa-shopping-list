import { createSelector } from '@ngrx/store';
import { selectActiveItems } from '../items/items.selectors';
import { selectOrderedCategories } from './ordered-categories.selectors';
import type { Category } from '../../models/category.model';
import type { Item } from '../../models/item.model';
import type { CategoryId } from '../../models/ids.model';

export interface PlanListGroup {
  categoryId: CategoryId | null; // null = uncategorised bucket
  categoryName: string | null;
  items: Item[];
}

export const UNCATEGORISED_KEY = null;

export const selectGroupedPlanList = createSelector(
  selectActiveItems,
  selectOrderedCategories,
  (items, orderedCategories): PlanListGroup[] => {
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
          items: [...bucket].sort((a, b) => a.name.localeCompare(b.name)),
        });
      }
    }

    if (uncategorised.length > 0) {
      groups.push({
        categoryId: UNCATEGORISED_KEY,
        categoryName: null,
        items: [...uncategorised].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      });
    }

    return groups;
  },
);
