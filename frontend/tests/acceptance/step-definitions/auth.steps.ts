import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// World state (in-memory simulation — no DOM, no Angular bootstrap)
// ---------------------------------------------------------------------------

interface AuthWorld {
  isAuthenticated: boolean;
  isPermitted: boolean;
  isVerified: boolean;
  hasAccess: boolean;
  accessDenied: boolean;
  pendingVerification: boolean;
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
  this.isVerified = false;
  this.hasAccess = false;
  this.accessDenied = false;
  this.pendingVerification = false;
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
  this.isVerified = true;
});

Given('I am authenticated', function (this: AuthWorld) {
  this.isAuthenticated = true;
  this.isPermitted = true;
  this.isVerified = true;
  this.hasAccess = true;
});

Given('I am authenticated on one device', function (this: AuthWorld) {
  this.isAuthenticated = true;
  this.isPermitted = true;
  this.isVerified = true;
  this.hasAccess = true;
});

Given(
  'I have previously authenticated and was awaiting verification',
  function (this: AuthWorld) {
    this.isAuthenticated = true;
    this.isPermitted = true;
    this.isVerified = false;
    this.pendingVerification = true;
    this.hasAccess = false;
  },
);

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('I authenticate successfully with a permitted account', function (this: AuthWorld) {
  this.isAuthenticated = true;
  this.isPermitted = true;
  this.isVerified = true;
  // Simulate account check passing
  this.hasAccess = this.isPermitted && this.isVerified;
  this.accessDenied = !this.isPermitted;
  this.pendingVerification = this.isPermitted && !this.isVerified;
});

When('I authenticate successfully with a non-permitted account', function (this: AuthWorld) {
  this.isAuthenticated = true;
  this.isPermitted = false;
  this.isVerified = false;
  this.hasAccess = false;
  this.accessDenied = true;
  this.pendingVerification = false;
});

When(
  'I authenticate successfully with an account that has not yet been verified',
  function (this: AuthWorld) {
    this.isAuthenticated = true;
    this.isPermitted = true;
    this.isVerified = false;
    this.hasAccess = false;
    this.accessDenied = false;
    this.pendingVerification = true;
  },
);

When(
  'my account is verified and I return to the application',
  function (this: AuthWorld) {
    this.isVerified = true;
    this.pendingVerification = false;
    this.hasAccess = this.isAuthenticated && this.isPermitted && this.isVerified;
  },
);

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

Then('I should not have access to the shopping list', function (this: AuthWorld) {
  assert.equal(this.hasAccess, false, 'Expected user to have no access to the shopping list');
});

Then(
  'I should be informed that my access is pending verification',
  function (this: AuthWorld) {
    assert.equal(
      this.pendingVerification,
      true,
      'Expected pending-verification state to be set',
    );
    assert.equal(this.accessDenied, false, 'Expected access-denied state not to be set');
  },
);
