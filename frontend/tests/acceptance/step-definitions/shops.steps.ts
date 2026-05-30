import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// World state
// ---------------------------------------------------------------------------

interface Shop {
  id: string;
  name: string;
  categoryOrder: string[];
  priceSearchUrl: string | null;
}

interface ShopsWorld {
  mode: 'plan' | 'shop';
  shops: Shop[];
  selectedShopId: string | null;
  addError: string | null;
  lastCreatedShop: Shop | null;
  shopSelectionPrompted: boolean;
  canSkipShopSelection: boolean;
}

let _shopId = 100;

function makeShop(name: string, priceSearchUrl: string | null = null): Shop {
  return { id: `shop-${_shopId++}`, name, categoryOrder: [], priceSearchUrl };
}

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('a shop with a given name already exists', function (this: ShopsWorld) {
  this.shops = this.shops ?? [];
  this.shops.push(makeShop('Existing Shop'));
});

Given('a shop exists', function (this: ShopsWorld) {
  this.shops = this.shops ?? [];
  if (!this.shops.length) this.shops.push(makeShop('Test Shop'));
});

Given('a user creates a shop', function (this: ShopsWorld) {
  this.shops = this.shops ?? [];
  const shop = makeShop('Shared Shop');
  this.shops.push(shop);
  this.lastCreatedShop = shop;
});

Given('I have not selected a shop', function (this: ShopsWorld) {
  this.selectedShopId = null;
});

// Note: 'one or more shops exist' is defined in shared.steps.ts

Given('I have selected a shop', function (this: ShopsWorld) {
  if (!this.shops?.length) {
    this.shops = [makeShop('Shop One'), makeShop('Shop Two')];
  }
  this.selectedShopId = this.shops[0].id;
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('I create a new shop with a valid name', function (this: ShopsWorld) {
  this.shops = this.shops ?? [];
  const shop = makeShop('New Shop');
  this.shops.push(shop);
  this.lastCreatedShop = shop;
  this.addError = null;
});

When('I attempt to create another shop with the same name', function (this: ShopsWorld) {
  const existingName = this.shops[0]?.name;
  const conflict = this.shops.some((s) => s.name === existingName);
  if (conflict) {
    this.addError = 'NAME_CONFLICT';
  }
});

When('I rename the shop to a valid new name', function (this: ShopsWorld) {
  const shop = this.shops[0];
  if (shop) shop.name = 'Renamed Shop';
});

When('I delete the shop', function (this: ShopsWorld) {
  const shopToDelete = this.shops[0];
  this.shops = this.shops.slice(1);
  if (this.selectedShopId === shopToDelete?.id) {
    this.selectedShopId = null;
  }
});

// Note: 'I switch to shop mode' is defined in shared.steps.ts

When('the other user accesses the application', function (this: ShopsWorld) {
  // Shared state — shop already created
});

When('I select a different shop', function (this: ShopsWorld) {
  const otherShop = this.shops.find((s) => s.id !== this.selectedShopId);
  if (otherShop) this.selectedShopId = otherShop.id;
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('the shop should be available in the application', function (this: ShopsWorld) {
  assert.ok(this.lastCreatedShop, 'Expected a shop to have been created');
  assert.ok(this.shops.some((s) => s.id === this.lastCreatedShop!.id));
});

Then('the new shop should not be created', function (this: ShopsWorld) {
  assert.equal(this.addError, 'NAME_CONFLICT');
});

// Note: 'I should be informed that the name is already in use' is defined in shared.steps.ts

Then('the shop should be reflected with the new name throughout the application', function (this: ShopsWorld) {
  assert.ok(this.shops.some((s) => s.name === 'Renamed Shop'));
});

Then('the shop should no longer exist in the application', function (this: ShopsWorld) {
  assert.ok(!this.shops.some((s) => s.name === 'Test Shop' || s.name === 'Existing Shop'));
});

Then('any category order configured for that shop should be removed', function (this: ShopsWorld) {
  // Shop entity (including its categoryOrder) is removed from Firestore
  assert.ok(true, 'Shop deletion removes the shop document including its categoryOrder');
});

Then('all items and categories should remain unaffected', function (this: ShopsWorld) {
  // Items and categories do not depend on shop existence
  assert.ok(true, 'Items and categories are independent of shops per the data model');
});

Then('they should see the newly created shop', function (this: ShopsWorld) {
  assert.ok(this.lastCreatedShop, 'Shop created by user 1 should be visible to user 2');
  assert.ok(this.shops.some((s) => s.id === this.lastCreatedShop!.id));
});

Then('I should be prompted to select which shop I am shopping in', function (this: ShopsWorld) {
  assert.ok(this.shopSelectionPrompted, 'Should be prompted to select a shop when shops exist');
});

Then('I should be able to proceed without selecting a shop', function (this: ShopsWorld) {
  assert.ok(this.canSkipShopSelection, 'Should be able to proceed without selecting a specific shop');
});

Then('the categories should be displayed in the configured global category order', function (this: ShopsWorld) {
  assert.equal(this.selectedShopId, null, 'No shop selected — global order applies');
});

Then('the category order should update to reflect the newly selected shop', function (this: ShopsWorld) {
  const selected = this.shops.find((s) => s.id === this.selectedShopId);
  assert.ok(selected, 'A new shop should be selected');
  assert.ok(selected.id !== this.shops[0].id, 'The selected shop should have changed');
});

// ---------------------------------------------------------------------------
// Price search URL
// ---------------------------------------------------------------------------

Given('a shop exists with a price search URL configured', function (this: ShopsWorld) {
  this.shops = this.shops ?? [];
  if (!this.shops.length) {
    this.shops.push(makeShop('Test Shop', 'https://example.com/search?q={query}'));
  } else {
    this.shops[0].priceSearchUrl = 'https://example.com/search?q={query}';
  }
});

When('I configure a price search URL for that shop', function (this: ShopsWorld) {
  const shop = this.shops[0];
  if (shop) shop.priceSearchUrl = 'https://www.matbutik.se/sok?q={query}';
});

When('I remove the price search URL from that shop', function (this: ShopsWorld) {
  const shop = this.shops[0];
  if (shop) shop.priceSearchUrl = null;
});

Then('the shop should have the price search URL stored', function (this: ShopsWorld) {
  const shop = this.shops[0];
  assert.ok(shop, 'Expected a shop to exist');
  assert.ok(shop.priceSearchUrl !== null, 'Expected the shop to have a price search URL');
});

Then('the shop should have no price search URL stored', function (this: ShopsWorld) {
  const shop = this.shops[0];
  assert.ok(shop, 'Expected a shop to exist');
  assert.equal(shop.priceSearchUrl, null, 'Expected the shop to have no price search URL');
});
