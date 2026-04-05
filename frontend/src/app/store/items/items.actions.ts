import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Item } from '../../models/item.model';
import type { ItemId, CategoryId, SessionId } from '../../models/ids.model';
import type { EntityChange } from '../../core/stream/change-stream.service';

export const itemsActions = createActionGroup({
  source: 'Items',
  events: {
    'Add Item Requested': props<{
      name: string;
      description: string | null;
      quantity: number | null;
      unit: string | null;
      primaryCategoryId: CategoryId | null;
      secondaryCategoryIds: CategoryId[];
    }>(),
    'Update Item Requested': props<{
      id: ItemId;
      name: string;
      description: string | null;
      quantity: number | null;
      unit: string | null;
      primaryCategoryId: CategoryId | null;
      secondaryCategoryIds: CategoryId[];
    }>(),
    'Remove Item Requested': props<{ id: ItemId }>(),
    'Check Item Requested': props<{ id: ItemId; sessionId: SessionId }>(),
    'Uncheck Item Requested': props<{ id: ItemId; sessionId: SessionId }>(),
    'Set Item Price Requested': props<{
      id: ItemId;
      price: number | null;
      priceQuantity: number | null;
      priceUnit: string | null;
    }>(),
  },
});

export const itemsApiActions = createActionGroup({
  source: 'Items API',
  events: {
    'Fetch Active List Success': props<{ items: Item[] }>(),
    'Item Stream Updated': props<{ changes: EntityChange<Item>[] }>(),
    'Check Conflict': props<{ id: ItemId }>(),
  },
});
