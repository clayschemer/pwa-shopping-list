import { describe, expect, it } from 'vitest';
import type { ItemId } from '../../models/ids.model';
import {
  DEFAULT_POLICY,
  findDueItems,
  type PurchaseHistory,
  type RecurrencePolicy,
} from './recurrence';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 27);

/** Purchases every `intervalDays`, `count` of them, the last one `agoDays` ago. */
function rhythm(
  id: string,
  intervalDays: number,
  count: number,
  agoDays: number,
): PurchaseHistory {
  const last = NOW - agoDays * DAY;
  const checkedAt: number[] = [];
  for (let i = count - 1; i >= 0; i--) {
    checkedAt.push(last - i * intervalDays * DAY);
  }
  return { itemId: id as ItemId, checkedAt };
}

/** Explicit purchase days-ago list, most recent last. */
function at(id: string, daysAgo: number[]): PurchaseHistory {
  return {
    itemId: id as ItemId,
    checkedAt: daysAgo.map((d) => NOW - d * DAY),
  };
}

function ids(histories: PurchaseHistory[], policy?: Partial<RecurrencePolicy>) {
  return findDueItems(histories, NOW, { ...DEFAULT_POLICY, ...policy }).map((c) => c.itemId);
}

describe('findDueItems', () => {
  describe('the trigger', () => {
    it('selects an item bought at a steady interval once that interval has elapsed', () => {
      // Bought every 7 days, 5 times, last purchase 8 days ago — overdue.
      expect(ids([rhythm('milk', 7, 5, 8)])).toEqual(['milk']);
    });

    it('does not select an item before its interval has elapsed', () => {
      expect(ids([rhythm('milk', 7, 5, 3)])).toEqual([]);
    });

    it('selects an item exactly at its interval', () => {
      // The boundary is inclusive: "due" means the usual gap has been reached.
      expect(ids([rhythm('milk', 7, 5, 7)])).toEqual(['milk']);
    });

    it('reports the median interval, elapsed days and purchase count on the reason', () => {
      const [candidate] = findDueItems([rhythm('milk', 7, 5, 9)], NOW, DEFAULT_POLICY);
      expect(candidate.reason).toEqual({
        kind: 'periodicity',
        medianIntervalDays: 7,
        daysSinceLastPurchase: 9,
        purchaseCount: 5,
      });
    });
  });

  describe('sample size', () => {
    it('ignores an item with too few purchases to establish an interval', () => {
      // 3 purchases = 2 intervals, below the default minimum of 3 intervals.
      expect(ids([rhythm('milk', 7, 3, 30)])).toEqual([]);
    });

    it('accepts an item at exactly the minimum number of intervals', () => {
      // 4 purchases = 3 intervals.
      expect(ids([rhythm('milk', 7, 4, 8)])).toEqual(['milk']);
    });

    it('ignores an item bought only once', () => {
      expect(ids([at('pan', [200])])).toEqual([]);
    });
  });

  describe('median rather than mean', () => {
    it('still selects a regular item whose mean is inflated by one long gap', () => {
      // Six weekly purchases with a 12-week holiday gap in the middle.
      // Intervals: 7, 7, 84, 7, 7 -> median 7, mean 22.4.
      // Elapsed is 9 days: due on the median, not yet due on the mean.
      const history = at('milk', [121, 114, 107, 23, 16, 9]);
      expect(ids([history])).toEqual([]);
      // ...because the same gap makes it fail the variability guard. Relaxing
      // only that guard shows the median itself does treat the item as due.
      expect(ids([history], { maxCoefficientOfVariation: 10 })).toEqual(['milk']);
    });

    it('uses the mean of the two middle intervals for an even count', () => {
      // Intervals 4, 6, 6, 8 -> median (6+6)/2 = 6.
      const [candidate] = findDueItems([at('x', [24, 20, 14, 8, 0])], NOW, {
        ...DEFAULT_POLICY,
        // Last purchase is today, so relax the due check to inspect the median.
        maxLapseFactor: 100,
      });
      expect(candidate).toBeUndefined();
      const [due] = findDueItems([at('x', [30, 26, 20, 14, 6])], NOW, DEFAULT_POLICY);
      expect(due.reason.medianIntervalDays).toBe(6);
    });
  });

  describe('the variability guard', () => {
    it('ignores an item bought at wildly varying intervals', () => {
      // Intervals: 2, 40, 3, 60 — no rhythm to predict.
      expect(ids([at('crisps', [115, 113, 73, 70, 10])])).toEqual([]);
    });

    it('accepts an item with mild variation around its interval', () => {
      // Intervals: 7, 8, 6, 7 — coefficient of variation well under the limit.
      expect(ids([at('milk', [36, 29, 21, 15, 8])])).toEqual(['milk']);
    });
  });

  describe('the maximum interval', () => {
    it('ignores an item bought regularly but only rarely', () => {
      // Every 120 days — a seasonal or one-off purchase, not a staple.
      expect(ids([rhythm('filter', 120, 5, 130)])).toEqual([]);
    });

    it('accepts an item at exactly the maximum interval', () => {
      expect(ids([rhythm('filter', 60, 5, 61)])).toEqual(['filter']);
    });
  });

  describe('the lapse guard', () => {
    it('ignores an item whose habit has clearly ended', () => {
      // Weekly for months, then nothing for most of a year.
      expect(ids([rhythm('kombucha', 7, 6, 300)])).toEqual([]);
    });

    it('accepts an item just inside the lapse limit', () => {
      // Default lapse factor is 3x the median.
      expect(ids([rhythm('milk', 7, 5, 20)])).toEqual(['milk']);
    });

    it('ignores an item just outside the lapse limit', () => {
      expect(ids([rhythm('milk', 7, 5, 22)])).toEqual([]);
    });
  });

  describe('same-session purchases', () => {
    it('treats purchases logged within the same trip as one purchase', () => {
      // Two checks a few minutes apart must not read as a zero-day interval,
      // which would wreck both the median and the variability guard.
      const base = NOW - 8 * DAY;
      const history: PurchaseHistory = {
        itemId: 'milk' as ItemId,
        checkedAt: [
          base - 21 * DAY,
          base - 14 * DAY,
          base - 7 * DAY,
          base,
          base + 5 * 60 * 1000,
        ],
      };
      const [candidate] = findDueItems([history], NOW, DEFAULT_POLICY);
      expect(candidate.reason.medianIntervalDays).toBe(7);
      expect(candidate.reason.purchaseCount).toBe(4);
    });

    it('collapses to the earliest timestamp within the session window', () => {
      // The later duplicate must not shorten the elapsed time either.
      const history: PurchaseHistory = {
        itemId: 'milk' as ItemId,
        checkedAt: [
          NOW - 29 * DAY,
          NOW - 22 * DAY,
          NOW - 15 * DAY,
          NOW - 8 * DAY,
          NOW - 8 * DAY + 30 * 60 * 1000,
        ],
      };
      const [candidate] = findDueItems([history], NOW, DEFAULT_POLICY);
      expect(candidate.reason.daysSinceLastPurchase).toBe(8);
    });
  });

  describe('ordering and the cap', () => {
    it('orders the most overdue item first', () => {
      const result = ids([
        rhythm('slightly', 7, 5, 8), // 1.14x overdue
        rhythm('very', 7, 5, 18), // 2.57x overdue
        rhythm('somewhat', 7, 5, 12), // 1.71x overdue
      ]);
      expect(result).toEqual(['very', 'somewhat', 'slightly']);
    });

    it('scores by overdue ratio rather than absolute days', () => {
      // 30 days overdue on a 60-day rhythm (1.5x) is less urgent than
      // 14 days overdue on a 7-day rhythm (3x).
      expect(ids([rhythm('monthly', 60, 5, 90), rhythm('weekly', 7, 5, 21)])).toEqual([
        'weekly',
        'monthly',
      ]);
    });

    it('returns no more than the configured limit', () => {
      const histories = Array.from({ length: 9 }, (_, i) =>
        rhythm(`item-${i}`, 7, 5, 8 + i),
      );
      expect(ids(histories, { maxAutoItems: 3 })).toHaveLength(3);
    });

    it('keeps the most overdue items when the limit bites', () => {
      const histories = Array.from({ length: 5 }, (_, i) =>
        rhythm(`item-${i}`, 7, 5, 8 + i * 2),
      );
      // item-4 is the most overdue, item-0 the least.
      expect(ids(histories, { maxAutoItems: 2 })).toEqual(['item-4', 'item-3']);
    });
  });

  describe('edge cases', () => {
    it('returns nothing for an empty history set', () => {
      expect(ids([])).toEqual([]);
    });

    it('ignores an item with no purchases at all', () => {
      expect(ids([{ itemId: 'ghost' as ItemId, checkedAt: [] }])).toEqual([]);
    });

    it('ignores timestamps in the future rather than producing negative intervals', () => {
      const history: PurchaseHistory = {
        itemId: 'milk' as ItemId,
        checkedAt: [
          NOW - 29 * DAY,
          NOW - 22 * DAY,
          NOW - 15 * DAY,
          NOW - 8 * DAY,
          NOW + 5 * DAY,
        ],
      };
      const [candidate] = findDueItems([history], NOW, DEFAULT_POLICY);
      expect(candidate.reason.daysSinceLastPurchase).toBe(8);
    });

    it('does not mutate the histories it is given', () => {
      const history = rhythm('milk', 7, 5, 8);
      const snapshot = [...history.checkedAt];
      findDueItems([history], NOW, DEFAULT_POLICY);
      expect(history.checkedAt).toEqual(snapshot);
    });

    it('rounds reported days to whole numbers', () => {
      // Purchases offset by part of a day must not surface fractional days in
      // the reason, which is rendered directly to the user.
      const history = rhythm('milk', 7, 5, 8);
      history.checkedAt = history.checkedAt.map((t) => t - 7 * 60 * 60 * 1000);
      const [candidate] = findDueItems([history], NOW, DEFAULT_POLICY);
      expect(Number.isInteger(candidate.reason.medianIntervalDays)).toBe(true);
      expect(Number.isInteger(candidate.reason.daysSinceLastPurchase)).toBe(true);
    });
  });

  describe('DEFAULT_POLICY', () => {
    it('is conservative enough that a single long gap cannot qualify an item', () => {
      expect(DEFAULT_POLICY.minIntervals).toBeGreaterThanOrEqual(3);
      expect(DEFAULT_POLICY.maxMedianDays).toBeLessThanOrEqual(60);
      expect(DEFAULT_POLICY.maxAutoItems).toBeLessThanOrEqual(5);
    });
  });
});
