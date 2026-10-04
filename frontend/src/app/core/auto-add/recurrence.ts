import type { ItemId } from '../../models/ids.model';
import type { AutoAddReason } from '../../models/item.model';

/**
 * Periodicity detection for auto-add.
 *
 * Deliberately free of Angular, RxJS and Firestore imports: this is the only
 * part of the feature with non-trivial logic, and keeping it a pure function
 * over plain data means it can be exercised exhaustively in tests and lifted
 * into a Web Worker or a server runtime without modification if the measured
 * cost ever justifies it.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Purchases closer together than this are treated as one.
 *
 * Checking an item twice during a single trip (a mis-tap, or two packs logged
 * separately) would otherwise register as a near-zero interval, which drags the
 * median down and inflates the variability measure enough to disqualify the
 * item outright. Six hours comfortably spans a shopping trip without merging
 * two genuine purchases on consecutive days.
 */
const SAME_TRIP_WINDOW_MS = 6 * 60 * 60 * 1000;

export interface PurchaseHistory {
  itemId: ItemId;
  /** Check timestamps in any order; duplicates within one trip are collapsed. */
  checkedAt: number[];
}

export interface Candidate {
  itemId: ItemId;
  reason: AutoAddReason;
  /** How far past due, as a multiple of the median interval. Higher is more urgent. */
  score: number;
}

export interface RecurrencePolicy {
  /**
   * Minimum number of *intervals* (so one more purchase than this) before an
   * item is considered to have a rhythm at all.
   */
  minIntervals: number;
  /**
   * Longest median interval still treated as recurring. Above this an item is a
   * one-off or a seasonal purchase — a frying pan, a set of bulbs — which would
   * otherwise qualify eventually simply by virtue of enough time passing.
   */
  maxMedianDays: number;
  /**
   * Ceiling on stddev/mean of the intervals. An item bought at 2, 40, 3 and 60
   * day gaps has no predictable rhythm, so any prediction would be noise.
   */
  maxCoefficientOfVariation: number;
  /**
   * How many multiples of the median may elapse before the habit is considered
   * over. Without this, something bought weekly a year ago stays "overdue"
   * forever and gets resurrected long after the household stopped wanting it.
   */
  maxLapseFactor: number;
  /** Most items the app may have on the list at once. */
  maxAutoItems: number;
  /**
   * How long a user's removal of an auto-added item suppresses re-adding it.
   * Not read here — applied by the caller against stored item state — but kept
   * on the policy so all tuning lives in one place.
   */
  declineSuppressDays: number;
  /** Minimum gap between auto-adds of the same item. Applied by the caller. */
  resuggestCooldownDays: number;
}

export const DEFAULT_POLICY: RecurrencePolicy = {
  minIntervals: 3,
  maxMedianDays: 60,
  maxCoefficientOfVariation: 0.6,
  maxLapseFactor: 3,
  maxAutoItems: 5,
  declineSuppressDays: 30,
  resuggestCooldownDays: 7,
};

/** Ascending, future timestamps dropped, same-trip duplicates collapsed to the earliest. */
function normalisePurchases(checkedAt: readonly number[], now: number): number[] {
  const sorted = checkedAt.filter((t) => Number.isFinite(t) && t <= now).sort((a, b) => a - b);
  const out: number[] = [];
  for (const t of sorted) {
    const previous = out[out.length - 1];
    if (previous !== undefined && t - previous <= SAME_TRIP_WINDOW_MS) continue;
    out.push(t);
  }
  return out;
}

function median(sortedAscending: readonly number[]): number {
  const n = sortedAscending.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 0
    ? (sortedAscending[mid - 1] + sortedAscending[mid]) / 2
    : sortedAscending[mid];
}

function coefficientOfVariation(values: readonly number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (mean <= 0) return Number.POSITIVE_INFINITY;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Selects items whose usual purchase interval has elapsed, most overdue first.
 *
 * Every guard is a rejection rather than a weighting: on a list two people
 * share, an item nobody asked for is more costly than a reminder that arrives
 * late, so the policy only fires on items with a clear, current rhythm.
 *
 * Does not consider whether an item is currently on the list, recently
 * declined, or recently added — that state lives on the item, not in the
 * purchase log, and is applied by the caller.
 */
export function findDueItems(
  histories: readonly PurchaseHistory[],
  now: number,
  policy: RecurrencePolicy = DEFAULT_POLICY,
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const history of histories) {
    const purchases = normalisePurchases(history.checkedAt, now);
    if (purchases.length <= policy.minIntervals) continue;

    const intervals: number[] = [];
    for (let i = 1; i < purchases.length; i++) {
      intervals.push((purchases[i] - purchases[i - 1]) / DAY_MS);
    }

    const medianDays = median([...intervals].sort((a, b) => a - b));
    if (medianDays <= 0 || medianDays > policy.maxMedianDays) continue;
    if (coefficientOfVariation(intervals) > policy.maxCoefficientOfVariation) continue;

    const daysSince = (now - purchases[purchases.length - 1]) / DAY_MS;
    if (daysSince < medianDays) continue;
    if (daysSince > medianDays * policy.maxLapseFactor) continue;

    candidates.push({
      itemId: history.itemId,
      // Rounded because these numbers are rendered to the user as-is; the
      // comparisons above deliberately use the unrounded values.
      reason: {
        kind: 'periodicity',
        medianIntervalDays: Math.round(medianDays),
        daysSinceLastPurchase: Math.round(daysSince),
        purchaseCount: purchases.length,
      },
      score: daysSince / medianDays,
    });
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, policy.maxAutoItems);
}
