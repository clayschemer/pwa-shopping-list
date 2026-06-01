import { buildSearchUrl } from './search-query.js';
import { scrape } from './scraper.js';
import { extract } from './extractor.js';
import { validate } from './validator.js';
import type { StaleItem, ShopConfig, PriceResult } from './types.js';

/**
 * Runs a single item through the full pipeline, trying each shop in order.
 * Returns the first successful price result along with which shop found it
 * and the search URL the scrape used (powers the inspect-popup's "view search
 * results" fallback when JSON-LD didn't expose a per-product URL), or null if
 * all shops fail or return no match.
 */
export async function processItem(
  item: StaleItem,
  shops: ShopConfig[],
): Promise<{ result: PriceResult; shop: ShopConfig; searchUrl: string } | null> {
  // Cache scrape+validate results by URL so shops sharing the same search page
  // are only scraped once per item — avoids redundant requests and reduces
  // the risk of being rate-limited by the same domain.
  const urlCache = new Map<string, PriceResult | null>();

  for (const shop of shops) {
    try {
      const searchUrl = buildSearchUrl({ name: item.name }, shop.searchUrl);

      if (urlCache.has(searchUrl)) {
        const cached = urlCache.get(searchUrl) ?? null;
        if (cached) {
          console.log(`  → [${shop.name}] Reusing result from same URL (${shop.searchUrl.slice(0, 40)}…)`);
          return { result: cached, shop, searchUrl };
        }
        console.log(`  → [${shop.name}] Skipping — same URL already returned no match.`);
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

      if (result) return { result, shop, searchUrl };
      console.log(`     No match — trying next shop.`);
    } catch (err) {
      console.error(`     [${shop.name}] scrape error: ${(err as Error).message}`);
    }
  }

  return null;
}
