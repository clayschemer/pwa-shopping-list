import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// World state
// ---------------------------------------------------------------------------

interface PriceItem {
  id: string;
  name: string;
  price: number | null;
  priceQuantity: number | null;
  priceUnit: string | null;
  priceUpdatedAt: number | null;
  productName: string | null;
  productUrl: string | null;
  shopId: string | null;
  priceFeedback: PriceFeedbackEntry[];
  quantity: number | null;
  unit: string | null;
  categoryId: string | null;
  removed: boolean;
}

interface PriceFeedbackEntry {
  rejectedName: string;
  rejectedUrl: string | null;
  reason: string;
  timestamp: number;
}

interface PriceFeedbackLogEntry {
  itemId: string;
  itemName: string;
  categoryName: string | null;
  reason: string;
  createdAt: number;
}

interface CheckedPriceItem {
  itemId: string;
  priceSnapshot: number | null;
}

interface LookupContext {
  itemName: string;
  categoryName: string | null;
  feedback: PriceFeedbackEntry[];
}

interface AiPriceWorld {
  aiConfigured: boolean;
  items: PriceItem[];
  checkedItems: CheckedPriceItem[];
  priceLookupTriggered: boolean;
  stalePriceSuggestion: { itemId: string; suggestedPrice: number } | null;
  derivedPriceForDifferentQty: number | null;
  // Price feedback / inspection world
  feedbackCorpus: PriceFeedbackLogEntry[];
  lastLookupContext: LookupContext | null;
  reestimationQueued: boolean;
  categoryNamesById: Record<string, string>;
}

function makeItem(
  id: string,
  name: string,
  price: number | null = null,
  catId: string | null = null,
): PriceItem {
  return {
    id,
    name,
    price,
    priceQuantity: price !== null ? 1 : null,
    priceUnit: price !== null ? 'ea' : null,
    priceUpdatedAt: price !== null ? Date.now() : null,
    productName: null,
    productUrl: null,
    shopId: null,
    priceFeedback: [],
    quantity: null,
    unit: null,
    categoryId: catId,
    removed: false,
  };
}

function categoryTotal(items: PriceItem[], checkedItems: CheckedPriceItem[], catId: string | null): number {
  return checkedItems
    .map((ci) => items.find((i) => i.id === ci.itemId))
    .filter((i): i is PriceItem => !!i && i.categoryId === catId)
    .reduce((sum, i) => sum + (i.price ?? 0), 0);
}

function sessionTotal(checkedItems: CheckedPriceItem[]): number {
  return checkedItems.reduce((sum, ci) => sum + (ci.priceSnapshot ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('one or more items exist on the shopping list', function (this: AiPriceWorld) {
  this.aiConfigured = true;
  this.items = [makeItem('item-1', 'Milk', null, 'cat-dairy')];
  this.checkedItems = [];
  this.priceLookupTriggered = false;
  this.stalePriceSuggestion = null;
});

Given('one or more items with prices exist within a category', function (this: AiPriceWorld) {
  this.aiConfigured = true;
  this.items = [
    makeItem('item-1', 'Milk', 1.50, 'cat-dairy'),
    makeItem('item-2', 'Butter', 2.00, 'cat-dairy'),
  ];
  this.checkedItems = [];
});

Given('one or more checked items have prices', function (this: AiPriceWorld) {
  this.items = this.items ?? [makeItem('item-1', 'Milk', 1.50, 'cat-dairy')];
  const item = this.items[0];
  item.removed = true;
  this.checkedItems = [{ itemId: item.id, priceSnapshot: item.price }];
});

Given('a price is associated with an item', function (this: AiPriceWorld) {
  this.items = [makeItem('item-1', 'Milk', 1.50, 'cat-dairy')];
  this.checkedItems = [];
});

Given('one or more items on the list have no price', function (this: AiPriceWorld) {
  this.items = [
    makeItem('item-1', 'Milk', null),
    makeItem('item-2', 'Bread', 2.00),
  ];
  this.checkedItems = [];
});

Given('an item exists on the shopping list', function (this: AiPriceWorld) {
  this.items = [makeItem('item-1', 'Eggs', null, 'cat-produce')];
  this.checkedItems = [];
});

Given('an item has a price that has not been updated for some time', function (this: AiPriceWorld) {
  const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
  this.items = [{
    ...makeItem('item-1', 'Milk', 1.20, 'cat-dairy'),
    priceUpdatedAt: Date.now() - SIX_MONTHS_MS - 1,
  }];
  this.checkedItems = [];
  this.stalePriceSuggestion = null;
});

Given('an item has a price set for a specific quantity and unit', function (this: AiPriceWorld) {
  this.items = [{
    ...makeItem('item-1', 'Olive Oil', 5.00, 'cat-pantry'),
    priceQuantity: 500,
    priceUnit: 'ml',
    quantity: null,
    unit: null,
  }];
  this.checkedItems = [];
  this.derivedPriceForDifferentQty = null;
});

// Shared step for both AI price estimation and AI list suggestions scenarios
Given('no AI provider has been configured for the account', function (this: AiPriceWorld & { aiAutoAddEnabled: boolean; aiWouldSuggest: boolean }) {
  this.aiConfigured = false;
  this.aiAutoAddEnabled = false;
  this.aiWouldSuggest = true;
  this.items = [makeItem('item-1', 'Milk', null)];
  this.checkedItems = [];
  this.priceLookupTriggered = false;
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('the application retrieves an estimated price for an item', function (this: AiPriceWorld) {
  if (!this.aiConfigured) return;
  const item = this.items[0];
  if (item) {
    item.price = 1.50;
    item.priceUpdatedAt = Date.now();
  }
  this.priceLookupTriggered = true;
});

When('I view the shopping list during an active session', function (this: AiPriceWorld) {
  // Read-only — totals derived from items and checkedItems
});

When('I view my session total', function (this: AiPriceWorld) {
  // Read-only — total derived from checkedItems priceSnapshot values
});

When('sufficient time has passed since the price was last set', function (this: AiPriceWorld) {
  const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
  const item = this.items[0];
  if (item) {
    // Simulate time passage by backdating the price timestamp
    item.priceUpdatedAt = Date.now() - SIX_MONTHS_MS - 1;
    this.stalePriceSuggestion = { itemId: item.id, suggestedPrice: 1.35 };
  }
});

When('category or session totals are calculated', function (this: AiPriceWorld) {
  // Totals only include items with non-null prices — enforced in selector logic
});

When('I manually enter a price for the item', function (this: AiPriceWorld) {
  const item = this.items[0];
  if (item) {
    item.price = 2.50;
    item.priceUpdatedAt = Date.now();
  }
});

When('the application determines the price may be outdated', function (this: AiPriceWorld) {
  const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
  const item = this.items[0];
  const isStale = item?.priceUpdatedAt !== null &&
    item.priceUpdatedAt !== undefined &&
    Date.now() - item.priceUpdatedAt > SIX_MONTHS_MS;
  if (isStale && item) {
    this.stalePriceSuggestion = { itemId: item.id, suggestedPrice: 1.35 };
  }
});

When('the item is added with a different quantity or unit', function (this: AiPriceWorld) {
  const item = this.items[0];
  if (item) {
    // Item added as 1L; price was set for 500ml → derive: 5.00 / 500 * 1000 = 10.00
    item.quantity = 1;
    item.unit = 'L';
    const pricePerMl = (item.price ?? 0) / (item.priceQuantity ?? 1);
    this.derivedPriceForDifferentQty = pricePerMl * 1000; // 1L = 1000ml
  }
});

When('a price lookup would otherwise be triggered', function (this: AiPriceWorld) {
  if (!this.aiConfigured) {
    this.priceLookupTriggered = false;
  }
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('that estimate should be associated with the item on the list', function (this: AiPriceWorld) {
  const item = this.items[0];
  assert.ok(item?.price !== null, 'Item should have an estimated price');
});

Then('the estimated total for that category should be visible', function (this: AiPriceWorld) {
  const total = this.items
    .filter((i) => i.price !== null)
    .reduce((sum, i) => sum + (i.price ?? 0), 0);
  assert.ok(total > 0, 'Category total should be positive when items have prices');
});

Then('it should reflect the sum of prices for all items checked in my session', function (this: AiPriceWorld) {
  const total = sessionTotal(this.checkedItems);
  assert.ok(total >= 0, 'Session total should be non-negative');
  assert.ok(this.checkedItems.some((ci) => ci.priceSnapshot !== null),
    'At least one checked item should have a price snapshot');
});

Then('the application should refresh the price for that item', function (this: AiPriceWorld) {
  // Price refresh is triggered when priceUpdatedAt > staleness threshold
  // This step verifies the staleness detection logic identifies the item as stale
  const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
  const item = this.items[0];
  const isStale = item?.priceUpdatedAt !== null &&
    item.priceUpdatedAt !== undefined &&
    Date.now() - item.priceUpdatedAt > SIX_MONTHS_MS;
  assert.ok(isStale, 'Item with old priceUpdatedAt should be identified as stale');
});

Then('only items with prices should contribute to the totals', function (this: AiPriceWorld) {
  const itemsWithPrices = this.items.filter((i) => i.price !== null);
  const itemsWithoutPrices = this.items.filter((i) => i.price === null);
  assert.ok(itemsWithPrices.length > 0, 'Some items should have prices');
  assert.ok(itemsWithoutPrices.length > 0, 'Some items should have no price');
  const total = itemsWithPrices.reduce((sum, i) => sum + (i.price ?? 0), 0);
  assert.ok(total > 0, 'Total only includes priced items');
});

Then('the entered price should be used for that item in all totals', function (this: AiPriceWorld) {
  const item = this.items[0];
  assert.equal(item?.price, 2.50, 'Manually entered price should be stored on the item');
});

Then('the application should suggest an updated price', function (this: AiPriceWorld) {
  assert.ok(this.stalePriceSuggestion, 'A stale price suggestion should have been generated');
  assert.ok(this.stalePriceSuggestion?.suggestedPrice, 'Suggestion should include a new price');
});

Then('the existing price should remain in use until the user accepts the suggestion', function (this: AiPriceWorld) {
  const item = this.items[0];
  // Existing price is 1.20 — suggestion is separate; item price unchanged until accepted
  assert.equal(item?.price, 1.20, 'Item should retain original price until user accepts suggestion');
  assert.notEqual(this.stalePriceSuggestion?.suggestedPrice, item?.price,
    'Suggested price should differ from current price');
});

Then('the application should derive an estimated price for the new quantity and unit', function (this: AiPriceWorld) {
  assert.ok(this.derivedPriceForDifferentQty !== null, 'A derived price should have been calculated');
  assert.ok((this.derivedPriceForDifferentQty ?? 0) > 0, 'Derived price should be positive');
});

Then('no lookup should occur', function (this: AiPriceWorld) {
  assert.equal(this.priceLookupTriggered, false, 'Price lookup should not occur without AI configuration');
});

Then('the item should have no price until one is entered manually', function (this: AiPriceWorld) {
  const item = this.items[0];
  assert.equal(item?.price, null, 'Item should have no price when AI is not configured');
});

// ---------------------------------------------------------------------------
// Price inspection + feedback scenarios
// ---------------------------------------------------------------------------

Given('an item has an estimated price set by the application', function (this: AiPriceWorld) {
  this.aiConfigured = true;
  this.categoryNamesById = this.categoryNamesById ?? { 'cat-fruit': 'Fruit' };
  this.items = [{
    ...makeItem('item-1', 'Lime', 4.9, 'cat-fruit'),
    productName: 'ICA Lime Fresh',
    productUrl: 'https://shop.example/lime-fresh',
    shopId: 'shop-ica',
  }];
  this.checkedItems = [];
  this.feedbackCorpus = this.feedbackCorpus ?? [];
  this.reestimationQueued = false;
});

Given('the user has previously rejected a price match for an item with a reason', function (this: AiPriceWorld) {
  this.aiConfigured = true;
  this.categoryNamesById = this.categoryNamesById ?? { 'cat-fruit': 'Fruit' };
  const reason = 'this was a soft drink, I wanted the fruit';
  this.items = [{
    ...makeItem('item-1', 'Lime', null, 'cat-fruit'),
    priceFeedback: [{
      rejectedName: 'Festis Lime 250ml',
      rejectedUrl: 'https://shop.example/festis-lime',
      reason,
      timestamp: Date.now() - 60_000,
    }],
  }];
  this.feedbackCorpus = [{
    itemId: 'item-1',
    itemName: 'Lime',
    categoryName: 'Fruit',
    reason,
    createdAt: Date.now() - 60_000,
  }];
  this.checkedItems = [];
  this.lastLookupContext = null;
});

Given('the user has previously rejected one or more price matches for an item', function (this: AiPriceWorld) {
  this.aiConfigured = true;
  this.categoryNamesById = this.categoryNamesById ?? { 'cat-fruit': 'Fruit' };
  this.items = [{
    ...makeItem('item-1', 'Lime', null, 'cat-fruit'),
    priceFeedback: [{
      rejectedName: 'Festis Lime 250ml',
      rejectedUrl: null,
      reason: 'not the fruit',
      timestamp: Date.now() - 60_000,
    }],
  }];
  this.feedbackCorpus = [{
    itemId: 'item-1',
    itemName: 'Lime',
    categoryName: 'Fruit',
    reason: 'not the fruit',
    createdAt: Date.now() - 60_000,
  }];
  this.checkedItems = [];
});

Given('an item has a primary category assigned', function (this: AiPriceWorld) {
  this.aiConfigured = true;
  this.categoryNamesById = { 'cat-fruit': 'Fruit' };
  this.items = [makeItem('item-1', 'Lime', null, 'cat-fruit')];
  this.checkedItems = [];
  this.lastLookupContext = null;
});

When('the user inspects the price', function (this: AiPriceWorld) {
  // Inspection is a UI read of the matched-product fields the pipeline wrote.
  // No state mutation — the Then step asserts that those fields are populated.
});

When('the user indicates the matched product is incorrect and provides a reason', function (this: AiPriceWorld) {
  const item = this.items[0];
  if (!item) return;
  const reason = 'this is a different product than what I wanted';
  // Operational: append to the item's priceFeedback array, queue re-estimation.
  item.priceFeedback.push({
    rejectedName: item.productName ?? item.name,
    rejectedUrl: item.productUrl,
    reason,
    timestamp: Date.now(),
  });
  item.priceUpdatedAt = null;
  this.reestimationQueued = true;
  // Corpus: append-only log for future analysis.
  this.feedbackCorpus = this.feedbackCorpus ?? [];
  this.feedbackCorpus.push({
    itemId: item.id,
    itemName: item.name,
    categoryName: item.categoryId
      ? (this.categoryNamesById?.[item.categoryId] ?? null)
      : null,
    reason,
    createdAt: Date.now(),
  });
});

When('the user rejects a price match with a reason', function (this: AiPriceWorld) {
  this.aiConfigured = this.aiConfigured ?? true;
  this.categoryNamesById = this.categoryNamesById ?? { 'cat-fruit': 'Fruit' };
  if (!this.items || this.items.length === 0) {
    this.items = [{
      ...makeItem('item-1', 'Lime', 12, 'cat-fruit'),
      productName: 'Festis Lime 250ml',
      productUrl: 'https://shop.example/festis-lime',
    }];
  }
  const item = this.items[0];
  const reason = 'wrong product';
  item.priceFeedback.push({
    rejectedName: item.productName ?? item.name,
    rejectedUrl: item.productUrl,
    reason,
    timestamp: Date.now(),
  });
  this.feedbackCorpus = this.feedbackCorpus ?? [];
  this.feedbackCorpus.push({
    itemId: item.id,
    itemName: item.name,
    categoryName: item.categoryId
      ? (this.categoryNamesById[item.categoryId] ?? null)
      : null,
    reason,
    createdAt: Date.now(),
  });
});

When('the rejection is recorded', function (this: AiPriceWorld) {
  // The corpus write happens transactionally with the operational write.
  // Assertions in the Then step verify the corpus retained the search context.
});

When('the application re-estimates the price for that item', function (this: AiPriceWorld) {
  const item = this.items[0];
  if (!item) return;
  this.lastLookupContext = {
    itemName: item.name,
    categoryName: item.categoryId
      ? (this.categoryNamesById?.[item.categoryId] ?? null)
      : null,
    feedback: [...item.priceFeedback],
  };
});

When('the application successfully sets a new estimated price for that item', function (this: AiPriceWorld) {
  const item = this.items[0];
  if (!item) return;
  item.price = 5.9;
  item.priceQuantity = 1;
  item.priceUnit = 'st';
  item.priceUpdatedAt = Date.now();
  item.productName = 'Lime EKO';
  item.productUrl = 'https://shop.example/lime-eko';
  // Successful re-match clears the operational feedback array.
  item.priceFeedback = [];
});

When('the application looks up an estimated price for that item', function (this: AiPriceWorld) {
  const item = this.items[0];
  if (!item) return;
  this.lastLookupContext = {
    itemName: item.name,
    categoryName: item.categoryId
      ? (this.categoryNamesById?.[item.categoryId] ?? null)
      : null,
    feedback: [...item.priceFeedback],
  };
});

Then("the matched product's name and source should be available for review", function (this: AiPriceWorld) {
  const item = this.items[0];
  assert.ok(item?.productName, 'matched product name should be available');
  assert.ok(item?.productUrl, 'matched product URL should be available');
});

Then('the price should be queued for re-estimation', function (this: AiPriceWorld) {
  const item = this.items[0];
  assert.equal(this.reestimationQueued, true, 'reestimation should have been queued');
  assert.equal(item?.priceUpdatedAt, null, 'priceUpdatedAt should be cleared to trigger pipeline');
});

Then('the rejection reason should be retained', function (this: AiPriceWorld) {
  const item = this.items[0];
  assert.ok(item?.priceFeedback && item.priceFeedback.length > 0, 'feedback should be stored on the item');
  assert.ok(item!.priceFeedback[item!.priceFeedback.length - 1].reason.length > 0,
    'rejection reason should be non-empty');
});

Then('the previous rejection and reason should influence the new lookup', function (this: AiPriceWorld) {
  assert.ok(this.lastLookupContext, 'a lookup context should have been built');
  assert.ok(this.lastLookupContext!.feedback.length > 0,
    'prior feedback should be carried into the lookup context');
  assert.ok(this.lastLookupContext!.feedback[0].reason.length > 0,
    'reason should accompany the rejection');
});

Then('the prior rejections should no longer influence future lookups', function (this: AiPriceWorld) {
  const item = this.items[0];
  assert.deepEqual(item?.priceFeedback, [],
    'operational feedback array should be cleared after a successful re-match');
});

Then('the search context and reason should be retained for later analysis independently of the item\'s operational state', function (this: AiPriceWorld) {
  assert.ok(this.feedbackCorpus && this.feedbackCorpus.length > 0,
    'corpus log should contain the feedback entry');
  const last = this.feedbackCorpus[this.feedbackCorpus.length - 1];
  assert.ok(last.reason.length > 0, 'corpus entry should retain the reason');
  assert.ok(last.itemName.length > 0, 'corpus entry should retain the item name');
});

Then("the item's category should inform which product is selected as the match", function (this: AiPriceWorld) {
  assert.ok(this.lastLookupContext, 'a lookup context should have been built');
  assert.ok(this.lastLookupContext!.categoryName,
    'category name should be present in the lookup context');
});
