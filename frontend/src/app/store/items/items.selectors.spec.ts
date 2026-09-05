import { describe, it, expect } from 'vitest';
import { selectActiveItems, selectVisibleActiveItems } from './items.selectors';
import type { PendingCheck } from './items.reducer';
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
    sizePerPieceQuantity: null,
    sizePerPieceUnit: null,
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

describe('selectVisibleActiveItems', () => {
  it('keeps checked items visible while their check is in flight or inside the undo window', () => {
    const items = [
      item('i1'), // active
      item('i2', true), // checked, undo window still open
      item('i3', true), // checked, window elapsed
      item('i4', true), // check write in flight
    ];
    const pending = {
      i4: { sessionId: 's1', startedAt: 0 } as PendingCheck,
    } as Record<ItemId, PendingCheck>;
    const recent = { i2: 0 } as Record<ItemId, number>;
    const result = selectVisibleActiveItems.projector(items, pending, recent);
    expect(result.map((i) => i.id)).toEqual(['i1', 'i2', 'i4']);
  });
});
