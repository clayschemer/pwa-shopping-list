import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Shop } from '../../models/shop.model';
import type { CategoryId, ShopId } from '../../models/ids.model';

export const shopsActions = createActionGroup({
  source: 'Shops',
  events: {
    'Shops Loaded': props<{ shops: Shop[] }>(),
    'Shop Added': props<{ shop: Shop }>(),
    'Shop Renamed': props<{ shop: Shop }>(),
    'Shop Deleted': props<{ id: ShopId }>(),
    'Shop Category Order Set': props<{ shopId: ShopId; orderedIds: CategoryId[] }>(),
    'Shop Price Url Set': props<{ id: ShopId; url: string | null }>(),
    'Shop Changes Received': props<{ shops: Shop[]; removed: ShopId[] }>(),
  },
});

export const shopsApiActions = createActionGroup({
  source: 'Shops API',
  events: {
    'Fetch All Shops Requested': emptyProps(),
    'Add Shop Requested': props<{ name: string }>(),
    'Rename Shop Requested': props<{ id: ShopId; name: string }>(),
    'Delete Shop Requested': props<{ id: ShopId }>(),
    'Set Shop Category Order Requested': props<{ shopId: ShopId; orderedIds: CategoryId[] }>(),
    'Set Shop Price Url Requested': props<{ id: ShopId; url: string | null }>(),
  },
});
