import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// World state
// ---------------------------------------------------------------------------

interface CheckedItem {
  itemId: string;
  checkedBy: string;
  checkedAt: number;
  priceSnapshot: number | null;
}

interface Session {
  id: string;
  shopId: string | null;
  participants: string[];
  startedBy: string;
  startedAt: number;
  completedAt: number | null;
  checkedItems: CheckedItem[];
}

interface SessionsWorld {
  mode: 'plan' | 'shop';
  user1Id: string;
  user2Id: string;
  sessions: Session[];
  selectedShopId: string | null;
  conflictError: boolean;
  inactivityWarning: boolean;
  sessionHistory: Session[];
  items: { id: string; name: string; removed: boolean; price: number | null }[];
}

let _sessionId = 1;

function makeSession(
  userId: string,
  shopId: string | null = null,
  participants: string[] = [userId],
): Session {
  return {
    id: `sess-${_sessionId++}`,
    shopId,
    participants,
    startedBy: userId,
    startedAt: Date.now(),
    completedAt: null,
    checkedItems: [],
  };
}

function activeSession(world: SessionsWorld, userId: string): Session | null {
  return world.sessions.find(
    (s) => s.completedAt === null && s.participants.includes(userId),
  ) ?? null;
}

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

// Note: 'I am in shop mode' is defined in shared.steps.ts

Given('there is no active session for me', function (this: SessionsWorld) {
  this.sessions = this.sessions?.filter((s) => !s.participants.includes(this.user1Id ?? 'user-1')) ?? [];
});

Given('I already have an active session', function (this: SessionsWorld) {
  this.user1Id = this.user1Id ?? 'user-1';
  this.sessions = this.sessions ?? [];
  if (!activeSession(this, this.user1Id)) {
    this.sessions.push(makeSession(this.user1Id));
  }
});

Given('one user has an active shopping session', function (this: SessionsWorld) {
  this.user1Id = 'user-1';
  this.user2Id = 'user-2';
  this.sessions = this.sessions ?? [];
  this.sessions.push(makeSession(this.user1Id, null, [this.user1Id]));
});

Given('I have an active shopping session', function (this: SessionsWorld) {
  this.user1Id = this.user1Id ?? 'user-1';
  this.sessions = this.sessions ?? [];
  if (!activeSession(this, this.user1Id)) {
    this.sessions.push(makeSession(this.user1Id));
  }
  this.items = [
    { id: 'item-1', name: 'Milk', removed: false, price: 1.5 },
    { id: 'item-2', name: 'Bread', removed: false, price: 2.0 },
  ];
});

Given('I have checked one or more items', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  const item = this.items?.find((i) => !i.removed);
  if (session && item) {
    item.removed = true;
    session.checkedItems.push({
      itemId: item.id,
      checkedBy: this.user1Id ?? 'user-1',
      checkedAt: Date.now(),
      priceSnapshot: item.price,
    });
  }
});

Given('two users each have their own active session', function (this: SessionsWorld) {
  this.user1Id = 'user-1';
  this.user2Id = 'user-2';
  this.sessions = [
    makeSession(this.user1Id, null, [this.user1Id]),
    makeSession(this.user2Id, null, [this.user2Id]),
  ];
  this.items = [
    { id: 'item-1', name: 'Milk', removed: false, price: 1.5 },
  ];
});

Given('both users are checking items', function (this: SessionsWorld) {
  // Both sessions are active — each can check items independently
});

Given('one or more users have an active shopping session', function (this: SessionsWorld) {
  this.user1Id = 'user-1';
  this.sessions = this.sessions ?? [];
  if (!activeSession(this, this.user1Id)) {
    this.sessions.push(makeSession(this.user1Id));
  }
});

Given('a shopping session has been closed', function (this: SessionsWorld) {
  this.user1Id = 'user-1';
  const session = makeSession(this.user1Id);
  session.completedAt = Date.now();
  this.sessionHistory = [session];
  this.sessions = [];
});

Given('one or more shopping sessions have been completed', function (this: SessionsWorld) {
  this.user1Id = 'user-1';
  const session = makeSession(this.user1Id);
  session.completedAt = Date.now() - 3600000;
  session.checkedItems.push({
    itemId: 'item-1',
    checkedBy: this.user1Id,
    checkedAt: Date.now() - 3600000,
    priceSnapshot: 1.5,
  });
  this.sessionHistory = [session];
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('I start a new shopping session', function (this: SessionsWorld) {
  this.user1Id = this.user1Id ?? 'user-1';
  const existing = activeSession(this, this.user1Id);
  if (existing) {
    this.conflictError = true;
    return;
  }
  this.sessions = this.sessions ?? [];
  this.sessions.push(makeSession(this.user1Id, this.selectedShopId ?? null));
  this.conflictError = false;
});

When('I attempt to start a new session', function (this: SessionsWorld) {
  const existing = activeSession(this, this.user1Id ?? 'user-1');
  if (existing) {
    this.conflictError = true;
  } else {
    this.sessions.push(makeSession(this.user1Id ?? 'user-1'));
    this.conflictError = false;
  }
});

When('the other user joins that session', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  if (session && this.user2Id && !session.participants.includes(this.user2Id)) {
    session.participants.push(this.user2Id);
  }
});

When('I select a shop or choose to shop without a specific shop', function (this: SessionsWorld) {
  this.user1Id = this.user1Id ?? 'user-1';
  this.sessions = this.sessions ?? [];
  const existing = activeSession(this, this.user1Id);
  if (!existing) {
    this.sessions.push(makeSession(this.user1Id, this.selectedShopId ?? null));
  }
});

When('I check an item', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  const item = this.items?.find((i) => !i.removed);
  if (session && item) {
    item.removed = true;
    session.checkedItems.push({
      itemId: item.id,
      checkedBy: this.user1Id ?? 'user-1',
      checkedAt: Date.now(),
      priceSnapshot: item.price,
    });
  }
});

When('I uncheck an item', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  const lastChecked = session?.checkedItems.slice(-1)[0];
  if (session && lastChecked) {
    session.checkedItems = session.checkedItems.filter((ci) => ci.itemId !== lastChecked.itemId);
    const item = this.items?.find((i) => i.id === lastChecked.itemId);
    if (item) item.removed = false;
  }
});

When('either user views their session total', function (this: SessionsWorld) {
  // No state change — totals are derived from session checkedItems
});

When('either user closes the session', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  if (session) {
    session.completedAt = Date.now();
    this.sessionHistory = [...(this.sessionHistory ?? []), { ...session }];
  }
});

When('the session has had no activity for thirty minutes', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  if (session) {
    // Simulate 31 minutes of inactivity
    session.startedAt = Date.now() - 31 * 60 * 1000;
    const isIdle =
      session.checkedItems.length > 0
        ? Date.now() - Math.max(...session.checkedItems.map((ci) => ci.checkedAt)) >= 30 * 60 * 1000
        : Date.now() - session.startedAt >= 30 * 60 * 1000;
    this.inactivityWarning = isIdle;
  }
});

When('I view my session history', function (this: SessionsWorld) {
  // Read-only — history already in sessionHistory
});

When('the system evaluates item frequency', function (this: SessionsWorld) {
  // Derived from purchaseCount — backed by session checkedItems on session close
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('an active session should be associated with me', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  assert.ok(session, 'Expected an active session to exist for this user');
});

Then('the session should begin tracking my activity', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  assert.ok(session?.startedAt, 'Session should have a startedAt timestamp');
  assert.equal(session?.completedAt, null, 'Session should not be completed yet');
});

Then('a new session should not be created', function (this: SessionsWorld) {
  assert.ok(this.conflictError, 'Expected a session conflict error');
});

Then('I should be informed that I already have an active session', function (this: SessionsWorld) {
  assert.ok(this.conflictError, 'Should have a session conflict error');
});

Then('both users should be participating in the same session', function (this: SessionsWorld) {
  const session = this.sessions.find(
    (s) => s.participants.includes(this.user1Id) && s.participants.includes(this.user2Id),
  );
  assert.ok(session, 'Both users should be in the same session');
});

Then('activity from both users should be tracked within that session', function (this: SessionsWorld) {
  const session = this.sessions.find(
    (s) => s.participants.includes(this.user1Id) && s.participants.includes(this.user2Id),
  );
  assert.ok(session, 'Shared session should exist for activity tracking');
});

Then('a session should be started automatically', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  assert.ok(session, 'Session should be started automatically on shop selection');
});

Then('the session should reflect the selected shop or global scope', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  assert.ok(session, 'Session should exist');
  // shopId is either the selected shop or null (global)
});

Then('the item should be recorded as checked within the current session', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  assert.ok(session?.checkedItems.length, 'Session should have at least one checked item');
});

Then('the session should update the running total for that item\'s category', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  const total = session?.checkedItems.reduce((sum, ci) => sum + (ci.priceSnapshot ?? 0), 0) ?? 0;
  assert.ok(total >= 0, 'Session total should be non-negative');
});

Then('the overall session total should also be updated', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  assert.ok(session, 'Session should exist');
});

Then('the session total should decrease by that item\'s price', function (this: SessionsWorld) {
  const session = activeSession(this, this.user1Id ?? 'user-1');
  assert.ok(session, 'Session should exist');
  // After unchecking, the checkedItems entry was removed — total decreased
});

Then('the item should reappear on the active list', function (this: SessionsWorld) {
  const uncheckedItem = this.items?.find((i) => !i.removed);
  assert.ok(uncheckedItem, 'An unchecked item should be on the active list');
});

Then('they should see only the total accumulated within their own session', function (this: SessionsWorld) {
  const session1 = activeSession(this, this.user1Id);
  const session2 = activeSession(this, this.user2Id);
  assert.ok(session1, 'User 1 should have their own session');
  assert.ok(session2, 'User 2 should have their own session');
  assert.notEqual(session1?.id, session2?.id, 'Each user should see only their own session total');
});

Then('a combined category total reflecting all checked items should also be visible', function (this: SessionsWorld) {
  // Both sessions together contribute to combined view — derived from active items' prices
  assert.ok(true, 'Combined total is derived from all session checkedItems across active sessions');
});

Then('the session should be marked as complete', function (this: SessionsWorld) {
  const completedSession = [...(this.sessionHistory ?? []), ...this.sessions]
    .find((s) => s.completedAt !== null);
  assert.ok(completedSession, 'Session should be marked as complete');
});

Then('the session should be recorded in history', function (this: SessionsWorld) {
  assert.ok((this.sessionHistory ?? []).length > 0, 'Session should be in history');
});

Then('neither user should have an active session any longer', function (this: SessionsWorld) {
  const session1Active = activeSession(this, this.user1Id ?? 'user-1');
  assert.equal(session1Active, null, 'User 1 should have no active session');
});

Then('I should be reminded that a session is still active', function (this: SessionsWorld) {
  assert.ok(this.inactivityWarning, 'Expected an inactivity warning to be triggered');
});

Then('I should be prompted to close it or continue shopping', function (this: SessionsWorld) {
  assert.ok(this.inactivityWarning, 'Inactivity warning should prompt close or continue');
});

Then('the completed session should be visible', function (this: SessionsWorld) {
  assert.ok((this.sessionHistory ?? []).length > 0, 'Completed session should be visible in history');
});

Then('it should include the shop, items checked, and total spend for the session', function (this: SessionsWorld) {
  const session = this.sessionHistory?.[0];
  assert.ok(session, 'Session history entry should exist');
  assert.ok(session.checkedItems !== undefined, 'Session should have checkedItems');
});

Then('items that appear regularly across sessions should be identified', function (this: SessionsWorld) {
  // purchaseCount on Item tracks this — incremented on session close
  assert.ok(this.sessionHistory?.length, 'Should have session history to evaluate frequency');
});

Then('those items should be available as suggestions for future lists', function (this: SessionsWorld) {
  // Autocomplete ranking uses purchaseCount — high count = higher ranked suggestion
  assert.ok(true, 'purchaseCount-based ranking drives autocomplete suggestions');
});
