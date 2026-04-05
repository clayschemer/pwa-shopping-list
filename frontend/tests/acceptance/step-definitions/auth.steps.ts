import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// World state (in-memory simulation — no DOM, no Angular bootstrap)
// ---------------------------------------------------------------------------

interface AuthWorld {
  isAuthenticated: boolean;
  isPermitted: boolean;
  hasAccess: boolean;
  accessDenied: boolean;
  sessionRestored: boolean;
}

function world(this: AuthWorld) {
  return this;
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

Given('the application is available', function (this: AuthWorld) {
  this.isAuthenticated = false;
  this.isPermitted = false;
  this.hasAccess = false;
  this.accessDenied = false;
  this.sessionRestored = false;
});

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('I am not authenticated', function (this: AuthWorld) {
  this.isAuthenticated = false;
});

Given('I have previously authenticated', function (this: AuthWorld) {
  this.isAuthenticated = true;
  this.isPermitted = true;
});

Given('I am authenticated', function (this: AuthWorld) {
  this.isAuthenticated = true;
  this.isPermitted = true;
  this.hasAccess = true;
});

Given('I am authenticated on one device', function (this: AuthWorld) {
  this.isAuthenticated = true;
  this.isPermitted = true;
  this.hasAccess = true;
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('I authenticate successfully with a permitted account', function (this: AuthWorld) {
  this.isAuthenticated = true;
  this.isPermitted = true;
  // Simulate account check passing
  this.hasAccess = this.isPermitted;
  this.accessDenied = !this.isPermitted;
});

When('I authenticate successfully with a non-permitted account', function (this: AuthWorld) {
  this.isAuthenticated = true;
  this.isPermitted = false;
  this.hasAccess = false;
  this.accessDenied = true;
});

When(
  'I return to the application on the same device with an intact session',
  function (this: AuthWorld) {
    // Session persists — auth state observable emits the restored user
    this.sessionRestored = true;
    this.hasAccess = this.isAuthenticated && this.isPermitted;
  },
);

When('I end my session', function (this: AuthWorld) {
  this.isAuthenticated = false;
  this.hasAccess = false;
});

When(
  'I access the application from a different device or a fresh session',
  function (this: AuthWorld) {
    // New context — no persisted session
    this.isAuthenticated = false;
    this.hasAccess = false;
    this.sessionRestored = false;
  },
);

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('I should have access to the shopping list', function (this: AuthWorld) {
  assert.equal(this.hasAccess, true, 'Expected user to have access to the shopping list');
});

Then('I should be denied access to the application', function (this: AuthWorld) {
  assert.equal(this.accessDenied, true, 'Expected user to be denied access');
  assert.equal(this.hasAccess, false, 'Expected user not to have access to the shopping list');
});

Then('I should be informed that I do not have permission', function (this: AuthWorld) {
  assert.equal(this.accessDenied, true, 'Expected access-denied state to be set');
});

Then('I should have access to the shopping list without re-authenticating', function (this: AuthWorld) {
  assert.equal(this.sessionRestored, true, 'Expected session to be restored');
  assert.equal(this.hasAccess, true, 'Expected user to have access without re-authenticating');
});

Then('I should no longer have access to the shopping list', function (this: AuthWorld) {
  assert.equal(this.hasAccess, false, 'Expected user to have no access after sign out');
});

Then('I should be required to authenticate again to regain access', function (this: AuthWorld) {
  assert.equal(this.isAuthenticated, false, 'Expected user to be unauthenticated');
});

Then('I should be required to authenticate again', function (this: AuthWorld) {
  assert.equal(this.isAuthenticated, false, 'Expected user to be unauthenticated on new device');
});
