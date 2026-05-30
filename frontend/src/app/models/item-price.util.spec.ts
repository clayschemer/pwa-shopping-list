import { describe, it, expect } from 'vitest';
import { computePrice, effectivePrice } from './item-price.util';
import type { Item } from './item.model';
import type { AccountId, ItemId } from './ids.model';

function makeItem(overrides: Partial<Item>): Item {
  return {
    id: 'i1' as ItemId,
    accountId: 'a1' as AccountId,
    name: 'Test',
    description: null,
    quantity: null,
    unit: null,
    primaryCategoryId: null,
    secondaryCategoryIds: [],
    removed: false,
    removedAt: null,
    addedBy: 'user',
    aiMotivation: null,
    price: null,
    priceQuantity: null,
    priceUnit: null,
    priceShopId: null,
    priceUpdatedAt: null,
    priceAttemptedAt: null,
    sizePerPieceQuantity: null,
    sizePerPieceUnit: null,
    purchaseCount: 0,
    ...overrides,
  };
}

describe('computePrice', () => {
  describe('no price', () => {
    it('returns kind=none when price is null', () => {
      const item = makeItem({ price: null });
      expect(computePrice(item)).toEqual({ kind: 'none' });
    });
  });

  describe('no quantity to scale by', () => {
    it('returns the raw price as exact when quantity is null', () => {
      const item = makeItem({ price: 25, quantity: null });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 25 });
    });

    it('returns the raw price as exact when quantity is 0', () => {
      const item = makeItem({ price: 25, quantity: 0 });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 25 });
    });

    it('returns the raw price as exact when quantity is negative', () => {
      const item = makeItem({ price: 25, quantity: -1 });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 25 });
    });
  });

  describe('exact unit match', () => {
    it('multiplies for matching pcs units', () => {
      const item = makeItem({
        price: 10,
        priceQuantity: 1,
        priceUnit: 'pcs',
        quantity: 3,
        unit: 'pcs',
      });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 30 });
    });

    it('scales for matching kg units with non-1 priceQuantity', () => {
      const item = makeItem({
        price: 100,
        priceQuantity: 2,
        priceUnit: 'kg',
        quantity: 1,
        unit: 'kg',
      });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 50 });
    });

    it('normalises spelling variants on both sides', () => {
      const item = makeItem({
        price: 30,
        priceQuantity: 1,
        priceUnit: 'styck',
        quantity: 4,
        unit: 'pcs',
      });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 120 });
    });

    it('treats unknown matching units as exact (no dimension required)', () => {
      const item = makeItem({
        price: 12,
        priceQuantity: 1,
        priceUnit: 'bag',
        quantity: 3,
        unit: 'bag',
      });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 36 });
    });
  });

  describe('SI conversion within mass', () => {
    it('scales 500 g shelf price for a 2 kg item', () => {
      const item = makeItem({
        price: 89,
        priceQuantity: 500,
        priceUnit: 'g',
        quantity: 2,
        unit: 'kg',
      });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 356 });
    });

    it('scales 1 kg shelf price down to 250 g of item', () => {
      const item = makeItem({
        price: 200,
        priceQuantity: 1,
        priceUnit: 'kg',
        quantity: 250,
        unit: 'g',
      });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 50 });
    });

    it('scales mg to g', () => {
      const item = makeItem({
        price: 10,
        priceQuantity: 100,
        priceUnit: 'g',
        quantity: 500,
        unit: 'mg',
      });
      const result = computePrice(item);
      expect(result.kind).toBe('exact');
      expect((result as { kind: 'exact'; total: number }).total).toBeCloseTo(0.05, 5);
    });
  });

  describe('SI conversion within volume', () => {
    it('scales 1000 ml shelf price for a 2 L item', () => {
      const item = makeItem({
        price: 16.9,
        priceQuantity: 1000,
        priceUnit: 'ml',
        quantity: 2,
        unit: 'L',
      });
      const result = computePrice(item);
      expect(result.kind).toBe('exact');
      expect((result as { kind: 'exact'; total: number }).total).toBeCloseTo(33.8, 5);
    });

    it('scales 1 L shelf price down to 1 dl of item', () => {
      const item = makeItem({
        price: 20,
        priceQuantity: 1,
        priceUnit: 'L',
        quantity: 1,
        unit: 'dl',
      });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 2 });
    });

    it('scales cl to L', () => {
      const item = makeItem({
        price: 50,
        priceQuantity: 1,
        priceUnit: 'L',
        quantity: 25,
        unit: 'cl',
      });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 12.5 });
    });
  });

  describe('approximate (cross-dimension or unknown)', () => {
    it('marks pcs item with kg shelf price as approximate', () => {
      const item = makeItem({
        price: 39.9,
        priceQuantity: 1,
        priceUnit: 'kg',
        quantity: 3,
        unit: 'pcs',
      });
      expect(computePrice(item)).toEqual({
        kind: 'approximate',
        shelfPrice: 39.9,
        shelfQuantity: 1,
        shelfUnit: 'kg',
      });
    });

    it('marks unknown shelf unit as approximate', () => {
      const item = makeItem({
        price: 50,
        priceQuantity: 1,
        priceUnit: 'wedge',
        quantity: 2,
        unit: 'pcs',
      });
      expect(computePrice(item)).toEqual({
        kind: 'approximate',
        shelfPrice: 50,
        shelfQuantity: 1,
        shelfUnit: 'wedge',
      });
    });

    it('marks unknown item unit as approximate', () => {
      const item = makeItem({
        price: 50,
        priceQuantity: 1,
        priceUnit: 'kg',
        quantity: 2,
        unit: 'bunch',
      });
      expect(computePrice(item)).toEqual({
        kind: 'approximate',
        shelfPrice: 50,
        shelfQuantity: 1,
        shelfUnit: 'kg',
      });
    });

    it('marks priceQuantity of 0 as approximate (avoids division by zero)', () => {
      const item = makeItem({
        price: 50,
        priceQuantity: 0,
        priceUnit: 'kg',
        quantity: 2,
        unit: 'kg',
      });
      expect(computePrice(item)).toEqual({
        kind: 'approximate',
        shelfPrice: 50,
        shelfQuantity: 0,
        shelfUnit: 'kg',
      });
    });
  });

  describe('sizePerPiece bridge', () => {
    it('converts pcs item to shelf mass via grams-per-piece', () => {
      const item = makeItem({
        price: 29.9,
        priceQuantity: 1,
        priceUnit: 'kg',
        quantity: 4,
        unit: 'pcs',
        sizePerPieceQuantity: 70,
        sizePerPieceUnit: 'g',
      });
      const result = computePrice(item);
      expect(result.kind).toBe('exact');
      expect((result as { kind: 'exact'; total: number }).total).toBeCloseTo(8.372, 3);
    });

    it('converts pcs item to shelf volume via ml-per-piece', () => {
      const item = makeItem({
        price: 16.9,
        priceQuantity: 1,
        priceUnit: 'L',
        quantity: 2,
        unit: 'pcs',
        sizePerPieceQuantity: 500,
        sizePerPieceUnit: 'ml',
      });
      const result = computePrice(item);
      expect(result.kind).toBe('exact');
      expect((result as { kind: 'exact'; total: number }).total).toBeCloseTo(16.9, 5);
    });

    it('converts shelf-pcs price to item mass via grams-per-piece', () => {
      const item = makeItem({
        price: 17.9,
        priceQuantity: 1,
        priceUnit: 'pcs',
        quantity: 2,
        unit: 'kg',
        sizePerPieceQuantity: 500,
        sizePerPieceUnit: 'g',
      });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 71.6 });
    });

    it('falls back to approximate when sizePerPiece dimension does not match', () => {
      const item = makeItem({
        price: 29.9,
        priceQuantity: 1,
        priceUnit: 'kg',
        quantity: 4,
        unit: 'pcs',
        sizePerPieceQuantity: 500,
        sizePerPieceUnit: 'ml',
      });
      const result = computePrice(item);
      expect(result.kind).toBe('approximate');
    });

    it('ignores sizePerPiece when units match directly', () => {
      const item = makeItem({
        price: 5,
        priceQuantity: 1,
        priceUnit: 'pcs',
        quantity: 3,
        unit: 'pcs',
        sizePerPieceQuantity: 70,
        sizePerPieceUnit: 'g',
      });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 15 });
    });

    it('falls back to approximate when sizePerPiece is incomplete', () => {
      const item = makeItem({
        price: 29.9,
        priceQuantity: 1,
        priceUnit: 'kg',
        quantity: 4,
        unit: 'pcs',
        sizePerPieceQuantity: 70,
        sizePerPieceUnit: null,
      });
      const result = computePrice(item);
      expect(result.kind).toBe('approximate');
    });
  });

  describe('legacy data (null price unit fields)', () => {
    it('treats unitless item with unitless shelf price as per-item', () => {
      const item = makeItem({
        price: 10,
        priceQuantity: null,
        priceUnit: null,
        quantity: 3,
        unit: null,
      });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 30 });
    });

    it('treats pcs item with null shelf unit as exact (null defaults to pcs)', () => {
      const item = makeItem({
        price: 10,
        priceQuantity: null,
        priceUnit: null,
        quantity: 2,
        unit: 'pcs',
      });
      expect(computePrice(item)).toEqual({ kind: 'exact', total: 20 });
    });

    it('marks kg item with null shelf unit as approximate (no longer silently multiplies)', () => {
      const item = makeItem({
        price: 10,
        priceQuantity: null,
        priceUnit: null,
        quantity: 2,
        unit: 'kg',
      });
      const result = computePrice(item);
      expect(result.kind).toBe('approximate');
    });
  });
});

describe('effectivePrice', () => {
  it('returns total for exact prices', () => {
    const item = makeItem({
      price: 89,
      priceQuantity: 500,
      priceUnit: 'g',
      quantity: 2,
      unit: 'kg',
    });
    expect(effectivePrice(item)).toBe(356);
  });

  it('returns null for approximate prices (so category totals do not inflate)', () => {
    const item = makeItem({
      price: 39.9,
      priceQuantity: 1,
      priceUnit: 'kg',
      quantity: 3,
      unit: 'pcs',
    });
    expect(effectivePrice(item)).toBeNull();
  });

  it('returns null when no price is set', () => {
    const item = makeItem({ price: null });
    expect(effectivePrice(item)).toBeNull();
  });

  it('returns the raw price when quantity is null', () => {
    const item = makeItem({ price: 25, quantity: null });
    expect(effectivePrice(item)).toBe(25);
  });
});
