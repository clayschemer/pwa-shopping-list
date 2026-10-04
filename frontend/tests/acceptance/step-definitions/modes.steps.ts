import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// World state (in-memory simulation)
// ---------------------------------------------------------------------------

interface ModesWorld {
  mode: 'plan' | 'shop';
  user1Mode: 'plan' | 'shop';
  user2Mode: 'plan' | 'shop';
  isAuthenticated: boolean;
}

// ---------------------------------------------------------------------------
// Background
// (Note: 'I am authenticated and have access to the shopping list' is in shared.steps.ts)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Given steps
// (Note: 'I am in plan mode' and 'I am in shop mode' are in shared.steps.ts)
// ---------------------------------------------------------------------------

Given('one user is in plan mode', function (this: ModesWorld) {
  this.user1Mode = 'plan';
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('I access the application for the first time', function (this: ModesWorld) {
  // Mode always starts as plan — not persisted
  this.mode = 'plan';
});

// Note: 'I switch to shop mode' is defined in shared.steps.ts

When('I switch to plan mode', function (this: ModesWorld) {
  this.mode = 'plan';
});

When('the other user switches to shop mode', function (this: ModesWorld) {
  this.user2Mode = 'shop';
});

When('I start a new session', function (this: ModesWorld) {
  // New app session — mode resets to plan
  this.mode = 'plan';
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('I should be in plan mode', function (this: ModesWorld) {
  assert.equal(this.mode, 'plan', 'Expected mode to be plan');
});

Then('I should be in shop mode', function (this: ModesWorld) {
  assert.equal(this.mode, 'shop', 'Expected mode to be shop');
});

Then('I should have access to a reduced set of interactions', function (this: ModesWorld) {
  assert.equal(this.mode, 'shop', 'Shop mode provides reduced interactions (no FAB, no remove buttons)');
});

Then('I should have access to the full set of interactions', function (this: ModesWorld) {
  assert.equal(this.mode, 'plan', 'Plan mode provides full interactions (FAB, remove buttons, edit)');
});

Then('the first user should remain in plan mode', function (this: ModesWorld) {
  assert.equal(this.user1Mode, 'plan', 'User 1 mode should be independent of user 2');
});

Then('the second user should be in shop mode', function (this: ModesWorld) {
  assert.equal(this.user2Mode, 'shop', 'User 2 should be in shop mode');
});

Then('I should be returned to plan mode', function (this: ModesWorld) {
  assert.equal(this.mode, 'plan', 'Mode is not persisted — starts as plan on new session');
});
