import type { ExtractedProduct } from './types.js';

// JSON-LD shapes we recognise from e-commerce sites
interface LdProduct {
  '@type'?: string;
  name?: string;
  url?: string;
  offers?: LdOffer | LdOffer[];
  itemListElement?: Array<{ item?: LdProduct; url?: string } | LdProduct>;
  mainEntity?: LdProduct;
}

interface LdOffer {
  price?: number | string;
  priceCurrency?: string;
  unitText?: string;
}

/**
 * Attempts to extract structured product data from JSON-LD blocks embedded in the
 * page HTML. Returns an empty array if none are found — the validator falls back to
 * sending raw page text to Gemma in that case.
 */
export function extract(html: string): ExtractedProduct[] {
  const products: ExtractedProduct[] = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(pattern)) {
    try {
      const data: LdProduct | LdProduct[] = JSON.parse(match[1]);
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        products.push(...fromNode(node, null));
      }
    } catch {
      // Malformed JSON-LD — skip silently
    }
  }

  return products;
}

/**
 * Walks a JSON-LD subtree. `fallbackUrl` carries down the URL from a parent
 * ItemList entry when the inner Product node has no url of its own — some
 * stores attach the link only to the list wrapper.
 */
function fromNode(node: LdProduct, fallbackUrl: string | null): ExtractedProduct[] {
  const results: ExtractedProduct[] = [];

  if (node['@type'] === 'Product' && node.name) {
    const offers = node.offers ? (Array.isArray(node.offers) ? node.offers : [node.offers]) : [];
    for (const offer of offers) {
      const price = parsePrice(offer.price);
      if (price !== null) {
        results.push({
          name: node.name,
          price,
          priceQuantity: null,
          priceUnit: offer.unitText ?? null,
          url: node.url ?? fallbackUrl,
        });
      }
    }
  }

  // Recurse into ItemList / SearchResultsPage
  if (node.itemListElement) {
    for (const el of node.itemListElement) {
      const child = 'item' in el ? el.item : el;
      const childFallback = ('url' in el && el.url) ? el.url : null;
      if (child) results.push(...fromNode(child, childFallback));
    }
  }
  if (node.mainEntity) {
    results.push(...fromNode(node.mainEntity, fallbackUrl));
  }

  return results;
}

function parsePrice(raw: number | string | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
  return isFinite(n) && n > 0 ? n : null;
}
