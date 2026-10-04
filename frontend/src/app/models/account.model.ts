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
  /**
   * Shared, account-level: add recurring items back to the list automatically
   * when their usual interval has elapsed.
   *
   * Deliberately top-level rather than inside `aiConfig` — the rule-driven half
   * of auto-add is a median over the account's own purchase log, so it must work
   * with no AI provider configured. `AiConfig.autoAddEnabled` stays reserved for
   * the model-driven half.
   */
  autoAddEnabled: boolean;
  /**
   * When an auto-add evaluation last ran for this account. Claimed
   * transactionally before the work, so concurrent clients can't both spend the
   * read budget on the same day.
   */
  autoAddLastRunAt: number | null;
}
