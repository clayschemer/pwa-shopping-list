import { createFeatureSelector, createSelector } from '@ngrx/store';
import { shopsAdapter, ShopsState } from './shops.reducer';

export const selectShopsState = createFeatureSelector<ShopsState>('shops');

const { selectAll, selectEntities } = shopsAdapter.getSelectors();

export const selectAllShops = createSelector(selectShopsState, selectAll);

export const selectShopEntities = createSelector(selectShopsState, selectEntities);

export const selectShopsLoaded = createSelector(
  selectShopsState,
  (state) => state.loaded,
);
