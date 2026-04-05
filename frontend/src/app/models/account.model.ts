import type { AccountId, ShopId } from './ids.model';

export interface AiConfig {
  provider: string;
  priceLookupShopOrder: ShopId[];
  autoAddEnabled: boolean;
}

export interface Account {
  id: AccountId;
  name: string;
  aiConfig: AiConfig | null;
}
