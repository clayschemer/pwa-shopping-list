import { createActionGroup, props } from '@ngrx/store';
import type { Shop } from '../../models/shop.model';
import type { ShopId, CategoryId } from '../../models/ids.model';
import type { EntityChange } from '../../core/stream/change-stream.service';

export const shopsActions = createActionGroup({
  source: 'Shops',
  events: {
    'Add Shop Requested': props<{ name: string }>(),
    'Rename Shop Requested': props<{ id: ShopId; name: string }>(),
    'Delete Shop Requested': props<{ id: ShopId }>(),
    'Set Shop Category Order Requested': props<{ shopId: ShopId; orderedIds: CategoryId[] }>(),
  },
});

export const shopsApiActions = createActionGroup({
  source: 'Shops API',
  events: {
    'Fetch All Shops Success': props<{ shops: Shop[] }>(),
    'Shop Stream Updated': props<{ changes: EntityChange<Shop>[] }>(),
  },
});
