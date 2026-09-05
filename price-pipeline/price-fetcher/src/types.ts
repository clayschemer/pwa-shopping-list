export interface ExtractedProduct {
  name: string;
  price: number;
  priceQuantity: number | null;
  priceUnit: string | null;
  /** Product page URL, when JSON-LD provides one. Used to deep-link the user
   *  back to the matched product for verification. Null when not exposed by
   *  the source or when the validator fell back to raw page text. */
  url: string | null;
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
  /** Typical size of one piece — only relevant when the shelf prices by
   *  weight/volume but the item is normally sold by piece (lime, egg, etc.).
   *  Null when not applicable. */
  sizePerPiece: SizePerPiece | null;
  /** Matched product's display name as listed in the store. Null when the
   *  validator could not resolve the LLM's matchedName against an extracted
   *  product (e.g. text-prompt fallback). */
  productName: string | null;
  /** Matched product's page URL when JSON-LD exposed one. Null when not
   *  available — the price still writes; only the deep-link is missing. */
  productUrl: string | null;
}

/** Past user-rejected match for the same item, passed back into the
 *  validator prompt as exclusion context on the next lookup. */
export interface FeedbackHint {
  rejectedName: string;
  rejectedUrl: string | null;
  reason: string;
}

export interface SizePerPiece {
  quantity: number;
  unit: string;
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
  /** User feedback on prior matches; empty when none. Cleared by the writer
   *  on a successful re-match. */
  priceFeedback: FeedbackHint[];
}

/** A resolved shop with its search URL template */
export interface ShopConfig {
  id: string;
  name: string;
  /** URL template containing {query} placeholder */
  searchUrl: string;
}
