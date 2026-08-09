import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { categoriesActions } from './categories.actions';
import { categoryGroupsActions } from '../category-groups/category-groups.actions';
import type { Category } from '../../models/category.model';

export const categoriesAdapter = createEntityAdapter<Category>({
  sortComparer: (a, b) => a.globalSortOrder - b.globalSortOrder,
});

export interface CategoriesState extends EntityState<Category> {
  loaded: boolean;
}

export const initialCategoriesState: CategoriesState = categoriesAdapter.getInitialState({
  loaded: false,
});

export const categoriesReducer = createReducer(
  initialCategoriesState,

  on(categoriesActions.categoriesLoaded, (state, { categories }) =>
    categoriesAdapter.setAll(categories, { ...state, loaded: true }),
  ),

  on(categoriesActions.categoryAdded, (state, { category }) =>
    categoriesAdapter.addOne(category, state),
  ),

  on(categoriesActions.categoryRenamed, (state, { category }) =>
    categoriesAdapter.upsertOne(category, state),
  ),

  on(categoriesActions.categoryDeleted, (state, { id }) =>
    categoriesAdapter.removeOne(id, state),
  ),

  on(categoriesActions.globalCategoryOrderSet, (state, { orderedIds }) => {
    const updates = orderedIds
      .map((id, index) => ({ id, changes: { globalSortOrder: index } }))
      .filter((u) => !!state.entities[u.id]);
    return categoriesAdapter.updateMany(updates, state);
  }),

  on(categoriesActions.categoryChangesReceived, (state, { categories, removed }) => {
    const afterRemove = categoriesAdapter.removeMany(removed, state);
    return categoriesAdapter.upsertMany(categories, afterRemove);
  }),

  on(categoriesActions.categoriesAddedToGroup, (state, { ids, groupId }) =>
    categoriesAdapter.updateMany(
      ids
        .map((id) => state.entities[id])
        .filter((c): c is Category => !!c && !c.groupIds.includes(groupId))
        .map((c) => ({ id: c.id, changes: { groupIds: [...c.groupIds, groupId] } })),
      state,
    ),
  ),

  on(categoriesActions.categoriesRemovedFromGroup, (state, { ids, groupId }) =>
    categoriesAdapter.updateMany(
      ids
        .map((id) => state.entities[id])
        .filter((c): c is Category => !!c && c.groupIds.includes(groupId))
        .map((c) => ({
          id: c.id,
          changes: { groupIds: c.groupIds.filter((g) => g !== groupId) },
        })),
      state,
    ),
  ),

  // Deleting a group detaches it from its members server-side as well, but the
  // categories slice must not wait for that stream to land or the UI keeps
  // showing a caption for a group that no longer exists.
  on(categoryGroupsActions.categoryGroupDeleted, (state, { id }) =>
    categoriesAdapter.updateMany(
      Object.values(state.entities)
        .filter((c): c is Category => !!c && c.groupIds.includes(id))
        .map((c) => ({
          id: c.id,
          changes: { groupIds: c.groupIds.filter((g) => g !== id) },
        })),
      state,
    ),
  ),
);
