import { createFeatureSelector, createSelector } from '@ngrx/store';
import { itemsAdapter, ItemsState } from './items.reducer';

export const selectItemsState = createFeatureSelector<ItemsState>('items');

const { selectAll, selectEntities } = itemsAdapter.getSelectors();

export const selectAllItems = createSelector(selectItemsState, selectAll);

export const selectItemEntities = createSelector(selectItemsState, selectEntities);

export const selectActiveItems = createSelector(selectAllItems, (items) =>
  items.filter((i) => !i.removed),
);

export const selectItemsLoaded = createSelector(
  selectItemsState,
  (state) => state.loaded,
);

export const selectPendingChecks = createSelector(
  selectItemsState,
  (state) => state.pendingChecks,
);

export const selectVisibleActiveItems = createSelector(
  selectAllItems,
  selectPendingChecks,
  (items, pending) =>
    items.filter((i) => !i.removed || pending[i.id] !== undefined),
);
