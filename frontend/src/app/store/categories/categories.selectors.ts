import { createFeatureSelector, createSelector } from '@ngrx/store';
import { categoriesAdapter, CategoriesState } from './categories.reducer';

export const selectCategoriesState = createFeatureSelector<CategoriesState>('categories');

const { selectAll, selectEntities } = categoriesAdapter.getSelectors();

export const selectAllCategories = createSelector(selectCategoriesState, selectAll);

export const selectCategoryEntities = createSelector(selectCategoriesState, selectEntities);

export const selectCategoriesLoaded = createSelector(
  selectCategoriesState,
  (state) => state.loaded,
);
