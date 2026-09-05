import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Category } from '../../models/category.model';
import type { CategoryGroupId, CategoryId } from '../../models/ids.model';

export const categoriesActions = createActionGroup({
  source: 'Categories',
  events: {
    'Categories Loaded': props<{ categories: Category[] }>(),
    'Category Added': props<{ category: Category }>(),
    'Category Renamed': props<{ category: Category }>(),
    'Category Deleted': props<{ id: CategoryId }>(),
    'Global Category Order Set': props<{ orderedIds: CategoryId[] }>(),
    'Category Changes Received': props<{ categories: Category[]; removed: CategoryId[] }>(),
    'Categories Added To Group': props<{ ids: CategoryId[]; groupId: CategoryGroupId }>(),
    'Categories Removed From Group': props<{
      ids: CategoryId[];
      groupId: CategoryGroupId;
    }>(),
    /** A write was rejected (offline / flaky connection). `id` is null for creates and bulk order writes. */
    'Category Save Failed': props<{ id: CategoryId | null }>(),
  },
});

export const categoriesApiActions = createActionGroup({
  source: 'Categories API',
  events: {
    'Fetch All Categories Requested': emptyProps(),
    'Add Category Requested': props<{ name: string; color: string | null }>(),
    'Rename Category Requested': props<{ id: CategoryId; name: string; color: string | null }>(),
    'Delete Category Requested': props<{ id: CategoryId }>(),
    'Set Global Category Order Requested': props<{ orderedIds: CategoryId[] }>(),
    'Add Categories To Group Requested': props<{
      ids: CategoryId[];
      groupId: CategoryGroupId;
    }>(),
    'Remove Categories From Group Requested': props<{
      ids: CategoryId[];
      groupId: CategoryGroupId;
    }>(),
  },
});
