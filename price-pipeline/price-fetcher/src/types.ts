export interface ExtractedProduct {
  name: string;
  price: number;
  priceQuantity: number | null;
  priceUnit: string | null;
}

export interface ScrapeResult {
  url: string;
  html: string;
  /** Visible page text, truncated to 5000 chars for LLM consumption */
  text: string;
}

export interface PriceResult {
  price: number;
  priceQuantity: number | null;
  priceUnit: string | null;
}

/** An item from Firestore that needs a price update */
export interface StaleItem {
  id: string;
  accountId: string;
  name: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  categoryName: string | null;
}

/** A resolved shop with its search URL template */
export interface ShopConfig {
  id: string;
  name: string;
  /** URL template containing {query} placeholder */
  searchUrl: string;
}
