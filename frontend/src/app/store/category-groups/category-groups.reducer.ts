import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { categoryGroupsActions } from './category-groups.actions';
import type { CategoryGroup } from '../../models/category-group.model';

/** Groups carry no user-defined order — the chip row lists them by name. */
export const categoryGroupsAdapter = createEntityAdapter<CategoryGroup>({
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

export interface CategoryGroupsState extends EntityState<CategoryGroup> {
  loaded: boolean;
}

export const initialCategoryGroupsState: CategoryGroupsState =
  categoryGroupsAdapter.getInitialState({ loaded: false });

export const categoryGroupsReducer = createReducer(
  initialCategoryGroupsState,

  on(categoryGroupsActions.categoryGroupsLoaded, (state, { groups }) =>
    categoryGroupsAdapter.setAll(groups, { ...state, loaded: true }),
  ),

  on(categoryGroupsActions.categoryGroupAdded, (state, { group }) =>
    categoryGroupsAdapter.addOne(group, state),
  ),

  on(categoryGroupsActions.categoryGroupRenamed, (state, { group }) =>
    categoryGroupsAdapter.upsertOne(group, state),
  ),

  on(categoryGroupsActions.categoryGroupDeleted, (state, { id }) =>
    categoryGroupsAdapter.removeOne(id, state),
  ),

  on(categoryGroupsActions.categoryGroupChangesReceived, (state, { groups, removed }) => {
    const afterRemove = categoryGroupsAdapter.removeMany(removed, state);
    return categoryGroupsAdapter.upsertMany(groups, afterRemove);
  }),
);
