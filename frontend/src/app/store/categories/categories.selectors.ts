import { createFeatureSelector, createSelector } from '@ngrx/store';
import { selectAll, selectEntities, initialCategoriesState } from './categories.reducer';
import type { CategoriesState } from './categories.reducer';
import type { CategoryId } from '../../models/ids.model';

export const selectCategoriesState =
  createFeatureSelector<CategoriesState>('categories');

export const selectAllCategories = createSelector(
  selectCategoriesState,
  selectAll,
);

export const selectCategoryEntities = createSelector(
  selectCategoriesState,
  selectEntities,
);

export const selectCategoriesLoaded = createSelector(
  selectCategoriesState,
  (state) => state.loaded,
);

export const selectCategoryById = (id: CategoryId) =>
  createSelector(selectCategoriesState, (state) => state.entities[id]);

/** All categories sorted ascending by globalSortOrder. */
export const selectCategoriesOrderedGlobally = createSelector(
  selectCategoriesState,
  (state) => selectAll(state).sort((a, b) => a.globalSortOrder - b.globalSortOrder),
);
