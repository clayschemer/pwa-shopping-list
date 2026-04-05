import type { AccountId, CategoryId, ShopId } from './ids.model';

export interface Shop {
  id: ShopId;
  accountId: AccountId;
  name: string;
  categoryOrder: CategoryId[];
}
