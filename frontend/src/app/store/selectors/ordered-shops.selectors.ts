import { createSelector } from '@ngrx/store';
import { selectAllShops } from '../shops/shops.selectors';
import { selectShopOrder } from '../account/account.selectors';
import type { Shop } from '../../models/shop.model';

/**
 * Shops in the user-defined account-wide order. Shops missing from the
 * Account.shopOrder array are appended in their default selectAllShops
 * order (alphabetical via the adapter), keeping newly-created shops
 * visible until the user explicitly places them.
 */
export const selectOrderedShops = createSelector(
  selectAllShops,
  selectShopOrder,
  (shops, order): Shop[] => {
    if (order.length === 0) return shops;
    const map = new Map(shops.map((s) => [s.id, s]));
    const ordered: Shop[] = [];
    const seen = new Set<string>();
    for (const id of order) {
      const s = map.get(id);
      if (s) {
        ordered.push(s);
        seen.add(id);
      }
    }
    for (const s of shops) {
      if (!seen.has(s.id)) ordered.push(s);
    }
    return ordered;
  },
);
