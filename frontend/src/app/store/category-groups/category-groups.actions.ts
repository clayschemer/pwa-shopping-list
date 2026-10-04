import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { CategoryGroup } from '../../models/category-group.model';
import type { CategoryGroupId } from '../../models/ids.model';

export const categoryGroupsActions = createActionGroup({
  source: 'Category Groups',
  events: {
    'Category Groups Loaded': props<{ groups: CategoryGroup[] }>(),
    'Category Group Added': props<{ group: CategoryGroup }>(),
    'Category Group Renamed': props<{ group: CategoryGroup }>(),
    'Category Group Deleted': props<{ id: CategoryGroupId }>(),
    'Category Group Changes Received': props<{
      groups: CategoryGroup[];
      removed: CategoryGroupId[];
    }>(),
    /** A write was rejected (offline / flaky connection). `id` is null for creates. */
    'Category Group Save Failed': props<{ id: CategoryGroupId | null }>(),
  },
});

export const categoryGroupsApiActions = createActionGroup({
  source: 'Category Groups API',
  events: {
    'Fetch All Category Groups Requested': emptyProps(),
    'Add Category Group Requested': props<{ name: string }>(),
    'Rename Category Group Requested': props<{ id: CategoryGroupId; name: string }>(),
    'Delete Category Group Requested': props<{ id: CategoryGroupId }>(),
  },
});
