import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Category } from '../../models/category.model';
import type { CategoryId } from '../../models/ids.model';
import type { EntityChange } from '../../core/stream/change-stream.service';

/** Actions dispatched by UI components and effects. */
export const categoriesActions = createActionGroup({
  source: 'Categories',
  events: {
    'Add Category Requested': props<{ name: string }>(),
    'Rename Category Requested': props<{ id: CategoryId; name: string }>(),
    'Delete Category Requested': props<{ id: CategoryId }>(),
    'Set Global Order Requested': props<{ orderedIds: CategoryId[] }>(),
  },
});

/** Actions dispatched by effects in response to API calls and stream events. */
export const categoriesApiActions = createActionGroup({
  source: 'Categories API',
  events: {
    'Fetch All Categories Success': props<{ categories: Category[] }>(),
    'Category Stream Updated': props<{ changes: EntityChange<Category>[] }>(),
  },
});
