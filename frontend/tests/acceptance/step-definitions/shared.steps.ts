import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Shared step definitions used across multiple feature files.
// These must not be duplicated in feature-specific step files.
// ---------------------------------------------------------------------------

interface SharedWorld {
  mode: 'plan' | 'shop';
  isAuthenticated: boolean;
  [key: string]: unknown;
}

Given('I am in plan mode', function (this: SharedWorld) {
  this.mode = 'plan';
});

Given('I am in shop mode', function (this: SharedWorld) {
  this.mode = 'shop';
  // Initialise shared world fields used by multiple step files
  if (!('sessions' in this)) (this as unknown as { sessions: unknown[] }).sessions = [];
  if (!('items' in this)) (this as unknown as { items: unknown[] }).items = [];
  if (!('user1Id' in this)) (this as unknown as { user1Id: string }).user1Id = 'user-1';
  if (!('user2Id' in this)) (this as unknown as { user2Id: string }).user2Id = 'user-2';
  if (!('conflictError' in this)) (this as unknown as { conflictError: boolean }).conflictError = false;
  if (!('inactivityWarning' in this)) (this as unknown as { inactivityWarning: boolean }).inactivityWarning = false;
  if (!('sessionHistory' in this)) (this as unknown as { sessionHistory: unknown[] }).sessionHistory = [];
});

Given('I am authenticated and have access to the shopping list', function (this: SharedWorld) {
  this.isAuthenticated = true;
  this.mode = 'plan';
});

Given('I have access to the shopping list', function (this: SharedWorld) {
  this.isAuthenticated = true;
  if (!('categories' in this)) (this as unknown as { categories: unknown[] }).categories = [];
  if (!('shops' in this)) (this as unknown as { shops: unknown[] }).shops = [];
  if (!('addError' in this)) (this as unknown as { addError: null }).addError = null;
});

Given('one or more shops exist', function (this: SharedWorld) {
  const world = this as unknown as { shops: { id: string; name: string; categoryOrder: string[] }[] };
  if (!world.shops?.length) {
    world.shops = [
      { id: 'shop-shared-1', name: 'Shop A', categoryOrder: [] },
      { id: 'shop-shared-2', name: 'Shop B', categoryOrder: [] },
    ];
  }
});

When('I switch to shop mode', function (this: SharedWorld) {
  this.mode = 'shop';
  const world = this as unknown as {
    shops: { id: string }[];
    shopSelectionPrompted: boolean;
    canSkipShopSelection: boolean;
    sessions: unknown[];
    user1Id: string;
    selectedShopId: string | null;
  };
  if (!world.user1Id) world.user1Id = 'user-1';
  if (!world.sessions) world.sessions = [];
  if (world.shops?.length) {
    world.shopSelectionPrompted = true;
    world.canSkipShopSelection = true;
  } else {
    world.shopSelectionPrompted = false;
    world.selectedShopId = null;
  }
});

When('the other user accesses the shopping list', function (this: SharedWorld) {
  // Shared list — items/categories/shops are visible to all users via stream
});

Then('I should be informed that the name is already in use', function (this: SharedWorld) {
  const world = this as unknown as { addError: string | null };
  assert.equal(world.addError, 'NAME_CONFLICT');
});
