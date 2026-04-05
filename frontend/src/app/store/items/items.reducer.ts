import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { itemsApiActions } from './items.actions';
import type { Item } from '../../models/item.model';

export interface ItemsState extends EntityState<Item> {
  loaded: boolean;
  /** Items currently in the client-side undo window (checked but not yet committed). */
  pendingUncheckIds: string[];
}

const adapter = createEntityAdapter<Item>();

export const initialItemsState: ItemsState = adapter.getInitialState({
  loaded: false,
  pendingUncheckIds: [],
});

export const itemsReducer = createReducer(
  initialItemsState,

  on(itemsApiActions.fetchActiveListSuccess, (state, { items }) =>
    adapter.setAll(items, { ...state, loaded: true }),
  ),

  on(itemsApiActions.itemStreamUpdated, (state, { changes }) => {
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
