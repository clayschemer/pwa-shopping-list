import type { Item } from './item.model';

export type PriceComputation =
  | { kind: 'exact'; total: number; isGlobalFallback: boolean }
  | {
      kind: 'approximate';
      shelfPrice: number;
      shelfQuantity: number | null;
      shelfUnit: string | null;
      isGlobalFallback: boolean;
    }
  | { kind: 'none' };

/**
 * Computes the purchase price for an item, optionally scoped to a specific shop.
 *
 * When shopId is provided and the item has a price recorded for that shop, the
 * shop-specific price is used. When no shop-specific price exists but a global
 * price is available, the global price is used and `isGlobalFallback` is true —
 * the caller should render the price in parentheses to signal it is not from
 * the current shop.
 *
 *   exact       — the item's unit matches the shelf-price unit, or they share a
 *                 dimension (mass, volume) and can be converted deterministically.
 *   approximate — the shelf price is in a different dimension than the item
 *                 (e.g. priced per kg, listed in pcs) or one side uses a unit
 *                 outside the conversion table. The caller should render the
 *                 raw shelf price with a hint rather than fabricate a total.
 *   none        — no price has been set.
 */
export function computePrice(item: Item, shopId?: string | null): PriceComputation {
  const shopEntry = shopId != null ? (item.shopPrices[shopId] ?? null) : null;
  const isGlobalFallback = shopId != null && shopEntry === null && item.price !== null;

  const price = shopEntry?.price ?? item.price;
  const priceQtyRaw = shopEntry?.priceQuantity ?? item.priceQuantity;
  const priceUnitRaw = shopEntry?.priceUnit ?? item.priceUnit;

  if (price === null) return { kind: 'none' };

  const qty = item.quantity;
  if (qty === null || qty <= 0) {
    return { kind: 'exact', total: price, isGlobalFallback };
  }

  const itemUnit = item.unit ? normaliseUnit(item.unit) : 'pcs';
  const priceUnit = priceUnitRaw ? normaliseUnit(priceUnitRaw) : 'pcs';
  const priceQty = priceQtyRaw ?? 1;

  if (priceQty <= 0) return approximateOf(price, priceQtyRaw, priceUnitRaw, isGlobalFallback);

  if (itemUnit === priceUnit) {
    return { kind: 'exact', total: (price / priceQty) * qty, isGlobalFallback };
  }

  const itemInfo = UNIT_TABLE[itemUnit];
  const priceInfo = UNIT_TABLE[priceUnit];
  if (itemInfo && priceInfo && itemInfo.dimension === priceInfo.dimension) {
    const itemQtyBase = qty * itemInfo.toBase;
    const priceQtyBase = priceQty * priceInfo.toBase;
    return { kind: 'exact', total: (price / priceQtyBase) * itemQtyBase, isGlobalFallback };
  }

  // sizePerPiece bridges pcs/container <-> mass/volume.
  const sppQty = item.sizePerPieceQuantity;
  const sppUnitRaw = item.sizePerPieceUnit;
  const sppUnit = sppUnitRaw ? normaliseUnit(sppUnitRaw) : null;
  const sppInfo = sppUnit ? UNIT_TABLE[sppUnit] : null;
  if (sppQty !== null && sppQty > 0 && sppInfo) {
    if (PER_PIECE_UNITS.has(itemUnit) && priceInfo && priceInfo.dimension === sppInfo.dimension) {
      const itemInShelfBase = qty * sppQty * sppInfo.toBase;
      const priceQtyBase = priceQty * priceInfo.toBase;
      return { kind: 'exact', total: (price / priceQtyBase) * itemInShelfBase, isGlobalFallback };
    }
    if (PER_PIECE_UNITS.has(priceUnit) && itemInfo && itemInfo.dimension === sppInfo.dimension) {
      const shelfQtyInItemBase = priceQty * sppQty * sppInfo.toBase;
      const itemQtyBase = qty * itemInfo.toBase;
      return { kind: 'exact', total: (price / shelfQtyInItemBase) * itemQtyBase, isGlobalFallback };
    }
  }

  return approximateOf(price, priceQtyRaw, priceUnitRaw, isGlobalFallback);
}

/** Returns the computed total for exact prices, null for approximate or none.
 *  Approximate prices are excluded from category totals to avoid inflated numbers.
 *  Pass shopId to use the shop-specific price when available. */
export function effectivePrice(item: Item, shopId?: string | null): number | null {
  const result = computePrice(item, shopId);
  return result.kind === 'exact' ? result.total : null;
}

function approximateOf(
  price: number,
  priceQuantity: number | null,
  priceUnit: string | null,
  isGlobalFallback: boolean,
): PriceComputation {
  return { kind: 'approximate', shelfPrice: price, shelfQuantity: priceQuantity, shelfUnit: priceUnit, isGlobalFallback };
}


type Dimension = 'mass' | 'volume' | 'count' | 'container';

interface UnitInfo {
  dimension: Dimension;
  toBase: number;
}

const UNIT_TABLE: Record<string, UnitInfo> = {
  mg: { dimension: 'mass', toBase: 0.001 },
  g: { dimension: 'mass', toBase: 1 },
  hg: { dimension: 'mass', toBase: 100 },
  kg: { dimension: 'mass', toBase: 1000 },
  ml: { dimension: 'volume', toBase: 1 },
  cl: { dimension: 'volume', toBase: 10 },
  dl: { dimension: 'volume', toBase: 100 },
  l: { dimension: 'volume', toBase: 1000 },
  pcs: { dimension: 'count', toBase: 1 },
  // A package is its own dimension: how many pieces it holds is unknown, so a
  // per-package shelf price must never be scaled by a per-piece quantity.
  container: { dimension: 'container', toBase: 1 },
};

const UNIT_ALIASES: Record<string, string> = {
  liter: 'l', litre: 'l', ltr: 'l',
  kilogram: 'kg',
  gram: 'g',
  hekto: 'hg', hectogram: 'hg',
  deciliter: 'dl', decilitre: 'dl',
  milliliter: 'ml', millilitre: 'ml',
  förp: 'container', förpackning: 'container', frp: 'container',
  pack: 'container', packung: 'container', pkg: 'container',
  paket: 'container', pakke: 'container', paquet: 'container',
  st: 'pcs', styck: 'pcs', stycken: 'pcs', stk: 'pcs',
};

/** Units that denote "one whole thing" — sizePerPiece bridges these to mass/volume. */
const PER_PIECE_UNITS: ReadonlySet<string> = new Set(['pcs', 'container']);

function normaliseUnit(unit: string): string {
  const u = unit.toLowerCase().trim();
  return UNIT_ALIASES[u] ?? u;
}
