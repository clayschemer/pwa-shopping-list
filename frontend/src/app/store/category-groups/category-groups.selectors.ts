import { createFeatureSelector, createSelector } from '@ngrx/store';
import { categoryGroupsAdapter, CategoryGroupsState } from './category-groups.reducer';

export const selectCategoryGroupsState =
  createFeatureSelector<CategoryGroupsState>('categoryGroups');

const { selectAll, selectEntities } = categoryGroupsAdapter.getSelectors();

export const selectAllCategoryGroups = createSelector(
  selectCategoryGroupsState,
  selectAll,
);

export const selectCategoryGroupEntities = createSelector(
  selectCategoryGroupsState,
  selectEntities,
);

export const selectCategoryGroupsLoaded = createSelector(
  selectCategoryGroupsState,
  (state) => state.loaded,
);
