import { createFeatureSelector, createSelector } from '@ngrx/store';
import { selectAll, selectEntities } from './items.reducer';
import type { ItemsState } from './items.reducer';
import type { ItemId, CategoryId } from '../../models/ids.model';

export const selectItemsState = createFeatureSelector<ItemsState>('items');

export const selectAllItems = createSelector(selectItemsState, selectAll);

export const selectItemEntities = createSelector(selectItemsState, selectEntities);

export const selectItemsLoaded = createSelector(
  selectItemsState,
  (state) => state.loaded,
);

export const selectItemById = (id: ItemId) =>
  createSelector(selectItemsState, (state) => state.entities[id]);

/** Active (non-removed) items only. */
export const selectActiveItems = createSelector(
  selectAllItems,
  (items) => items.filter((i) => !i.removed),
);

/**
 * Active items grouped by their primaryCategoryId.
 * Items with no primary category are keyed to null.
 */
export const selectActiveItemsByCategory = createSelector(
  selectActiveItems,
  (items): Map<CategoryId | null, typeof items> => {
    const map = new Map<CategoryId | null, typeof items>();
    for (const item of items) {
      const key = item.primaryCategoryId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  },
);
