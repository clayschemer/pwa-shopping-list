import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './firebase-admin.js';
import type { PriceResult } from './types.js';

/**
 * Resets an item so the unpriced scan will pick it up on the next cycle.
 * Sets priceUpdatedAt and priceAttemptedAt to explicit null — Firestore's
 * == null query only matches explicit null, not absent/deleted fields.
 */
export async function resetPriceForRescan(accountId: string, itemId: string): Promise<void> {
  const db = getDb();
  await db
    .collection(`accounts/${accountId}/items`)
    .doc(itemId)
    .update({ priceUpdatedAt: null, priceAttemptedAt: null });
}

/**
 * Records that the pipeline attempted a price lookup for this item, regardless of outcome.
 * Used by the unpriced scan to avoid retrying failed items too frequently.
 */
export async function writeAttemptTimestamp(accountId: string, itemId: string): Promise<void> {
  const db = getDb();
  await db
    .collection(`accounts/${accountId}/items`)
    .doc(itemId)
    .update({ priceAttemptedAt: FieldValue.serverTimestamp() });
}

export async function writePriceResult(
  accountId: string,
  itemId: string,
  result: PriceResult,
  shopId: string | null,
): Promise<void> {
  const db = getDb();
  await db
    .collection(`accounts/${accountId}/items`)
    .doc(itemId)
    .update({
      price: result.price,
      priceQuantity: result.priceQuantity,
      priceUnit: result.priceUnit,
      priceShopId: shopId,
      priceUpdatedAt: FieldValue.serverTimestamp(),
    });
}
