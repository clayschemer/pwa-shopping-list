import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import type { Shop } from '../../models/shop.model';
import type { CategoryId, AccountId, ShopId } from '../../models/ids.model';
import type { NameConflictError, NotFoundError } from '../../models/errors.model';

@Injectable({ providedIn: 'root' })
export class ShopApiService {
  async fetchAllShops(): Promise<Shop[]> {
    // Stub: return mock shops
    return [
      {
        id: 'shop-tesco' as ShopId,
        accountId: '' as AccountId,
        name: 'Tesco',
        categoryOrder: ['cat-produce', 'cat-dairy', 'cat-bakery', 'cat-frozen', 'cat-drinks'] as CategoryId[],
      },
      {
        id: 'shop-lidl' as ShopId,
        accountId: '' as AccountId,
        name: 'Lidl',
        categoryOrder: ['cat-bakery', 'cat-produce', 'cat-frozen', 'cat-dairy', 'cat-drinks'] as CategoryId[],
      },
    ];
  }

  async addShop(name: string): Promise<Shop | NameConflictError> {
    // Stub: return mock shop
    return {
      id: `shop-${name.toLowerCase().replace(/\s+/g, '-')}` as ShopId,
      accountId: '' as AccountId,
      name,
      categoryOrder: [],
    };
  }

  async renameShop(id: ShopId, name: string): Promise<void | NotFoundError | NameConflictError> {
    // Stub: no-op
  }

  async deleteShop(id: ShopId): Promise<void | NotFoundError> {
    // Stub: no-op
  }

  async setShopCategoryOrder(shopId: ShopId, orderedIds: CategoryId[]): Promise<void | NotFoundError> {
    // Stub: no-op
  }

  shopChanges$(): Observable<never> {
    // Stub: no emissions until Firebase implementation
    return EMPTY;
  }
}
