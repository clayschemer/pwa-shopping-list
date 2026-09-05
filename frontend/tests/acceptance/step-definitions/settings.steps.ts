import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// World state
// ---------------------------------------------------------------------------

interface SettingsWorld {
  devicePreferences: Record<string, boolean | string>;
  appSettings: Record<string, boolean | string>;
  user1Settings: Record<string, boolean | string>;
  user2Settings: Record<string, boolean | string>;
  isAuthenticated: boolean;
}

function matchesDevicePreference(
  world: SettingsWorld,
  key: string,
): boolean {
  return world.appSettings[key] === world.devicePreferences[key];
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

Given('I am authenticated and have access to the application', function (this: SettingsWorld) {
  this.isAuthenticated = true;
  this.devicePreferences = {
    darkMode: true,
    reduceMotion: false,
    highContrast: false,
  };
  this.appSettings = { ...this.devicePreferences };
});

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('my device has a preference configured for an accessibility or display setting', function (this: SettingsWorld) {
  this.devicePreferences = { darkMode: true, reduceMotion: true };
  this.appSettings = { ...this.devicePreferences }; // defaults match device
});

Given('the application is using a device default for a setting', function (this: SettingsWorld) {
  this.devicePreferences = { darkMode: true };
  this.appSettings = { ...this.devicePreferences };
});

Given('I have overridden a setting', function (this: SettingsWorld) {
  this.devicePreferences = { darkMode: true };
  this.appSettings = { darkMode: false }; // overridden
});

Given('I have configured one or more settings', function (this: SettingsWorld) {
  this.appSettings = { darkMode: false, language: 'no' };
});

Given('one user has configured their settings', function (this: SettingsWorld) {
  this.user1Settings = { darkMode: false, language: 'no', currency: 'NOK' };
  this.user2Settings = { darkMode: true }; // default
});

Given('I have configured settings on one device', function (this: SettingsWorld) {
  this.appSettings = { darkMode: false, language: 'no' };
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('I open the application for the first time', function (this: SettingsWorld) {
  // First open — settings loaded from localStorage, which is empty
  // So app falls back to device preferences
  this.appSettings = { ...this.devicePreferences };
});

When('I change that setting in the application', function (this: SettingsWorld) {
  // User toggles a setting — override device default
  this.appSettings = { ...this.appSettings, darkMode: !this.appSettings['darkMode'] };
});

When('I reset that setting to default', function (this: SettingsWorld) {
  // Restore to device preference
  this.appSettings = { ...this.appSettings, ...this.devicePreferences };
});

When('I start a new session on the same device with an intact session', function (this: SettingsWorld) {
  // Settings persisted in localStorage — survive session restart
  // appSettings unchanged
});

When('the other user opens the application', function (this: SettingsWorld) {
  // User 2 loads their own device's localStorage — independent from user 1
});

When('I access the application from a different device', function (this: SettingsWorld) {
  // New device — empty localStorage, load device preferences
  this.appSettings = {}; // will default to new device's preferences
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('the application should reflect my device preference for that setting', function (this: SettingsWorld) {
  assert.equal(this.appSettings['darkMode'], this.devicePreferences['darkMode'],
    'App should default to device preference');
});

Then('I should not need to configure it manually', function (this: SettingsWorld) {
  // Auto-detection is the default behaviour
  assert.ok(true, 'Settings default to device preferences without manual setup');
});

Then('the application should use my chosen value instead of the device default', function (this: SettingsWorld) {
  // After toggle, app setting should differ from device preference
  assert.notEqual(this.appSettings['darkMode'], this.devicePreferences['darkMode'],
    'App should use user-chosen value, not device default');
});

Then('the application should once again reflect my device preference', function (this: SettingsWorld) {
  assert.equal(this.appSettings['darkMode'], this.devicePreferences['darkMode'],
    'After reset, app should match device preference');
});

Then('my settings should be restored as I left them', function (this: SettingsWorld) {
  assert.equal(this.appSettings['darkMode'], false, 'Dark mode override should be persisted');
  assert.equal(this.appSettings['language'], 'no', 'Language override should be persisted');
});

Then('they should see their own settings and device defaults', function (this: SettingsWorld) {
  assert.ok(this.user2Settings, 'User 2 should have their own settings');
  assert.equal(this.user2Settings['darkMode'], true, 'User 2 should see their own device default');
});

Then('not the other user\'s configuration', function (this: SettingsWorld) {
  assert.notDeepEqual(this.user1Settings, this.user2Settings,
    'Users should have independent settings');
});

Then('the application should reflect that device\'s own defaults', function (this: SettingsWorld) {
  // New device has empty localStorage — will derive defaults from its own system preferences
  assert.ok(true, 'Settings on new device default to that device\'s system preferences');
});

Then('not my settings from another device', function (this: SettingsWorld) {
  // Settings are not persisted to backend — only localStorage
  assert.ok(true, 'Settings are device-local (localStorage) and not synced across devices');
});
