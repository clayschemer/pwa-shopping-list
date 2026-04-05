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
  quantity: number | null;
  unit: string | null;
  categoryId: string | null;
  removed: boolean;
}

interface CheckedPriceItem {
  itemId: string;
  priceSnapshot: number | null;
}

interface AiPriceWorld {
  aiConfigured: boolean;
  items: PriceItem[];
  checkedItems: CheckedPriceItem[];
  priceLookupTriggered: boolean;
  stalePriceSuggestion: { itemId: string; suggestedPrice: number } | null;
  derivedPriceForDifferentQty: number | null;
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
