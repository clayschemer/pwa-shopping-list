import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { itemsActions, itemsApiActions } from './items.actions';
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
  // Check writes currently in flight (tap → commit). Cleared on success,
  // failure, or conflict.
  pendingChecks: Record<ItemId, PendingCheck>;
  // Committed checks still inside the "has been checked" undo window —
  // the item lingers on the checking user's list until the window elapses.
  // Client-local by design: the other user sees the item leave immediately.
  recentChecks: Record<ItemId, number>;
}

export const initialItemsState: ItemsState = itemsAdapter.getInitialState({
  loaded: false,
  pendingChecks: {} as Record<ItemId, PendingCheck>,
  recentChecks: {} as Record<ItemId, number>,
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
    return itemsAdapter.upsertOne(item, {
      ...state,
      pendingChecks: remaining,
      recentChecks: { ...state.recentChecks, [item.id]: Date.now() },
    });
  }),

  on(itemsApiActions.checkItemRequested, (state, { id, sessionId }) => ({
    ...state,
    pendingChecks: {
      ...state.pendingChecks,
      [id]: { sessionId, startedAt: Date.now() },
    },
  })),

  on(itemsActions.checkUndoWindowElapsed, (state, { id }) => {
    const { [id]: _, ...remaining } = state.recentChecks;
    return { ...state, recentChecks: remaining };
  }),

  on(itemsActions.itemCheckConflict, (state, { id }) => {
    const { [id]: _, ...remaining } = state.pendingChecks;
    return { ...state, pendingChecks: remaining };
  }),

  // Roll back the optimistic pending state when the commit write fails, so
  // the item returns to its unchecked appearance and can be re-tapped.
  on(itemsActions.itemCheckFailed, (state, { id }) => {
    const { [id]: _, ...remaining } = state.pendingChecks;
    return { ...state, pendingChecks: remaining };
  }),

  on(itemsActions.itemUnchecked, (state, { id }) => {
    const { [id]: _, ...remaining } = state.recentChecks;
    return itemsAdapter.updateOne(
      { id, changes: { removed: false, removedAt: null } },
      { ...state, recentChecks: remaining },
    );
  }),

  on(itemsActions.itemChangesReceived, (state, { items, removed }) => {
    const afterRemove = itemsAdapter.removeMany(removed, state);
    return itemsAdapter.upsertMany(items, afterRemove);
  }),
);
