import type { AccountId, CategoryId, ItemId, ShopId } from './ids.model';

export interface PriceFeedbackEntry {
  rejectedName: string;
  rejectedUrl: string | null;
  reason: string;
  timestamp: number;
}

/**
 * Why an item was placed on the list by the app rather than by a person.
 *
 * A discriminated union so each reason carries only the data it needs, and so
 * the renderer can pick a translation key per `kind`. `'periodicity'` is
 * rule-driven (a median over the account's own purchase log, no model
 * involved); model-driven kinds will be added alongside it and are
 * distinguished at the item level by `addedBy: 'ai'`.
 */
export type AutoAddReason = {
  kind: 'periodicity';
  /**
   * Median interval between purchases, in whole days. Median rather than mean:
   * purchase intervals are right-skewed and sparse, so a single long gap (a
   * holiday) drags a mean far enough to suppress an otherwise regular item.
   * This is the only field rendered to the user.
   */
  medianIntervalDays: number;
  /** Diagnostics only — retained so a surprising suggestion can be explained. */
  daysSinceLastPurchase: number;
  /** Diagnostics only. */
  purchaseCount: number;
};

export interface ShopPriceEntry {
  price: number;
  priceQuantity: number;
  priceUnit: string;
  priceProductName: string | null;
  priceProductUrl: string | null;
  priceSearchUrl: string | null;
  priceUpdatedAt: number;
}

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
  /**
   * Origin indicator only — carries no functional meaning. `'auto'` is
   * rule-driven (periodicity), `'ai'` is model-driven. The two are shown with
   * different icons so a deterministic reminder is never mistaken for a
   * suggestion the app inferred.
   */
  addedBy: 'user' | 'auto' | 'ai';
  /** Structured, translatable reason. Null for user-added items. */
  autoAddReason: AutoAddReason | null;
  /** When the app last placed this item on the list; anchors the re-add cooldown. */
  autoAddedAt: number | null;
  /**
   * Set when a user removes an auto-added item without buying it — a removal is
   * a "no". Suppresses re-adding for a window. Cleared implicitly by a manual
   * re-add, which resets the item to user-owned.
   */
  autoAddDeclinedAt: number | null;
  /**
   * Free-text prose layer, model-authored, rendered verbatim in place of the
   * translated reason. Null for rule-driven adds. Stored in one language only —
   * the single documented exemption from the all-locales rule — so
   * `autoAddMotivationLang` records which language it was written in.
   */
  autoAddMotivation: string | null;
  /** BCP-47-ish language tag of `autoAddMotivation`, matching the app's language codes. */
  autoAddMotivationLang: string | null;
  price: number | null;
  priceQuantity: number | null;
  priceUnit: string | null;
  priceShopId: ShopId | null;
  priceProductName: string | null;
  priceProductUrl: string | null;
  priceSearchUrl: string | null;
  shopPrices: Record<string, ShopPriceEntry>;
  priceFeedback: PriceFeedbackEntry[];
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
