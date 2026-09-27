import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Item } from '../../models/item.model';
import type { CategoryId, ItemId, SessionId } from '../../models/ids.model';

export interface ItemInputPayload {
  name: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  primaryCategoryId: CategoryId | null;
  secondaryCategoryIds: CategoryId[];
  sizePerPieceQuantity: number | null;
  sizePerPieceUnit: string | null;
}

export const itemsActions = createActionGroup({
  source: 'Items',
  events: {
    'Items Loaded': props<{ items: Item[] }>(),
    'Item Added': props<{ item: Item }>(),
    'Item Updated': props<{ item: Item }>(),
    'Item Removed': props<{ id: ItemId }>(),
    'Item Checked': props<{ item: Item }>(),
    'Item Unchecked': props<{ id: ItemId }>(),
    // The committed check's "has been checked" undo window has ended —
    // the item stops lingering on the checking user's list.
    'Check Undo Window Elapsed': props<{ id: ItemId }>(),
    'Item Check Conflict': props<{ id: ItemId }>(),
    'Item Name Conflict': props<{ name: string }>(),
    // Failure events for rejected API calls (offline / flaky connectivity).
    // `id` is null when the failed operation was an add (no id exists yet).
    'Item Save Failed': props<{ id: ItemId | null }>(),
    'Item Check Failed': props<{ id: ItemId }>(),
    'Item Uncheck Failed': props<{ id: ItemId }>(),
    'Item Changes Received': props<{ items: Item[]; removed: ItemId[] }>(),
  },
});

/**
 * The recurring-item evaluation's own progress. Separate from `itemsActions`
 * because these say nothing about any individual item — they bracket a batch of
 * reads that the user is entitled to see happening, since it runs unprompted on
 * app open and spends a noticeable share of the day's read budget.
 */
export const autoAddActions = createActionGroup({
  source: 'Auto Add',
  events: {
    'Sync Started': emptyProps(),
    'Sync Finished': emptyProps(),
  },
});

export const itemsApiActions = createActionGroup({
  source: 'Items API',
  events: {
    'Fetch Active List Requested': emptyProps(),
    'Add Item Requested': props<ItemInputPayload>(),
    'Update Item Requested': props<ItemInputPayload & { id: ItemId }>(),
    'Remove Item Requested': props<{ id: ItemId }>(),
    'Check Item Requested': props<{ id: ItemId; sessionId: SessionId }>(),
    'Uncheck Item Requested': props<{ id: ItemId; sessionId: SessionId }>(),
    'Submit Price Feedback Requested': props<{ id: ItemId; reason: string }>(),
    'Submit Price Feedback Succeeded': props<{ id: ItemId }>(),
  },
});
