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

/**
 * Writes a single shop's price into the item's shopPrices sub-map.
 * Uses dot-notation so only this shop's entry is touched.
 */
export async function writeShopPriceResult(
  accountId: string,
  itemId: string,
  result: PriceResult,
  shopId: string,
  searchUrl: string | null,
): Promise<void> {
  const db = getDb();
  const ref = db.collection(`accounts/${accountId}/items`).doc(itemId);

  const shopEntry: Record<string, unknown> = {
    price: result.price,
    priceQuantity: result.priceQuantity,
    priceUnit: result.priceUnit,
    priceProductName: result.productName,
    priceProductUrl: result.productUrl,
    priceSearchUrl: searchUrl,
    priceUpdatedAt: FieldValue.serverTimestamp(),
  };

  const update: Record<string, unknown> = {
    [`shopPrices.${shopId}`]: shopEntry,
  };

  // Sticky-user-edit: only seed sizePerPiece when not already set.
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

/**
 * Reads the current shopPrices map and writes the global price fields
 * (top-level price, priceQuantity, priceUnit, priceShopId, etc.) by picking
 * the entry with the lowest raw price value. Also clears the operational
 * priceFeedback array — a successful match has converged.
 */
export async function writeGlobalPrice(
  accountId: string,
  itemId: string,
): Promise<void> {
  const db = getDb();
  const ref = db.collection(`accounts/${accountId}/items`).doc(itemId);
  const snap = await ref.get();
  const data = snap.data() ?? {};

  const shopPrices = data['shopPrices'] as Record<string, Record<string, unknown>> | null ?? {};

  let lowestShopId: string | null = null;
  let lowestEntry: Record<string, unknown> | null = null;

  for (const [sid, entry] of Object.entries(shopPrices)) {
    const entryPrice = typeof entry['price'] === 'number' ? entry['price'] : null;
    if (entryPrice === null) continue;
    const lowestPrice = typeof lowestEntry?.['price'] === 'number' ? lowestEntry['price'] as number : Infinity;
    if (entryPrice < lowestPrice) {
      lowestShopId = sid;
      lowestEntry = entry;
    }
  }

  await ref.update({
    price: lowestEntry?.['price'] ?? null,
    priceQuantity: lowestEntry?.['priceQuantity'] ?? null,
    priceUnit: lowestEntry?.['priceUnit'] ?? null,
    priceShopId: lowestShopId,
    priceProductName: lowestEntry?.['priceProductName'] ?? null,
    priceProductUrl: lowestEntry?.['priceProductUrl'] ?? null,
    priceSearchUrl: lowestEntry?.['priceSearchUrl'] ?? null,
    priceUpdatedAt: lowestEntry ? FieldValue.serverTimestamp() : null,
    priceFeedback: [],
  });
}
