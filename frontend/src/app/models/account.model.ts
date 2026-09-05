import type { AccountId, ShopId } from './ids.model';

export interface AiConfig {
  provider: string;
  priceLookupShopOrder: ShopId[];
  autoAddEnabled: boolean;
  /** Days before an active item's price is considered stale. Default 90. Stored in Firestore so both users on an account share the same threshold. */
  stalePriceDays: number;
}

export interface Account {
  id: AccountId;
  name: string;
  /** User-defined order of shops shown across the app. Empty = insertion order. */
  shopOrder: ShopId[];
  aiConfig: AiConfig | null;
}
