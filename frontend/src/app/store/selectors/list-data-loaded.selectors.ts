import { createSelector } from '@ngrx/store';
import { selectItemsLoaded } from '../items/items.selectors';
import { selectCategoriesLoaded } from '../categories/categories.selectors';
import { selectShopsLoaded } from '../shops/shops.selectors';

export const selectListDataLoaded = createSelector(
  selectItemsLoaded,
  selectCategoriesLoaded,
  selectShopsLoaded,
  (items, categories, shops) => items && categories && shops,
);
