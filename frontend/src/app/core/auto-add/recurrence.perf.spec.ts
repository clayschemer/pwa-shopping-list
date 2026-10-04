import { describe, expect, it } from 'vitest';
import type { ItemId } from '../../models/ids.model';
import { DEFAULT_POLICY, findDueItems, type PurchaseHistory } from './recurrence';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Guards the one part of auto-add that occupies the main thread.
 *
 * The evaluation runs on app open, so a complexity regression here would show
 * up as jank on a phone rather than as a failure anywhere. The ceiling is
 * deliberately generous — this is a check against accidental quadratic
 * behaviour, not a benchmark, and it has to hold on slow CI hardware.
 */
describe('findDueItems performance', () => {
  const SESSIONS = 200;
  const ITEMS_PER_SESSION = 30;
  const DISTINCT_ITEMS = 400;
  const CEILING_MS = 50;

  /**
   * A worst-case-shaped corpus: the read cap of 200 sessions, a fuller basket
   * than the app realistically sees, and enough distinct items that most fail
   * the guards late rather than being rejected on sample size immediately.
   */
  function buildCorpus(): PurchaseHistory[] {
    const now = Date.now();
    const byItem = new Map<string, number[]>();
    for (let s = 0; s < SESSIONS; s++) {
      const sessionAt = now - s * 3 * DAY;
      for (let i = 0; i < ITEMS_PER_SESSION; i++) {
        const itemId = `item-${(s * ITEMS_PER_SESSION + i) % DISTINCT_ITEMS}`;
        const existing = byItem.get(itemId);
        if (existing) existing.push(sessionAt);
        else byItem.set(itemId, [sessionAt]);
      }
    }
    return [...byItem.entries()].map(([itemId, checkedAt]) => ({
      itemId: itemId as ItemId,
      checkedAt,
    }));
  }

  it('evaluates a full history corpus well inside the frame budget', () => {
    const histories = buildCorpus();
    const entryCount = histories.reduce((sum, h) => sum + h.checkedAt.length, 0);
    expect(entryCount).toBe(SESSIONS * ITEMS_PER_SESSION);

    const started = performance.now();
    findDueItems(histories, Date.now(), DEFAULT_POLICY);
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(CEILING_MS);
  });

  /**
   * Catches the failure mode the corpus above can miss on a fast machine:
   * work that grows faster than the data does.
   *
   * Stated as an absolute bound on a deliberately oversized corpus rather than
   * as a ratio between two timings — at these speeds the smaller measurement
   * lands under a millisecond, so a ratio is dominated by timer noise and
   * machine load, which made this assertion flaky. Linear work over 4x the read
   * cap stays in single-digit milliseconds; anything quadratic in the number of
   * entries lands orders of magnitude above this ceiling.
   */
  it('stays fast on a corpus four times the read cap', () => {
    const now = Date.now();
    const oversized: PurchaseHistory[] = [];
    for (let copy = 0; copy < 4; copy++) {
      for (const history of buildCorpus()) {
        oversized.push({
          itemId: `${history.itemId}-${copy}` as PurchaseHistory['itemId'],
          checkedAt: history.checkedAt,
        });
      }
    }
    expect(oversized.reduce((sum, h) => sum + h.checkedAt.length, 0)).toBe(
      4 * SESSIONS * ITEMS_PER_SESSION,
    );

    findDueItems(oversized, now, DEFAULT_POLICY); // warm up
    const started = performance.now();
    findDueItems(oversized, now, DEFAULT_POLICY);
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(4 * CEILING_MS);
  });
});
