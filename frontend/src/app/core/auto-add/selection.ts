import type { Item } from '../../models/item.model';
import type { ItemId } from '../../models/ids.model';
import {
  findDueItems,
  type Candidate,
  type PurchaseHistory,
  type RecurrencePolicy,
} from './recurrence';

/**
 * The decision half of auto-add: given the policy and the current state, which
 * items should the app put back on the list?
 *
 * Kept pure and separate from the effect that performs the writes, so the same
 * code the app runs is the code the acceptance tests exercise — and so the
 * ordering rules below are stated once rather than re-implemented per caller.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Why an evaluation declined to do anything. */
export type SkipReason =
  | 'disabled'
  | 'not-installed'
  | 'session-active'
  | 'at-capacity';

export interface AutoAddState {
  /** The shared account setting. */
  enabled: boolean;
  /** Whether the app is running as an installed PWA. */
  installed: boolean;
  /** Whether a shopping trip is in progress for this account. */
  hasActiveSession: boolean;
  /** How many auto-added items are already on the list. */
  activeAutoCount: number;
}

/**
 * The gates that need no reads, in the order they should be applied — cheapest
 * first, so a skip costs nothing.
 *
 * Returns null when the evaluation may proceed.
 */
export function blockingReason(
  state: AutoAddState,
  policy: RecurrencePolicy,
): SkipReason | null {
  if (!state.enabled) return 'disabled';
  // Auto-add only fires when someone opens the app, so on an uninstalled app it
  // would seldom run at all — better to withhold the feature than to keep a
  // promise badly.
  if (!state.installed) return 'not-installed';
  // Injecting items into a list someone is shopping from moves things under them
  // mid-trip.
  if (state.hasActiveSession) return 'session-active';
  if (remainingCapacity(state.activeAutoCount, policy) <= 0) return 'at-capacity';
  return null;
}

/** How many more items the app may add before hitting its own limit. */
export function remainingCapacity(
  activeAutoCount: number,
  policy: RecurrencePolicy,
): number {
  return Math.max(0, policy.maxAutoItems - activeAutoCount);
}

/**
 * Whether an item's own stored state permits adding it right now.
 *
 * Separate from the cadence maths because it is about the conversation with the
 * user rather than the purchase rhythm: a removal is a refusal, and re-adding
 * something the app only just added would read as nagging.
 */
export function isEligibleForAutoAdd(
  item: Item | undefined,
  now: number,
  policy: RecurrencePolicy,
): boolean {
  if (!item) return false;
  if (!item.removed) return false;
  if (
    item.autoAddDeclinedAt !== null &&
    now - item.autoAddDeclinedAt < policy.declineSuppressDays * DAY_MS
  ) {
    return false;
  }
  if (
    item.autoAddedAt !== null &&
    now - item.autoAddedAt < policy.resuggestCooldownDays * DAY_MS
  ) {
    return false;
  }
  return true;
}

/**
 * Ranks due items, drops those their own state rules out, then takes what fits.
 *
 * The cap is applied *last* on purpose: a suppressed item must not consume a
 * slot that a genuinely due item could have used.
 */
export function selectAutoAdds(
  histories: readonly PurchaseHistory[],
  lookup: (id: ItemId) => Item | undefined,
  capacity: number,
  now: number,
  policy: RecurrencePolicy,
): Candidate[] {
  if (capacity <= 0) return [];
  const ranked = findDueItems(histories, now, {
    ...policy,
    // Rank everything; the real cap is applied after the eligibility filter.
    maxAutoItems: Number.MAX_SAFE_INTEGER,
  });
  return ranked
    .filter((candidate) => isEligibleForAutoAdd(lookup(candidate.itemId), now, policy))
    .slice(0, capacity);
}
