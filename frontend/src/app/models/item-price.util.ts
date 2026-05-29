import type { Item } from './item.model';

/**
 * Computes the estimated purchase price for an item — i.e. what the user
 * will likely pay for the quantity they have listed, not just the raw shelf price.
 *
 * Logic:
 *   - If item.unit and priceUnit refer to the same physical unit (e.g. both "kg"),
 *     scale: price / priceQuantity * item.quantity
 *   - Otherwise (units differ or one/both absent), assume the stored price covers
 *     one "unit" of the item and multiply: price * item.quantity
 *   - If item.quantity is null or price is null, returns the raw price as-is.
 */
export function effectivePrice(item: Item): number | null {
  if (item.price === null) return null;
  const qty = item.quantity;
  if (qty === null || qty <= 0) return item.price;

  const itemUnit = item.unit ? normaliseUnit(item.unit) : null;
  const priceUnit = item.priceUnit ? normaliseUnit(item.priceUnit) : null;

  if (itemUnit !== null && priceUnit !== null && itemUnit === priceUnit) {
    return (item.price / (item.priceQuantity ?? 1)) * qty;
  }

  return item.price * qty;
}

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
