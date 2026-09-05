import { createSelector } from '@ngrx/store';
import { selectItemsLoaded } from '../items/items.selectors';
import { selectCategoriesLoaded } from '../categories/categories.selectors';
import { selectCategoryGroupsLoaded } from '../category-groups/category-groups.selectors';
import { selectShopsLoaded } from '../shops/shops.selectors';

export const selectListDataLoaded = createSelector(
  selectItemsLoaded,
  selectCategoriesLoaded,
  selectCategoryGroupsLoaded,
  selectShopsLoaded,
  (items, categories, categoryGroups, shops) =>
    items && categories && categoryGroups && shops,
);
