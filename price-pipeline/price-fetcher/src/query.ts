import { Timestamp } from 'firebase-admin/firestore';
import { getDb } from './firebase-admin.js';
import type { FeedbackHint, StaleItem, ShopConfig } from './types.js';

const RETRY_DAYS = parseInt(process.env['PRICE_RETRY_DAYS'] ?? '7', 10);

/**
 * Returns items across all accounts that are in the price-queue collection.
 * The queue is written by the Angular client when:
 *   - a new item is added (reason: 'unpriced')
 *   - a restored item has a stale price (reason: 'reactivated')
 *   - the app boots and detects active items with stale prices (reason: 'stale')
 *
 * Items that were recently attempted (within PRICE_RETRY_DAYS) are skipped
 * so failed lookups don't spin endlessly.
 */
export async function queryQueuedItems(): Promise<StaleItem[]> {
  const db = getDb();
  const results: StaleItem[] = [];

  const accountsSnap = await db.collection('accounts').get();

  for (const accountDoc of accountsSnap.docs) {
    const accountId = accountDoc.id;
    const aiConfig = accountDoc.data()['aiConfig'] as { priceLookupShopOrder?: string[] } | null;

    if (!aiConfig?.priceLookupShopOrder?.length) continue;

    const queueSnap = await db.collection(`accounts/${accountId}/price-queue`).get();
    if (queueSnap.empty) continue;

    // Only load categories when we have items to process.
    const categoryMap = new Map<string, string>();
    const categoriesSnap = await db.collection(`accounts/${accountId}/categories`).get();
    for (const doc of categoriesSnap.docs) {
      categoryMap.set(doc.id, (doc.data()['name'] as string) ?? '');
    }

    const retryBefore = Date.now() - RETRY_DAYS * 86_400_000;

    for (const queueDoc of queueSnap.docs) {
      const itemId = queueDoc.id;
      const itemSnap = await db.collection(`accounts/${accountId}/items`).doc(itemId).get();

      if (!itemSnap.exists) {
        // Item was hard-deleted (shouldn't happen, but guard anyway) — clean up.
        await db.collection(`accounts/${accountId}/price-queue`).doc(itemId).delete();
        continue;
      }

      const d = itemSnap.data()!;

      // Item was removed after being queued (e.g. user deleted it while pipeline was idle).
      if (d['removed'] === true) continue;

      // Respect the retry window — avoid hammering failed lookups every cycle.
      const attempted = d['priceAttemptedAt'];
      if (attempted != null) {
        const ms = attempted instanceof Timestamp ? attempted.toMillis() : Number(attempted);
        if (ms > retryBefore) continue;
      }

      results.push({
        id: itemId,
        accountId,
        name: (d['name'] as string) ?? '',
        description: (d['description'] as string | null) ?? null,
        quantity: (d['quantity'] as number | null) ?? null,
        unit: (d['unit'] as string | null) ?? null,
        categoryName: d['primaryCategoryId']
          ? (categoryMap.get(d['primaryCategoryId'] as string) ?? null)
          : null,
        priceFeedback: readFeedback(d['priceFeedback']),
      });
    }
  }

  return results;
}

/**
 * Resolves an ordered list of ShopConfigs for an account.
 * Only shops with a priceSearchUrl set in Firestore (via Manage Shops UI) are
 * included. Shops without a URL are skipped with a warning directing the user
 * to configure the URL in the app.
 */
export async function getShopConfigs(accountId: string): Promise<ShopConfig[]> {
  const db = getDb();
  const accountDoc = await db.collection('accounts').doc(accountId).get();
  const aiConfig = accountDoc.data()?.['aiConfig'] as { priceLookupShopOrder?: string[] } | null;

  if (!aiConfig?.priceLookupShopOrder?.length) return [];

  const configs: ShopConfig[] = [];

  for (const shopId of aiConfig.priceLookupShopOrder) {
    const shopDoc = await db.collection(`accounts/${accountId}/shops`).doc(shopId).get();
    if (!shopDoc.exists) continue;

    const d = shopDoc.data()!;
    const shopName = (d['name'] as string) ?? '';
    const searchUrl = (d['priceSearchUrl'] as string | null) ?? null;

    if (searchUrl) {
      configs.push({ id: shopId, name: shopName, searchUrl });
    } else {
      console.warn(`Shop "${shopName}" (${shopId}) has no priceSearchUrl — set it in Manage Shops to enable price lookup.`);
    }
  }

  return configs;
}

/** Defensive read of the priceFeedback array from Firestore. Filters out
 *  malformed entries rather than failing the whole pipeline run. */
function readFeedback(raw: unknown): FeedbackHint[] {
  if (!Array.isArray(raw)) return [];
  const out: FeedbackHint[] = [];
  for (const entry of raw) {
    if (entry == null || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const rejectedName = typeof e['rejectedName'] === 'string' ? e['rejectedName'] : null;
    const reason = typeof e['reason'] === 'string' ? e['reason'] : null;
    if (!rejectedName || !reason) continue;
    out.push({
      rejectedName,
      rejectedUrl: typeof e['rejectedUrl'] === 'string' ? e['rejectedUrl'] : null,
      reason,
    });
  }
  return out;
}
