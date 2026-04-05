import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { shopsApiActions } from './shops.actions';
import type { Shop } from '../../models/shop.model';

export interface ShopsState extends EntityState<Shop> {
  loaded: boolean;
}

const adapter = createEntityAdapter<Shop>();

export const initialShopsState: ShopsState = adapter.getInitialState({
  loaded: false,
});

export const shopsReducer = createReducer(
  initialShopsState,

  on(shopsApiActions.fetchAllShopsSuccess, (state, { shops }) =>
    adapter.setAll(shops, { ...state, loaded: true }),
  ),

  on(shopsApiActions.shopStreamUpdated, (state, { changes }) => {
    let s = state;
    for (const change of changes) {
      if (change.changeType === 'removed') {
        s = adapter.removeOne(change.entity.id, s);
      } else {
        s = adapter.upsertOne(change.entity, s);
      }
    }
    return s;
  }),
);

export const { selectAll, selectEntities, selectIds, selectTotal } =
  adapter.getSelectors();
