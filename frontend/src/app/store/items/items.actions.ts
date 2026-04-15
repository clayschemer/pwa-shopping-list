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
    'Item Check Conflict': props<{ id: ItemId }>(),
    'Item Name Conflict': props<{ name: string }>(),
    'Item Changes Received': props<{ items: Item[]; removed: ItemId[] }>(),
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
  },
});
