import { buildSearchUrl } from './search-query.js';
import { scrape } from './scraper.js';
import { extract } from './extractor.js';
import { validate } from './validator.js';
import type { StaleItem, ShopConfig, PriceResult } from './types.js';

export interface ShopMatch {
  result: PriceResult;
  shop: ShopConfig;
  searchUrl: string;
}

/**
 * Runs a single item through the full pipeline across all shops.
 * Returns every successful match (one per shop that returned a price).
 * All shops are tried even after a successful match so per-shop prices can
 * be written for every configured store — not just the first hit.
 * Returns an empty array when all shops fail or return no match.
 */
export async function processItem(
  item: StaleItem,
  shops: ShopConfig[],
): Promise<ShopMatch[]> {
  // Cache scrape+validate results by URL so shops sharing the same search page
  // are only scraped once per item — avoids redundant requests and reduces
  // the risk of being rate-limited by the same domain.
  const urlCache = new Map<string, PriceResult | null>();
  const matches: ShopMatch[] = [];

  for (const shop of shops) {
    try {
      const searchUrl = buildSearchUrl({ name: item.name }, shop.searchUrl);

      if (urlCache.has(searchUrl)) {
        const cached = urlCache.get(searchUrl) ?? null;
        if (cached) {
          console.log(`  → [${shop.name}] Reusing result from same URL (${shop.searchUrl.slice(0, 40)}…)`);
          matches.push({ result: cached, shop, searchUrl });
        } else {
          console.log(`  → [${shop.name}] Skipping — same URL already returned no match.`);
        }
        continue;
      }

      console.log(`  → [${shop.name}] ${searchUrl}`);
      const { html, text } = await scrape(searchUrl);
      const products = extract(html);
      console.log(`     ${products.length} structured product(s) found.`);

      const result = await validate(
        item.name,
        products,
        text,
        item.description,
        item.categoryName,
        item.priceFeedback,
      );
      urlCache.set(searchUrl, result);

      if (result) {
        matches.push({ result, shop, searchUrl });
      } else {
        console.log(`     No match — continuing to next shop.`);
      }
    } catch (err) {
      console.error(`     [${shop.name}] scrape error: ${(err as Error).message}`);
    }
  }

  return matches;
}
