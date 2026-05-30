import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { shopsActions } from './shops.actions';
import type { Shop } from '../../models/shop.model';

export const shopsAdapter = createEntityAdapter<Shop>();

export interface ShopsState extends EntityState<Shop> {
  loaded: boolean;
}

export const initialShopsState: ShopsState = shopsAdapter.getInitialState({
  loaded: false,
});

export const shopsReducer = createReducer(
  initialShopsState,

  on(shopsActions.shopsLoaded, (state, { shops }) =>
    shopsAdapter.setAll(shops, { ...state, loaded: true }),
  ),

  on(shopsActions.shopAdded, (state, { shop }) =>
    shopsAdapter.addOne(shop, state),
  ),

  on(shopsActions.shopRenamed, (state, { shop }) =>
    shopsAdapter.upsertOne(shop, state),
  ),

  on(shopsActions.shopDeleted, (state, { id }) =>
    shopsAdapter.removeOne(id, state),
  ),

  on(shopsActions.shopCategoryOrderSet, (state, { shopId, orderedIds }) =>
    shopsAdapter.updateOne({ id: shopId, changes: { categoryOrder: orderedIds } }, state),
  ),

  on(shopsActions.shopPriceUrlSet, (state, { id, url }) =>
    shopsAdapter.updateOne({ id, changes: { priceSearchUrl: url } }, state),
  ),

  on(shopsActions.shopChangesReceived, (state, { shops, removed }) => {
    const afterRemove = shopsAdapter.removeMany(removed, state);
    return shopsAdapter.upsertMany(shops, afterRemove);
  }),
);
