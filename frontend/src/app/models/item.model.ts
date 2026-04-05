import type { AccountId, CategoryId, ItemId } from './ids.model';

export interface Item {
  id: ItemId;
  accountId: AccountId;
  name: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  primaryCategoryId: CategoryId | null;
  secondaryCategoryIds: CategoryId[];
  removed: boolean;
  removedAt: number | null;
  addedBy: 'user' | 'ai';
  aiMotivation: string | null;
  price: number | null;
  priceQuantity: number | null;
  priceUnit: string | null;
  priceUpdatedAt: number | null;
  purchaseCount: number;
}
