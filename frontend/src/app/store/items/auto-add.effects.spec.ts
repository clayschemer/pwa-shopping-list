import '../../../testing/init-testbed';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import {
  AutoAddEffects,
  HISTORY_SESSION_LIMIT,
  MIN_RUN_GAP_HOURS,
  toPurchaseHistories,
} from './auto-add.effects';
import { AccountApiService } from '../../core/api/account-api.service';
import { ItemApiService } from '../../core/api/item-api.service';
import { SessionApiService } from '../../core/api/session-api.service';
import { PwaInstallService } from '../../core/pwa/pwa-install.service';
import { DEFAULT_POLICY } from '../../core/auto-add/recurrence';
import { selectAutoAddEnabled } from '../account/account.selectors';
import { selectActiveSessions, selectSessionsLoaded } from '../sessions/sessions.selectors';
import { selectActiveItems, selectItemsLoaded } from './items.selectors';
import type { Item } from '../../models/item.model';
import type { Session } from '../../models/session.model';
import type { AccountId, ItemId, SessionId, UserId } from '../../models/ids.model';

const DAY = 24 * 60 * 60 * 1000;

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

/**
 * Completed trips in which `itemId` was bought every `intervalDays`, the last
 * one `lastAgoDays` ago — enough purchases to clear the sample-size guard.
 */
function weeklyHistory(
  itemId: string,
  { intervalDays = 7, purchases = 5, lastAgoDays = 9 } = {},
): Session[] {
  const sessions: Session[] = [];
  for (let i = 0; i < purchases; i++) {
    const checkedAt = Date.now() - (lastAgoDays + i * intervalDays) * DAY;
    sessions.push({
      id: `s-${itemId}-${i}` as SessionId,
      accountId: 'a1' as AccountId,
      shopId: null,
      participants: ['u1' as UserId],
      startedBy: 'u1' as UserId,
      startedAt: checkedAt,
      completedAt: checkedAt,
      checkedItems: [
        {
          itemId: itemId as ItemId,
          checkedBy: 'u1' as UserId,
          checkedAt,
          priceSnapshot: null,
          priceQuantitySnapshot: null,
          priceUnitSnapshot: null,
          nameSnapshot: itemId,
          quantitySnapshot: null,
          unitSnapshot: null,
        },
      ],
    });
  }
  return sessions;
}

interface SetupOptions {
  enabled?: boolean;
  installed?: boolean;
  activeItems?: Item[];
  activeSessions?: Session[];
  claimed?: boolean;
  history?: Session[];
  allItems?: Item[];
  itemsLoaded?: boolean;
  sessionsLoaded?: boolean;
  historyRejects?: boolean;
  autoAddRejects?: boolean;
}

describe('AutoAddEffects', () => {
  let accountApi: {
    claimAutoAddRun: ReturnType<typeof vi.fn>;
    recordAutoAddRunTimings: ReturnType<typeof vi.fn>;
  };
  let itemApi: {
    fetchAllItems: ReturnType<typeof vi.fn>;
    autoAddItem: ReturnType<typeof vi.fn>;
  };
  let sessionApi: { fetchSessionHistory: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  /** Builds the effect with every gate open unless overridden, and runs it. */
  async function run(options: SetupOptions = {}): Promise<AutoAddEffects> {
    const {
      enabled = true,
      installed = true,
      activeItems = [],
      activeSessions = [],
      claimed = true,
      history = weeklyHistory('milk'),
      allItems = [makeItem('milk')],
      itemsLoaded = true,
      sessionsLoaded = true,
      historyRejects = false,
      autoAddRejects = false,
    } = options;

    accountApi = {
      claimAutoAddRun: vi.fn().mockResolvedValue(claimed),
      recordAutoAddRunTimings: vi.fn().mockResolvedValue(undefined),
    };
    itemApi = {
      fetchAllItems: vi.fn().mockResolvedValue(allItems),
      autoAddItem: autoAddRejects
        ? vi.fn().mockRejectedValue(new Error('permission denied'))
        : vi.fn().mockResolvedValue(undefined),
    };
    sessionApi = {
      fetchSessionHistory: historyRejects
        ? vi.fn().mockRejectedValue(new Error('offline'))
        : vi.fn().mockResolvedValue(history),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AutoAddEffects,
        provideMockActions(() => new Subject()),
        provideMockStore({
          selectors: [
            { selector: selectItemsLoaded, value: itemsLoaded },
            { selector: selectSessionsLoaded, value: sessionsLoaded },
            { selector: selectAutoAddEnabled, value: enabled },
            { selector: selectActiveItems, value: activeItems },
            { selector: selectActiveSessions, value: activeSessions },
          ],
        }),
        { provide: AccountApiService, useValue: accountApi },
        { provide: ItemApiService, useValue: itemApi },
        { provide: SessionApiService, useValue: sessionApi },
        { provide: PwaInstallService, useValue: { isInstalled: () => installed } },
      ],
    });

    const effects = TestBed.inject(AutoAddEffects);
    effects.evaluateOnBoot$.subscribe();
    // Let the async evaluation settle.
    await new Promise((resolve) => setTimeout(resolve, 0));
    return effects;
  }

  describe('gates, cheapest first', () => {
    it('adds a due item when every gate is open', async () => {
      await run();

      expect(itemApi.autoAddItem).toHaveBeenCalledOnce();
      const [itemId, reason] = itemApi.autoAddItem.mock.calls[0];
      expect(itemId).toBe('milk');
      expect(reason).toMatchObject({ kind: 'periodicity', medianIntervalDays: 7 });
    });

    it('does nothing at all when the setting is disabled', async () => {
      await run({ enabled: false });

      expect(accountApi.claimAutoAddRun).not.toHaveBeenCalled();
      expect(sessionApi.fetchSessionHistory).not.toHaveBeenCalled();
      expect(itemApi.autoAddItem).not.toHaveBeenCalled();
    });

    /**
     * The feature is only offered on an installed app, so an uninstall must stop
     * it even though the stored setting is still on.
     */
    it('does nothing when the app is not installed', async () => {
      await run({ installed: false });

      expect(accountApi.claimAutoAddRun).not.toHaveBeenCalled();
      expect(itemApi.autoAddItem).not.toHaveBeenCalled();
    });

    it('does nothing while a shopping trip is in progress', async () => {
      const session: Session = {
        ...weeklyHistory('bread')[0],
        completedAt: null,
      };

      await run({ activeSessions: [session] });

      expect(accountApi.claimAutoAddRun).not.toHaveBeenCalled();
      expect(itemApi.autoAddItem).not.toHaveBeenCalled();
    });

    it('does nothing when the list is already at the auto-add limit', async () => {
      const full = Array.from({ length: DEFAULT_POLICY.maxAutoItems }, (_, i) =>
        makeItem(`auto-${i}`, { removed: false, addedBy: 'auto' }),
      );

      await run({ activeItems: full });

      expect(accountApi.claimAutoAddRun).not.toHaveBeenCalled();
      expect(itemApi.autoAddItem).not.toHaveBeenCalled();
    });

    it('counts only auto-added items against the limit', async () => {
      const userItems = Array.from({ length: 20 }, (_, i) =>
        makeItem(`user-${i}`, { removed: false, addedBy: 'user' }),
      );

      await run({ activeItems: userItems });

      expect(itemApi.autoAddItem).toHaveBeenCalledOnce();
    });

    /**
     * The read-budget guard, and the reason the claim comes before the fetch:
     * the client that loses spends one read, not a few hundred.
     */
    it('stops before fetching anything when the daily claim is lost', async () => {
      await run({ claimed: false });

      expect(accountApi.claimAutoAddRun).toHaveBeenCalledWith(MIN_RUN_GAP_HOURS);
      expect(sessionApi.fetchSessionHistory).not.toHaveBeenCalled();
      expect(itemApi.fetchAllItems).not.toHaveBeenCalled();
      expect(itemApi.autoAddItem).not.toHaveBeenCalled();
    });

    it('waits until both items and sessions have loaded', async () => {
      await run({ sessionsLoaded: false });

      expect(accountApi.claimAutoAddRun).not.toHaveBeenCalled();
    });

    it('evaluates only once per app open', async () => {
      const effects = await run();
      effects.evaluateOnBoot$.subscribe();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(accountApi.claimAutoAddRun).toHaveBeenCalledOnce();
    });
  });

  describe('candidate selection', () => {
    it('reads the configured depth of history', async () => {
      await run();

      expect(sessionApi.fetchSessionHistory).toHaveBeenCalledWith(HISTORY_SESSION_LIMIT);
    });

    it('skips an item the user removed recently', async () => {
      await run({
        allItems: [makeItem('milk', { autoAddDeclinedAt: Date.now() - 2 * DAY })],
      });

      expect(itemApi.autoAddItem).not.toHaveBeenCalled();
    });

    it('adds an item whose decline has expired', async () => {
      await run({
        allItems: [
          makeItem('milk', {
            autoAddDeclinedAt:
              Date.now() - (DEFAULT_POLICY.declineSuppressDays + 1) * DAY,
          }),
        ],
      });

      expect(itemApi.autoAddItem).toHaveBeenCalledOnce();
    });

    it('skips an item it added only days ago', async () => {
      await run({
        allItems: [makeItem('milk', { autoAddedAt: Date.now() - 1 * DAY })],
      });

      expect(itemApi.autoAddItem).not.toHaveBeenCalled();
    });

    it('skips an item that is already back on the list', async () => {
      await run({ allItems: [makeItem('milk', { removed: false })] });

      expect(itemApi.autoAddItem).not.toHaveBeenCalled();
    });

    it('skips a candidate whose item no longer exists', async () => {
      await run({ allItems: [] });

      expect(itemApi.autoAddItem).not.toHaveBeenCalled();
    });

    /**
     * The cap is applied after the state filters, so a declined item must not
     * consume a slot a genuinely due item could have used.
     */
    it('does not let filtered-out candidates consume capacity', async () => {
      const history = [
        ...weeklyHistory('declined', { lastAgoDays: 30 }),
        ...weeklyHistory('milk', { lastAgoDays: 9 }),
      ];

      await run({
        history,
        allItems: [
          makeItem('declined', { autoAddDeclinedAt: Date.now() }),
          makeItem('milk'),
        ],
        activeItems: Array.from({ length: DEFAULT_POLICY.maxAutoItems - 1 }, (_, i) =>
          makeItem(`auto-${i}`, { removed: false, addedBy: 'auto' }),
        ),
      });

      // One slot left, and the most-overdue candidate is suppressed — the slot
      // goes to the next eligible item rather than being wasted.
      expect(itemApi.autoAddItem).toHaveBeenCalledOnce();
      expect(itemApi.autoAddItem.mock.calls[0][0]).toBe('milk');
    });

    it('adds no more items than the remaining capacity allows', async () => {
      const history = [
        ...weeklyHistory('a', { lastAgoDays: 20 }),
        ...weeklyHistory('b', { lastAgoDays: 16 }),
        ...weeklyHistory('c', { lastAgoDays: 12 }),
      ];

      await run({
        history,
        allItems: [makeItem('a'), makeItem('b'), makeItem('c')],
        activeItems: Array.from({ length: DEFAULT_POLICY.maxAutoItems - 2 }, (_, i) =>
          makeItem(`auto-${i}`, { removed: false, addedBy: 'auto' }),
        ),
      });

      expect(itemApi.autoAddItem).toHaveBeenCalledTimes(2);
      // Most overdue first.
      expect(itemApi.autoAddItem.mock.calls.map((c) => c[0])).toEqual(['a', 'b']);
    });
  });

  describe('resilience', () => {
    /**
     * A dead connection on boot must not take the effect stream down — nothing
     * is waiting on this work, and the next app open will try again.
     */
    it('survives the history fetch failing', async () => {
      await expect(run({ historyRejects: true })).resolves.toBeDefined();

      expect(itemApi.autoAddItem).not.toHaveBeenCalled();
    });

    it('survives a write being rejected', async () => {
      await expect(run({ autoAddRejects: true })).resolves.toBeDefined();

      expect(itemApi.autoAddItem).toHaveBeenCalledOnce();
    });

    it('reports timings after a completed run', async () => {
      await run();

      expect(accountApi.recordAutoAddRunTimings).toHaveBeenCalledOnce();
      const [timings] = accountApi.recordAutoAddRunTimings.mock.calls[0];
      expect(timings).toHaveProperty('totalMs');
      expect(timings).toHaveProperty('computeMs');
    });

    /** Nothing was claimed, so there is nothing worth recording. */
    it('does not report timings for a run that never started', async () => {
      await run({ enabled: false });

      expect(accountApi.recordAutoAddRunTimings).not.toHaveBeenCalled();
    });

    it('still reports timings when the run fails partway through', async () => {
      TestBed.resetTestingModule();
      const failing = {
        claimAutoAddRun: vi.fn().mockResolvedValue(true),
        recordAutoAddRunTimings: vi.fn().mockResolvedValue(undefined),
      };
      TestBed.configureTestingModule({
        providers: [
          AutoAddEffects,
          provideMockActions(() => new Subject()),
          provideMockStore({
            selectors: [
              { selector: selectItemsLoaded, value: true },
              { selector: selectSessionsLoaded, value: true },
              { selector: selectAutoAddEnabled, value: true },
              { selector: selectActiveItems, value: [] },
              { selector: selectActiveSessions, value: [] },
            ],
          }),
          { provide: AccountApiService, useValue: failing },
          {
            provide: ItemApiService,
            useValue: {
              fetchAllItems: vi.fn().mockRejectedValue(new Error('offline')),
              autoAddItem: vi.fn(),
            },
          },
          {
            provide: SessionApiService,
            useValue: { fetchSessionHistory: vi.fn().mockResolvedValue([]) },
          },
          { provide: PwaInstallService, useValue: { isInstalled: () => true } },
        ],
      });

      TestBed.inject(AutoAddEffects).evaluateOnBoot$.subscribe();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(failing.recordAutoAddRunTimings).toHaveBeenCalledOnce();
    });
  });
});

describe('toPurchaseHistories', () => {
  it('groups check timestamps per item across sessions', () => {
    const sessions = [
      ...weeklyHistory('milk', { purchases: 3 }),
      ...weeklyHistory('bread', { purchases: 2 }),
    ];

    const histories = toPurchaseHistories(sessions);

    expect(histories).toHaveLength(2);
    expect(histories.find((h) => h.itemId === 'milk')?.checkedAt).toHaveLength(3);
    expect(histories.find((h) => h.itemId === 'bread')?.checkedAt).toHaveLength(2);
  });

  it('returns nothing for sessions with no checked items', () => {
    const [session] = weeklyHistory('milk');
    expect(toPurchaseHistories([{ ...session, checkedItems: [] }])).toEqual([]);
  });
});
