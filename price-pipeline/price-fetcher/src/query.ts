import { Timestamp } from 'firebase-admin/firestore';
import { getDb } from './firebase-admin.js';
import { KNOWN_STORES } from './search-query.js';
import type { FeedbackHint, StaleItem, ShopConfig } from './types.js';

const STALE_DAYS = parseInt(process.env['PRICE_STALE_DAYS'] ?? '180', 10);
const RETRY_DAYS = parseInt(process.env['PRICE_RETRY_DAYS'] ?? '7', 10);

/**
 * Returns items across all accounts that need a price update.
 * - unpriced: items where priceUpdatedAt is null (newly added, never estimated)
 * - full:     unpriced + items whose price is older than PRICE_STALE_DAYS
 */
export async function queryStaleItems(mode: 'full' | 'unpriced'): Promise<StaleItem[]> {
  const db = getDb();
  const results: StaleItem[] = [];

  const accountsSnap = await db.collection('accounts').get();

  for (const accountDoc of accountsSnap.docs) {
    const accountId = accountDoc.id;
    const aiConfig = accountDoc.data()['aiConfig'] as { priceLookupShopOrder?: string[] } | null;

    // Skip accounts without a configured price lookup shop list
    if (!aiConfig?.priceLookupShopOrder?.length) continue;

    // Pre-fetch categories for name resolution
    const categoryMap = new Map<string, string>();
    const categoriesSnap = await db.collection(`accounts/${accountId}/categories`).get();
    for (const doc of categoriesSnap.docs) {
      categoryMap.set(doc.id, (doc.data()['name'] as string) ?? '');
    }

    const seen = new Set<string>();

    const addItems = (snap: FirebaseFirestore.QuerySnapshot) => {
      for (const doc of snap.docs) {
        if (seen.has(doc.id)) continue;
        seen.add(doc.id);
        const d = doc.data();
        results.push({
          id: doc.id,
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
    };

    // Collect unpriced items, skipping those attempted within the retry window.
    // Client-side filter avoids needing a composite Firestore index.
    const retryBefore = Date.now() - RETRY_DAYS * 86_400_000;
    const unpricedSnap = await db
      .collection(`accounts/${accountId}/items`)
      .where('removed', '==', false)
      .where('priceUpdatedAt', '==', null)
      .get();
    for (const doc of unpricedSnap.docs) {
      if (seen.has(doc.id)) continue;
      const d = doc.data();
      const attempted = d['priceAttemptedAt'];
      if (attempted != null) {
        const ms = attempted instanceof Timestamp ? attempted.toMillis() : Number(attempted);
        if (ms > retryBefore) continue; // tried recently, skip
      }
      seen.add(doc.id);
      results.push({
        id: doc.id,
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

    // Full mode: also collect items with stale prices
    if (mode === 'full') {
      const staleBefore = Timestamp.fromMillis(Date.now() - STALE_DAYS * 86_400_000);
      const staleSnap = await db
        .collection(`accounts/${accountId}/items`)
        .where('removed', '==', false)
        .where('priceUpdatedAt', '<', staleBefore)
        .get();
      addItems(staleSnap);
    }
  }

  return results;
}

/**
 * Resolves an ordered list of ShopConfigs for an account.
 * Checks priceSearchUrl on the shop document first (future data model field),
 * then falls back to name-matching against stores.json / KNOWN_STORES.
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
    // priceSearchUrl will be added to the data model later; read it if present
    const explicitUrl = (d['priceSearchUrl'] as string | null) ?? null;
    const searchUrl = explicitUrl ?? resolveUrlByName(shopName);

    if (searchUrl) {
      configs.push({ id: shopId, name: shopName, searchUrl });
    } else {
      console.warn(`No search URL found for shop "${shopName}" (${shopId}). Add it to stores.json.`);
    }
  }

  return configs;
}

/** Case- and diacritic-insensitive partial match of a shop name against known store keys */
function resolveUrlByName(shopName: string): string | null {
  const norm = normalise(shopName);
  for (const [key, url] of Object.entries(KNOWN_STORES)) {
    const normKey = normalise(key);
    if (norm.includes(normKey) || normKey.includes(norm)) return url;
  }
  return null;
}

function normalise(s: string): string {
  return s.toLowerCase()
    .replace(/ö/g, 'o')
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a');
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
