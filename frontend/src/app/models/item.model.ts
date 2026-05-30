import type { AccountId, CategoryId, ItemId, ShopId } from './ids.model';

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
  priceShopId: ShopId | null;
  priceUpdatedAt: number | null;
  priceAttemptedAt: number | null;  // set by pipeline on every attempt; null = never tried
  // Typical size of one unit of this item. Used to bridge pcs <-> mass/volume
  // when the user lists by piece but the shelf is priced by weight (e.g. lime).
  // Pre-fillable by the pipeline; once non-null the pipeline does not overwrite it,
  // so user edits stick. Clear both fields to let the pipeline re-estimate.
  sizePerPieceQuantity: number | null;
  sizePerPieceUnit: string | null;
  purchaseCount: number;
}
