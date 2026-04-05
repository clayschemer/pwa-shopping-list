import { createFeatureSelector, createSelector } from '@ngrx/store';
import { selectAll, selectEntities } from './shops.reducer';
import type { ShopsState } from './shops.reducer';
import type { ShopId, CategoryId } from '../../models/ids.model';

export const selectShopsState = createFeatureSelector<ShopsState>('shops');

export const selectAllShops = createSelector(selectShopsState, selectAll);

export const selectShopEntities = createSelector(selectShopsState, selectEntities);

export const selectShopsLoaded = createSelector(
  selectShopsState,
  (state) => state.loaded,
);

export const selectShopById = (id: ShopId) =>
  createSelector(selectShopsState, (state) => state.entities[id]);

/** Category order for a specific shop. Falls back to empty array if shop not found. */
export const selectCategoryOrderForShop = (shopId: ShopId) =>
  createSelector(
    selectShopsState,
    (state): CategoryId[] => state.entities[shopId]?.categoryOrder ?? [],
  );
