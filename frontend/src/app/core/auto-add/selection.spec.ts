import { describe, expect, it } from 'vitest';
import { DEFAULT_POLICY, type PurchaseHistory } from './recurrence';
import {
  blockingReason,
  isEligibleForAutoAdd,
  remainingCapacity,
  selectAutoAdds,
  type AutoAddState,
} from './selection';
import type { Item } from '../../models/item.model';
import type { AccountId, ItemId } from '../../models/ids.model';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 27);

function makeItem(id: string, overrides: Partial<Item> = {}): Item {
  return {
    id: id as ItemId,
    accountId: 'a1' as AccountId,
    name: id,
    description: null,
    quantity: null,
    unit: null,
    primaryCategoryId: null,
    secondaryCategoryIds: [],
    removed: true,
    removedAt: null,
    addedBy: 'user',
    autoAddReason: null,
    autoAddedAt: null,
    autoAddDeclinedAt: null,
    autoAddMotivation: null,
    autoAddMotivationLang: null,
    price: null,
    priceQuantity: null,
    priceUnit: null,
    priceShopId: null,
    priceProductName: null,
    priceProductUrl: null,
    priceSearchUrl: null,
    shopPrices: {},
    priceFeedback: [],
    priceUpdatedAt: null,
    priceAttemptedAt: null,
    sizePerPieceQuantity: null,
    sizePerPieceUnit: null,
    purchaseCount: 0,
    ...overrides,
  };
}

/** A steady rhythm: `purchases` buys every `intervalDays`, last one `lastAgoDays` ago. */
function rhythm(
  id: string,
  { intervalDays = 7, purchases = 5, lastAgoDays = 9 } = {},
): PurchaseHistory {
  const last = NOW - lastAgoDays * DAY;
  return {
    itemId: id as ItemId,
    checkedAt: Array.from(
      { length: purchases },
      (_, i) => last - (purchases - 1 - i) * intervalDays * DAY,
    ),
  };
}

const OPEN: AutoAddState = {
  enabled: true,
  installed: true,
  hasActiveSession: false,
  activeAutoCount: 0,
};

describe('blockingReason', () => {
  it('permits the evaluation when every gate is open', () => {
    expect(blockingReason(OPEN, DEFAULT_POLICY)).toBeNull();
  });

  it('blocks on the shared setting being off', () => {
    expect(blockingReason({ ...OPEN, enabled: false }, DEFAULT_POLICY)).toBe('disabled');
  });

  it('blocks on the app not being installed', () => {
    expect(blockingReason({ ...OPEN, installed: false }, DEFAULT_POLICY)).toBe(
      'not-installed',
    );
  });

  it('blocks while a shopping trip is in progress', () => {
    expect(blockingReason({ ...OPEN, hasActiveSession: true }, DEFAULT_POLICY)).toBe(
      'session-active',
    );
  });

  it('blocks when the list already holds as many auto-adds as allowed', () => {
    expect(
      blockingReason(
        { ...OPEN, activeAutoCount: DEFAULT_POLICY.maxAutoItems },
        DEFAULT_POLICY,
      ),
    ).toBe('at-capacity');
  });

  /**
   * The order matters: each gate below the first costs more to evaluate, and the
   * cheapest one has to be able to stop the whole thing.
   */
  it('reports the cheapest failing gate first', () => {
    const allClosed: AutoAddState = {
      enabled: false,
      installed: false,
      hasActiveSession: true,
      activeAutoCount: 99,
    };
    expect(blockingReason(allClosed, DEFAULT_POLICY)).toBe('disabled');
  });
});

describe('remainingCapacity', () => {
  it('is the full allowance on an empty list', () => {
    expect(remainingCapacity(0, DEFAULT_POLICY)).toBe(DEFAULT_POLICY.maxAutoItems);
  });

  it('shrinks as auto-added items accumulate', () => {
    expect(remainingCapacity(2, DEFAULT_POLICY)).toBe(DEFAULT_POLICY.maxAutoItems - 2);
  });

  it('never goes negative', () => {
    expect(remainingCapacity(99, DEFAULT_POLICY)).toBe(0);
  });
});

describe('isEligibleForAutoAdd', () => {
  it('rejects an item that no longer exists', () => {
    expect(isEligibleForAutoAdd(undefined, NOW, DEFAULT_POLICY)).toBe(false);
  });

  it('rejects an item already on the list', () => {
    expect(
      isEligibleForAutoAdd(makeItem('milk', { removed: false }), NOW, DEFAULT_POLICY),
    ).toBe(false);
  });

  it('accepts a removed item with no auto-add history', () => {
    expect(isEligibleForAutoAdd(makeItem('milk'), NOW, DEFAULT_POLICY)).toBe(true);
  });

  /** A removal is the user saying no, and that answer has to hold for a while. */
  it('rejects an item inside the decline window', () => {
    const item = makeItem('milk', { autoAddDeclinedAt: NOW - 5 * DAY });
    expect(isEligibleForAutoAdd(item, NOW, DEFAULT_POLICY)).toBe(false);
  });

  it('accepts an item whose decline window has expired', () => {
    const item = makeItem('milk', {
      autoAddDeclinedAt: NOW - (DEFAULT_POLICY.declineSuppressDays + 1) * DAY,
    });
    expect(isEligibleForAutoAdd(item, NOW, DEFAULT_POLICY)).toBe(true);
  });

  it('rejects an item inside the re-add cooldown', () => {
    const item = makeItem('milk', { autoAddedAt: NOW - 2 * DAY });
    expect(isEligibleForAutoAdd(item, NOW, DEFAULT_POLICY)).toBe(false);
  });

  it('accepts an item whose cooldown has passed', () => {
    const item = makeItem('milk', {
      autoAddedAt: NOW - (DEFAULT_POLICY.resuggestCooldownDays + 1) * DAY,
    });
    expect(isEligibleForAutoAdd(item, NOW, DEFAULT_POLICY)).toBe(true);
  });
});

describe('selectAutoAdds', () => {
  function lookupOf(items: Item[]) {
    const byId = new Map(items.map((i) => [i.id, i]));
    return (id: ItemId) => byId.get(id);
  }

  it('selects a due item that its own state permits', () => {
    const selected = selectAutoAdds(
      [rhythm('milk')],
      lookupOf([makeItem('milk')]),
      5,
      NOW,
      DEFAULT_POLICY,
    );

    expect(selected.map((c) => c.itemId)).toEqual(['milk']);
  });

  it('selects nothing when there is no capacity', () => {
    const selected = selectAutoAdds(
      [rhythm('milk')],
      lookupOf([makeItem('milk')]),
      0,
      NOW,
      DEFAULT_POLICY,
    );

    expect(selected).toEqual([]);
  });

  it('drops a due item that its own state rules out', () => {
    const selected = selectAutoAdds(
      [rhythm('milk')],
      lookupOf([makeItem('milk', { autoAddDeclinedAt: NOW })]),
      5,
      NOW,
      DEFAULT_POLICY,
    );

    expect(selected).toEqual([]);
  });

  it('orders the most overdue item first', () => {
    const selected = selectAutoAdds(
      [
        rhythm('a', { lastAgoDays: 9 }),
        rhythm('c', { lastAgoDays: 20 }),
        rhythm('b', { lastAgoDays: 14 }),
      ],
      lookupOf([makeItem('a'), makeItem('b'), makeItem('c')]),
      5,
      NOW,
      DEFAULT_POLICY,
    );

    expect(selected.map((c) => c.itemId)).toEqual(['c', 'b', 'a']);
  });

  it('takes no more than the capacity allows', () => {
    const selected = selectAutoAdds(
      [
        rhythm('a', { lastAgoDays: 9 }),
        rhythm('b', { lastAgoDays: 14 }),
        rhythm('c', { lastAgoDays: 20 }),
      ],
      lookupOf([makeItem('a'), makeItem('b'), makeItem('c')]),
      2,
      NOW,
      DEFAULT_POLICY,
    );

    expect(selected.map((c) => c.itemId)).toEqual(['c', 'b']);
  });

  /**
   * The reason the cap is applied after the eligibility filter rather than
   * inside the ranking: a suppressed item must not use up a slot that a
   * genuinely due item could have had.
   */
  it('does not let a suppressed item consume capacity', () => {
    const selected = selectAutoAdds(
      [rhythm('declined', { lastAgoDays: 20 }), rhythm('milk', { lastAgoDays: 9 })],
      lookupOf([
        makeItem('declined', { autoAddDeclinedAt: NOW }),
        makeItem('milk'),
      ]),
      1,
      NOW,
      DEFAULT_POLICY,
    );

    expect(selected.map((c) => c.itemId)).toEqual(['milk']);
  });
});
