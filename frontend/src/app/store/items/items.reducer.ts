import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { itemsActions } from './items.actions';
import type { Item } from '../../models/item.model';
import type { ItemId, SessionId } from '../../models/ids.model';

export const itemsAdapter = createEntityAdapter<Item>({
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

export interface PendingCheck {
  sessionId: SessionId;
  startedAt: number;
}

export interface ItemsState extends EntityState<Item> {
  loaded: boolean;
  pendingChecks: Record<ItemId, PendingCheck>;
}

export const initialItemsState: ItemsState = itemsAdapter.getInitialState({
  loaded: false,
  pendingChecks: {} as Record<ItemId, PendingCheck>,
});

export const itemsReducer = createReducer(
  initialItemsState,

  on(itemsActions.itemsLoaded, (state, { items }) =>
    itemsAdapter.setAll(items, { ...state, loaded: true }),
  ),

  on(itemsActions.itemAdded, (state, { item }) =>
    itemsAdapter.addOne(item, state),
  ),

  on(itemsActions.itemUpdated, (state, { item }) =>
    itemsAdapter.upsertOne(item, state),
  ),

  on(itemsActions.itemRemoved, (state, { id }) =>
    itemsAdapter.updateOne(
      { id, changes: { removed: true, removedAt: Date.now() } },
      state,
    ),
  ),

  on(itemsActions.itemChecked, (state, { item }) => {
    const { [item.id]: _pending, ...remaining } = state.pendingChecks;
    return itemsAdapter.upsertOne(item, { ...state, pendingChecks: remaining });
  }),

  on(itemsActions.checkItemPending, (state, { id, sessionId }) => ({
    ...state,
    pendingChecks: {
      ...state.pendingChecks,
      [id]: { sessionId, startedAt: Date.now() },
    },
  })),

  on(itemsActions.checkItemUndoneDuringWindow, (state, { id }) => {
    const { [id]: _, ...remaining } = state.pendingChecks;
    return { ...state, pendingChecks: remaining };
  }),

  on(itemsActions.itemCheckConflict, (state, { id }) => {
    const { [id]: _, ...remaining } = state.pendingChecks;
    return { ...state, pendingChecks: remaining };
  }),

  on(itemsActions.itemUnchecked, (state, { id }) =>
    itemsAdapter.updateOne(
      { id, changes: { removed: false, removedAt: null } },
      state,
    ),
  ),

  on(itemsActions.itemChangesReceived, (state, { items, removed }) => {
    const afterRemove = itemsAdapter.removeMany(removed, state);
    return itemsAdapter.upsertMany(items, afterRemove);
  }),
);
