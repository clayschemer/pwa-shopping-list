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
 * Resets priceUpdatedAt to null on every item across every account.
 * priceAttemptedAt is also cleared so the unpriced scan picks items up
 * immediately rather than waiting for the retry window to expire.
 * Returns the number of items updated.
 */
export async function resetAllPriceUpdatedAt(): Promise<number> {
  const db = getDb();
  const accountsSnap = await db.collection('accounts').get();

  let total = 0;
  for (const accountDoc of accountsSnap.docs) {
    const itemsRef = db.collection(`accounts/${accountDoc.id}/items`);
    const itemsSnap = await itemsRef.get();
    if (itemsSnap.empty) continue;

    // Firestore batch limit is 500 writes per commit.
    const docs = itemsSnap.docs;
    for (let i = 0; i < docs.length; i += 500) {
      const batch = db.batch();
      for (const doc of docs.slice(i, i + 500)) {
        batch.update(doc.ref, { priceUpdatedAt: null, priceAttemptedAt: null });
      }
      await batch.commit();
    }

    console.log(`  account ${accountDoc.id}: reset ${docs.length} item(s)`);
    total += docs.length;
  }

  return total;
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
  searchUrl: string | null,
): Promise<void> {
  const db = getDb();
  const ref = db.collection(`accounts/${accountId}/items`).doc(itemId);

  const update: Record<string, unknown> = {
    price: result.price,
    priceQuantity: result.priceQuantity,
    priceUnit: result.priceUnit,
    priceShopId: shopId,
    priceProductName: result.productName,
    priceProductUrl: result.productUrl,
    // Search-results URL used for the successful lookup. Powers the
    // "view search results" fallback in the inspect popup when productUrl
    // is null (sites without JSON-LD product URLs).
    priceSearchUrl: searchUrl,
    priceUpdatedAt: FieldValue.serverTimestamp(),
    // Successful (re-)match converged — clear the operational feedback array
    // so the next routine scan no longer carries the rejection context.
    // The append-only corpus log under accounts/{id}/priceFeedback is untouched.
    priceFeedback: [],
  };

  // Sticky-user-edit: only seed sizePerPiece when no value is already stored —
  // either from a previous pipeline run or, more importantly, a manual edit.
  if (result.sizePerPiece) {
    const snap = await ref.get();
    const data = snap.data() ?? {};
    if (data['sizePerPieceQuantity'] == null && data['sizePerPieceUnit'] == null) {
      update['sizePerPieceQuantity'] = result.sizePerPiece.quantity;
      update['sizePerPieceUnit'] = result.sizePerPiece.unit;
    }
  }

  await ref.update(update);
}
