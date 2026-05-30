import type { Item } from './item.model';

export type PriceComputation =
  | { kind: 'exact'; total: number }
  | {
      kind: 'approximate';
      shelfPrice: number;
      shelfQuantity: number | null;
      shelfUnit: string | null;
    }
  | { kind: 'none' };

/**
 * Computes the purchase price for an item.
 *
 *   exact       — the item's unit matches the shelf-price unit, or they share a
 *                 dimension (mass, volume) and can be converted deterministically.
 *   approximate — the shelf price is in a different dimension than the item
 *                 (e.g. priced per kg, listed in pcs) or one side uses a unit
 *                 outside the conversion table. The caller should render the
 *                 raw shelf price with a hint rather than fabricate a total.
 *   none        — no price has been set.
 *
 * Same-unit comparison runs after normalisation (liter→l, styck→pcs, etc.) so
 * common spelling/locale variants reduce to a single key.
 */
export function computePrice(item: Item): PriceComputation {
  if (item.price === null) return { kind: 'none' };

  const qty = item.quantity;
  if (qty === null || qty <= 0) {
    return { kind: 'exact', total: item.price };
  }

  // Default both sides to 'pcs' when unit is absent. This preserves the legacy
  // behaviour where unitless items multiplied price by quantity, and matches
  // the pipeline's new contract of defaulting priceUnit to 'pcs'.
  const itemUnit = item.unit ? normaliseUnit(item.unit) : 'pcs';
  const priceUnit = item.priceUnit ? normaliseUnit(item.priceUnit) : 'pcs';
  const priceQty = item.priceQuantity ?? 1;

  if (priceQty <= 0) return approximateOf(item);

  if (itemUnit === priceUnit) {
    return { kind: 'exact', total: (item.price / priceQty) * qty };
  }

  const itemInfo = UNIT_TABLE[itemUnit];
  const priceInfo = UNIT_TABLE[priceUnit];
  if (itemInfo && priceInfo && itemInfo.dimension === priceInfo.dimension) {
    const itemQtyBase = qty * itemInfo.toBase;
    const priceQtyBase = priceQty * priceInfo.toBase;
    return { kind: 'exact', total: (item.price / priceQtyBase) * itemQtyBase };
  }

  // sizePerPiece bridges pcs <-> mass/volume.
  const sppQty = item.sizePerPieceQuantity;
  const sppUnitRaw = item.sizePerPieceUnit;
  const sppUnit = sppUnitRaw ? normaliseUnit(sppUnitRaw) : null;
  const sppInfo = sppUnit ? UNIT_TABLE[sppUnit] : null;
  if (sppQty !== null && sppQty > 0 && sppInfo) {
    // Item listed in pcs, shelf priced in mass/volume that matches sizePerPiece.
    if (itemUnit === 'pcs' && priceInfo && priceInfo.dimension === sppInfo.dimension) {
      const itemInShelfBase = qty * sppQty * sppInfo.toBase;
      const priceQtyBase = priceQty * priceInfo.toBase;
      return { kind: 'exact', total: (item.price / priceQtyBase) * itemInShelfBase };
    }
    // Shelf priced per piece, item listed in mass/volume that matches sizePerPiece.
    if (priceUnit === 'pcs' && itemInfo && itemInfo.dimension === sppInfo.dimension) {
      const shelfQtyInItemBase = priceQty * sppQty * sppInfo.toBase;
      const itemQtyBase = qty * itemInfo.toBase;
      return { kind: 'exact', total: (item.price / shelfQtyInItemBase) * itemQtyBase };
    }
  }

  return approximateOf(item);
}

/** Back-compat numeric accessor. Returns the total for exact prices and the
 *  raw shelf price when there is no quantity to multiply by. Approximate
 *  prices return null so that category totals do not inflate with fabricated
 *  numbers — render those via {@link computePrice} instead. */
export function effectivePrice(item: Item): number | null {
  const result = computePrice(item);
  return result.kind === 'exact' ? result.total : null;
}

function approximateOf(item: Item): PriceComputation {
  return {
    kind: 'approximate',
    shelfPrice: item.price as number,
    shelfQuantity: item.priceQuantity,
    shelfUnit: item.priceUnit,
  };
}

type Dimension = 'mass' | 'volume' | 'count';

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
};

const UNIT_ALIASES: Record<string, string> = {
  liter: 'l', litre: 'l', ltr: 'l',
  kilogram: 'kg',
  gram: 'g',
  hekto: 'hg', hectogram: 'hg',
  deciliter: 'dl', decilitre: 'dl',
  milliliter: 'ml', millilitre: 'ml',
  förp: 'pcs', förpackning: 'pcs', pack: 'pcs', paket: 'pcs',
  st: 'pcs', styck: 'pcs', stycken: 'pcs',
};

function normaliseUnit(unit: string): string {
  const u = unit.toLowerCase().trim();
  return UNIT_ALIASES[u] ?? u;
}
