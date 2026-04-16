import { describe, it, expect } from 'vitest';
import { selectActiveItems } from './items.selectors';
import type { Item } from '../../models/item.model';
import type { AccountId, ItemId } from '../../models/ids.model';

const item = (id: string, removed = false): Item =>
  ({
    id: id as ItemId,
    accountId: 'a1' as AccountId,
    name: id,
    description: null,
    quantity: null,
    unit: null,
    primaryCategoryId: null,
    secondaryCategoryIds: [],
    removed,
    removedAt: null,
    addedBy: 'user',
    aiMotivation: null,
    price: null,
    priceQuantity: null,
    priceUnit: null,
    priceUpdatedAt: null,
    purchaseCount: 0,
  }) as Item;

describe('selectActiveItems', () => {
  it('filters out removed items', () => {
    const result = selectActiveItems.projector([
      item('i1'),
      item('i2', true),
      item('i3'),
    ]);
    expect(result.map((i) => i.id)).toEqual(['i1', 'i3']);
  });
});
