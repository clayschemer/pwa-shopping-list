import type { AccountId, ShopId } from './ids.model';

export interface AiConfig {
  provider: string;
  priceLookupShopOrder: ShopId[];
  autoAddEnabled: boolean;
}

export interface Account {
  id: AccountId;
  name: string;
  /** User-defined order of shops shown across the app. Empty = insertion order. */
  shopOrder: ShopId[];
  aiConfig: AiConfig | null;
}
