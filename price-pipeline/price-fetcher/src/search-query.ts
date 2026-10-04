import { readFileSync } from 'fs';

const BUILT_IN_STORES: Record<string, string> = {
  willys:   'https://www.willys.se/search?q={query}',
  // ICA: store-specific — add your store URL to stores.json with key "ica"
  coop:     'https://www.coop.se/handla/search/?q={query}',
  hemkop:   'https://www.hemkop.se/search?q={query}',
  matsmart: 'https://www.matsmart.se/search?query={query}',
  prisjakt: 'https://www.prisjakt.nu/search?query={query}',
};

function loadUserStores(): Record<string, string> {
  // /app/stores.json in Docker; ./stores.json when running locally from price-fetcher/
  for (const path of ['/app/stores.json', './stores.json', '../stores.json']) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, string>;
    } catch {
      // not found or invalid — try next
    }
  }
  return {};
}

// User stores take precedence so personal URLs can override built-ins
export const KNOWN_STORES: Record<string, string> = {
  ...BUILT_IN_STORES,
  ...loadUserStores(),
};

export interface ItemContext {
  name: string;
}

export function buildSearchUrl(item: ItemContext, urlTemplate?: string, site?: string): string {
  const template = urlTemplate ?? (site ? KNOWN_STORES[site] : null) ?? null;
  if (!template) {
    const hint = site
      ? `Unknown site "${site}". Add it to stores.json or use --url.`
      : 'No store specified. Use --site <name> or --url <template>.\nKnown stores: ' + Object.keys(KNOWN_STORES).join(', ');
    throw new Error(hint);
  }
  const query = encodeURIComponent(buildQueryString(item));
  return template.replace('{query}', query);
}

export function buildQueryString(item: ItemContext): string {
  return normalise(item.name);
}

function normalise(name: string): string {
  return name.trim().toLowerCase();
}
