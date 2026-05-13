import type { AccountId, ItemId, SessionId, ShopId, UserId } from './ids.model';

export interface SessionCheckedItem {
  itemId: ItemId;
  checkedBy: UserId;
  checkedAt: number;
  priceSnapshot: number | null;
  priceQuantitySnapshot: number | null;
  priceUnitSnapshot: string | null;
  nameSnapshot: string | null;
}

export interface Session {
  id: SessionId;
  accountId: AccountId;
  shopId: ShopId | null;
  participants: UserId[];
  startedBy: UserId;
  startedAt: number;
  completedAt: number | null;
  checkedItems: SessionCheckedItem[];
}
