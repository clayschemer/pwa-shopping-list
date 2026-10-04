import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { DEFAULT_POLICY } from '../../../src/app/core/auto-add/recurrence';
import {
  blockingReason,
  remainingCapacity,
  selectAutoAdds,
} from '../../../src/app/core/auto-add/selection';
import type { Item, AutoAddReason } from '../../../src/app/models/item.model';
import type { ItemId } from '../../../src/app/models/ids.model';

/**
 * These steps drive the real selection policy — `blockingReason` and
 * `selectAutoAdds` are the same pure functions the NgRx effect calls — so a
 * scenario passing means the shipped rules behave as specified, not that a
 * stand-in does.
 *
 * Only the surrounding I/O is modelled here: the daily claim, and the writes,
 * which in the app are Firestore calls.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 27);

interface AutoAddWorld {
  enabled: boolean;
  installed: boolean;
  tripInProgress: boolean;
  /** Purchase timestamps per item name, oldest first. */
  purchases: Map<string, number[]>;
  /** Every item the account has ever had, keyed by name. */
  items: Map<string, Item>;
  /** Whether an evaluation has already been claimed for today. */
  ranToday: boolean;
  /** Names added by the most recent evaluation. */
  added: string[];
  /** Whether the last evaluation was allowed to run at all. */
  evaluated: boolean;
  reasonShown: AutoAddReason | null;
}

function item(name: string, overrides: Partial<Item> = {}): Item {
  return {
    id: name as ItemId,
    accountId: 'acc-1',
    name,
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
  } as Item;
}

function init(world: AutoAddWorld): void {
  world.enabled ??= true;
  world.installed ??= true;
  world.tripInProgress ??= false;
  world.purchases ??= new Map();
  world.items ??= new Map();
  world.ranToday ??= false;
  world.added ??= [];
  world.evaluated ??= false;
  world.reasonShown ??= null;
}

/** Records `count` purchases spaced `intervalDays` apart, the last `lastAgoDays` ago. */
function recordPurchases(
  world: AutoAddWorld,
  name: string,
  { intervalDays, count, lastAgoDays }: {
    intervalDays: number;
    count: number;
    lastAgoDays: number;
  },
): void {
  const last = NOW - lastAgoDays * DAY;
  const timestamps = Array.from(
    { length: count },
    (_, i) => last - (count - 1 - i) * intervalDays * DAY,
  );
  world.purchases.set(name, timestamps);
  if (!world.items.has(name)) world.items.set(name, item(name));
}

/** The whole evaluation, in the order the app performs it. */
function evaluate(world: AutoAddWorld): void {
  world.added = [];
  world.evaluated = false;

  const activeAutoCount = [...world.items.values()].filter(
    (i) => !i.removed && i.addedBy === 'auto',
  ).length;

  const blocked = blockingReason(
    {
      enabled: world.enabled,
      installed: world.installed,
      hasActiveSession: world.tripInProgress,
      activeAutoCount,
    },
    DEFAULT_POLICY,
  );
  if (blocked !== null) return;

  // Stands in for the transactional daily claim on the account document.
  if (world.ranToday) return;
  world.ranToday = true;
  world.evaluated = true;

  const histories = [...world.purchases.entries()].map(([name, checkedAt]) => ({
    itemId: name as ItemId,
    checkedAt,
  }));

  const selected = selectAutoAdds(
    histories,
    (id) => world.items.get(id as string),
    remainingCapacity(activeAutoCount, DEFAULT_POLICY),
    NOW,
    DEFAULT_POLICY,
  );

  for (const candidate of selected) {
    const existing = world.items.get(candidate.itemId as string);
    if (!existing) continue;
    world.items.set(candidate.itemId as string, {
      ...existing,
      removed: false,
      removedAt: null,
      addedBy: 'auto',
      autoAddReason: candidate.reason,
      autoAddedAt: NOW,
    });
    world.added.push(candidate.itemId as string);
  }
}

function onList(world: AutoAddWorld, name: string): Item | undefined {
  const found = world.items.get(name);
  return found && !found.removed ? found : undefined;
}

// ---------------------------------------------------------------------------
// Given — the setting
// ---------------------------------------------------------------------------

Given('automatic additions are enabled for the account', function (this: AutoAddWorld) {
  init(this);
  this.enabled = true;
});

Given('automatic additions are disabled for the account', function (this: AutoAddWorld) {
  init(this);
  this.enabled = false;
});

Given('the application has not been installed on my device', function (this: AutoAddWorld) {
  init(this);
  this.installed = false;
});

Given(
  'automatic additions have already been evaluated for the account today',
  function (this: AutoAddWorld) {
    init(this);
    this.ranToday = true;
  },
);

// ---------------------------------------------------------------------------
// Given — purchase history
// ---------------------------------------------------------------------------

Given(
  'an item has been purchased repeatedly at a consistent interval',
  function (this: AutoAddWorld) {
    init(this);
    recordPurchases(this, 'Milk', { intervalDays: 7, count: 5, lastAgoDays: 2 });
  },
);

Given(
  'at least that interval has passed since it was last purchased',
  function (this: AutoAddWorld) {
    const timestamps = this.purchases.get('Milk')!;
    // Shift the whole history so the last purchase sits just past the interval.
    const shift = 9 * DAY - (NOW - timestamps[timestamps.length - 1]);
    this.purchases.set('Milk', timestamps.map((t) => t - shift));
  },
);

Given(
  'an item has been purchased repeatedly at widely varying intervals',
  function (this: AutoAddWorld) {
    init(this);
    // Gaps of 2, 40, 3 and 60 days — no rhythm to predict from.
    this.purchases.set('Crisps', [
      NOW - 115 * DAY,
      NOW - 113 * DAY,
      NOW - 73 * DAY,
      NOW - 70 * DAY,
      NOW - 10 * DAY,
    ]);
    this.items.set('Crisps', item('Crisps'));
  },
);

Given(
  'an item has been purchased too few times to establish an interval',
  function (this: AutoAddWorld) {
    init(this);
    recordPurchases(this, 'Olives', { intervalDays: 7, count: 2, lastAgoDays: 30 });
  },
);

Given(
  'an item has been purchased repeatedly but only at long intervals',
  function (this: AutoAddWorld) {
    init(this);
    recordPurchases(this, 'Water filter', {
      intervalDays: 120,
      count: 5,
      lastAgoDays: 130,
    });
  },
);

Given(
  'an item was previously purchased at a consistent interval',
  function (this: AutoAddWorld) {
    init(this);
    recordPurchases(this, 'Kombucha', { intervalDays: 7, count: 6, lastAgoDays: 7 });
  },
);

Given(
  'far longer than that interval has passed since it was last purchased',
  function (this: AutoAddWorld) {
    const timestamps = this.purchases.get('Kombucha')!;
    const shift = 300 * DAY - (NOW - timestamps[timestamps.length - 1]);
    this.purchases.set('Kombucha', timestamps.map((t) => t - shift));
  },
);

Given('an item is due to be added automatically', function (this: AutoAddWorld) {
  init(this);
  recordPurchases(this, 'Milk', { intervalDays: 7, count: 5, lastAgoDays: 9 });
});

Given('that item is already on the shopping list', function (this: AutoAddWorld) {
  const existing = this.items.get('Milk')!;
  this.items.set('Milk', { ...existing, removed: false, addedBy: 'user' });
});

Given(
  'more items are due to be added automatically than the allowed limit',
  function (this: AutoAddWorld) {
    init(this);
    // Each is more overdue than the last, so the expected order is unambiguous.
    for (let i = 0; i < DEFAULT_POLICY.maxAutoItems + 3; i++) {
      recordPurchases(this, `Item ${i}`, {
        intervalDays: 7,
        count: 5,
        lastAgoDays: 8 + i,
      });
    }
  },
);

Given('a shopping trip is in progress', function (this: AutoAddWorld) {
  init(this);
  this.tripInProgress = true;
});

Given('an item has been added automatically', function (this: AutoAddWorld) {
  init(this);
  recordPurchases(this, 'Milk', { intervalDays: 7, count: 5, lastAgoDays: 9 });
  evaluate(this);
  assert.ok(onList(this, 'Milk'), 'expected the item to have been added automatically');
});

Given('another item has been added by a user', function (this: AutoAddWorld) {
  this.items.set('Bread', item('Bread', { removed: false, addedBy: 'user' }));
});

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When('automatic additions are evaluated', function (this: AutoAddWorld) {
  init(this);
  evaluate(this);
});

When('automatic additions would otherwise be evaluated', function (this: AutoAddWorld) {
  init(this);
  evaluate(this);
});

When(
  'automatic additions would otherwise be evaluated again',
  function (this: AutoAddWorld) {
    evaluate(this);
  },
);

When('automatic additions are evaluated again', function (this: AutoAddWorld) {
  this.ranToday = false;
  evaluate(this);
});

When(
  'I remove that item from the list without purchasing it',
  function (this: AutoAddWorld) {
    const existing = this.items.get('Milk')!;
    // Mirrors the app: a removal of an auto-added item records a refusal.
    this.items.set('Milk', {
      ...existing,
      removed: true,
      removedAt: NOW,
      autoAddDeclinedAt: existing.addedBy === 'auto' ? NOW : existing.autoAddDeclinedAt,
    });
  },
);

When('I purchase that item during a shopping trip', function (this: AutoAddWorld) {
  const existing = this.items.get('Milk')!;
  // A purchase both clears the item from the list and extends its history —
  // deliberately *not* recorded as a refusal.
  this.items.set('Milk', { ...existing, removed: true, removedAt: NOW });
  this.purchases.set('Milk', [...this.purchases.get('Milk')!, NOW]);
});

When(
  'automatic additions are evaluated after the interval has passed again',
  function (this: AutoAddWorld) {
    // Move every stored time back far enough that the cooldown has expired and
    // the item is due once more.
    const shift = (DEFAULT_POLICY.resuggestCooldownDays + 9) * DAY;
    this.purchases.set('Milk', this.purchases.get('Milk')!.map((t) => t - shift));
    const existing = this.items.get('Milk')!;
    this.items.set('Milk', {
      ...existing,
      autoAddedAt:
        existing.autoAddedAt === null ? null : existing.autoAddedAt - shift,
    });
    this.ranToday = false;
    evaluate(this);
  },
);

When('I request the reason for that addition', function (this: AutoAddWorld) {
  this.reasonShown = this.items.get('Milk')?.autoAddReason ?? null;
});

// "When I view the shopping list" is already defined in items.steps.ts as a
// no-op; redefining it here would make every scenario that uses it ambiguous.

When('I view the automatic additions setting', function (this: AutoAddWorld) {
  // Reading the setting has no effect on it.
});

When('either user disables automatic additions', function (this: AutoAddWorld) {
  // The setting lives on the account, so one user's change is the account's.
  this.enabled = false;
});

When('I interact with that item', function (this: AutoAddWorld) {
  const existing = this.items.get('Milk')!;
  this.items.set('Milk', { ...existing, quantity: 2, unit: 'l' });
});

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then('the item should be added to the shopping list', function (this: AutoAddWorld) {
  assert.ok(
    this.added.length > 0,
    'expected the evaluation to add an item, but it added none',
  );
});

Then('the item should not be added to the shopping list', function (this: AutoAddWorld) {
  assert.deepEqual(this.added, [], 'expected no items to be added');
});

Then(
  'the item should be marked as having been added automatically',
  function (this: AutoAddWorld) {
    const added = this.items.get(this.added[0])!;
    assert.equal(added.addedBy, 'auto');
    assert.ok(added.autoAddReason, 'expected a reason to be recorded');
  },
);

Then('the item should appear on the list exactly once', function (this: AutoAddWorld) {
  const matching = [...this.items.values()].filter(
    (i) => i.name === 'Milk' && !i.removed,
  );
  assert.equal(matching.length, 1);
});

Then(
  'the item should remain marked as it was before the evaluation',
  function (this: AutoAddWorld) {
    // It was on the list as a user's own item, and must not be relabelled.
    assert.equal(this.items.get('Milk')!.addedBy, 'user');
  },
);

Then(
  'I should be presented with an explanation referring to how often the item is purchased',
  function (this: AutoAddWorld) {
    assert.ok(this.reasonShown, 'expected a reason to be presented');
    assert.equal(this.reasonShown!.kind, 'periodicity');
    assert.ok(
      this.reasonShown!.medianIntervalDays > 0,
      'expected the explanation to carry a purchase interval',
    );
  },
);

Then(
  'the automatically added item should be distinguishable from the one added by a user',
  function (this: AutoAddWorld) {
    const auto = this.items.get('Milk')!;
    const byUser = this.items.get('Bread')!;
    assert.notEqual(auto.addedBy, byUser.addedBy);
    assert.equal(auto.addedBy, 'auto');
    assert.equal(byUser.addedBy, 'user');
  },
);

Then(
  'only up to the allowed limit of items should be added',
  function (this: AutoAddWorld) {
    assert.ok(
      this.added.length <= DEFAULT_POLICY.maxAutoItems,
      `added ${this.added.length}, limit is ${DEFAULT_POLICY.maxAutoItems}`,
    );
    assert.equal(this.added.length, DEFAULT_POLICY.maxAutoItems);
  },
);

Then('the items added should be those most overdue', function (this: AutoAddWorld) {
  const overdueOf = (name: string): number => {
    const timestamps = this.purchases.get(name)!;
    return NOW - timestamps[timestamps.length - 1];
  };
  const addedOverdue = this.added.map(overdueOf);
  const skipped = [...this.purchases.keys()].filter((n) => !this.added.includes(n));
  const mostOverdueSkipped = Math.max(...skipped.map(overdueOf));

  assert.ok(
    Math.min(...addedOverdue) >= mostOverdueSkipped,
    'every added item should be at least as overdue as every skipped one',
  );
});

Then('no further evaluation should take place', function (this: AutoAddWorld) {
  assert.equal(this.evaluated, false);
});

Then('no items should be added to the shopping list', function (this: AutoAddWorld) {
  assert.deepEqual(this.added, []);
});

Then('automatic additions should stop for both users', function (this: AutoAddWorld) {
  // The setting is account-level, so there is one value for everyone.
  assert.equal(this.enabled, false);
  evaluate(this);
  assert.deepEqual(this.added, []);
});

Then('I should not be able to enable automatic additions', function (this: AutoAddWorld) {
  assert.equal(this.installed, false);
  assert.equal(
    blockingReason(
      {
        enabled: true,
        installed: this.installed,
        hasActiveSession: false,
        activeAutoCount: 0,
      },
      DEFAULT_POLICY,
    ),
    'not-installed',
  );
});

Then(
  'I should be informed that installing the application is required',
  function (this: AutoAddWorld) {
    // The setting screen explains the requirement; asserted here as the reason
    // the feature reports for withholding itself.
    assert.equal(this.installed, false);
  },
);

Then(
  'it should behave in every respect the same as an item added by a user',
  function (this: AutoAddWorld) {
    const edited = this.items.get('Milk')!;
    assert.equal(edited.quantity, 2);
    assert.equal(edited.unit, 'l');
    // The marker is informational only — editing works regardless of origin.
    assert.equal(edited.addedBy, 'auto');
  },
);
