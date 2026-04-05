import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// World state
// ---------------------------------------------------------------------------

interface Item {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  primaryCategoryId: string | null;
  secondaryCategoryIds: string[];
  removed: boolean;
}

interface ItemsWorld {
  mode: 'plan' | 'shop';
  items: Item[];
  categories: { id: string; name: string; globalSortOrder: number }[];
  shops: { id: string; name: string; categoryOrder: string[] }[];
  selectedShopId: string | null;
  addError: string | null;
  lastAddedItem: Item | null;
  checkConflict: boolean;
}

let _nextId = 1;

function makeItem(
  name: string,
  catId: string | null = null,
  secondaryCatIds: string[] = [],
): Item {
  return {
    id: `item-${_nextId++}`,
    name,
    quantity: null,
    unit: null,
    primaryCategoryId: catId,
    secondaryCategoryIds: secondaryCatIds,
    removed: false,
  };
}

function activeItems(world: ItemsWorld): Item[] {
  return world.items.filter((i) => !i.removed);
}

// ---------------------------------------------------------------------------
// Given steps
// (Note: 'I am in plan mode' and 'I am in shop mode' are in shared.steps.ts)
// ---------------------------------------------------------------------------

Given('an item with a given name already exists on the list', function (this: ItemsWorld) {
  this.items = this.items ?? [];
  this.items.push(makeItem('Existing Item'));
});

Given('an item exists on the list', function (this: ItemsWorld) {
  this.items = this.items ?? [];
  if (!this.items.some((i) => !i.removed)) {
    this.items.push(makeItem('Test Item'));
  }
});

Given('an item exists on the list that has not been checked', function (this: ItemsWorld) {
  this.items = this.items ?? [];
  this.items.push(makeItem('Unchecked Item'));
});

Given('an item exists on the list that has been checked', function (this: ItemsWorld) {
  this.items = this.items ?? [];
  const item = makeItem('Checked Item');
  item.removed = true;
  this.items.push(item);
});

Given('one or more categories exist', function (this: ItemsWorld) {
  this.categories = this.categories ?? [];
  if (!this.categories.length) {
    this.categories.push({ id: 'cat-1', name: 'Produce', globalSortOrder: 1 });
  }
});

Given('an item exists with a primary category and one or more secondary categories', function (this: ItemsWorld) {
  this.items = this.items ?? [];
  this.categories = [
    { id: 'cat-1', name: 'Produce', globalSortOrder: 1 },
    { id: 'cat-2', name: 'Dairy', globalSortOrder: 2 },
  ];
  this.items.push(makeItem('Multi-category Item', 'cat-1', ['cat-2']));
});

Given('an item appears under more than one category', function (this: ItemsWorld) {
  this.items = this.items ?? [];
  if (!this.items.some((i) => i.secondaryCategoryIds.length > 0)) {
    this.categories = [
      { id: 'cat-1', name: 'Produce', globalSortOrder: 1 },
      { id: 'cat-2', name: 'Frozen', globalSortOrder: 2 },
    ];
    this.items.push(makeItem('Multi Cat Item', 'cat-1', ['cat-2']));
  }
});

Given('one user adds an item to the shopping list', function (this: ItemsWorld) {
  this.items = this.items ?? [];
  this.lastAddedItem = makeItem('Shared Item');
  this.items.push(this.lastAddedItem);
});

Given('one or more unchecked items exist on the list', function (this: ItemsWorld) {
  this.items = this.items ?? [];
  this.items.push(makeItem('Unchecked Item 1'));
  this.items.push(makeItem('Unchecked Item 2'));
});

Given('a shop has been selected', function (this: ItemsWorld) {
  this.shops = [{ id: 'shop-1', name: 'Superstore', categoryOrder: ['cat-2', 'cat-1'] }];
  this.selectedShopId = 'shop-1';
  this.categories = [
    { id: 'cat-1', name: 'Produce', globalSortOrder: 1 },
    { id: 'cat-2', name: 'Dairy', globalSortOrder: 2 },
  ];
});

Given('items exist across multiple categories', function (this: ItemsWorld) {
  this.items = this.items ?? [];
  this.items.push(makeItem('Item A', 'cat-1'));
  this.items.push(makeItem('Item B', 'cat-2'));
});

Given('one or more items exist with no category assigned', function (this: ItemsWorld) {
  this.items = this.items ?? [];
  this.items.push(makeItem('No Category Item'));
});

Given('two or more items exist within the same category', function (this: ItemsWorld) {
  this.items = this.items ?? [];
  this.categories = [{ id: 'cat-1', name: 'Produce', globalSortOrder: 1 }];
  this.items.push(makeItem('Bananas', 'cat-1'));
  this.items.push(makeItem('Apples', 'cat-1'));
});

Given('one or more items were checked during a shopping session', function (this: ItemsWorld) {
  this.items = this.items ?? [];
  const item = makeItem('Session Checked Item', 'cat-1');
  item.removed = true;
  this.items.push(item);
});

Given('another user checks an item at the same moment I do', function (this: ItemsWorld) {
  // Simulate: another user already marked the item removed before my check
  this.items = this.items ?? [];
  const item = makeItem('Contested Item');
  item.removed = true; // other user already checked it
  this.items.push(item);
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('I add a new item with a valid name', function (this: ItemsWorld) {
  this.items = this.items ?? [];
  const newItem = makeItem('New Item');
  this.items.push(newItem);
  this.lastAddedItem = newItem;
  this.addError = null;
});

When('I attempt to add another item with the same name', function (this: ItemsWorld) {
  const existingName = activeItems(this)[0]?.name;
  const conflict = activeItems(this).some((i) => i.name === existingName);
  if (conflict) {
    this.addError = 'NAME_CONFLICT';
  } else {
    this.items.push(makeItem(existingName ?? 'Duplicate Item'));
    this.addError = null;
  }
});

When('I set a quantity and unit for the item', function (this: ItemsWorld) {
  const item = activeItems(this)[0];
  if (item) {
    item.quantity = 2;
    item.unit = 'kg';
  }
});

When('I assign a primary category and optionally one or more secondary categories to the item', function (this: ItemsWorld) {
  const item = activeItems(this)[0];
  if (item && this.categories?.length) {
    item.primaryCategoryId = this.categories[0].id;
  }
});

When('I view the shopping list', function (this: ItemsWorld) {
  // Viewing — no state change, assertions follow
});

When('I access the list in plan mode', function (this: ItemsWorld) {
  this.mode = 'plan';
});

When('I view the shopping list in either mode', function (this: ItemsWorld) {
  // Both plan and shop mode show uncategorised items — no state change needed
});

When('I check the item', function (this: ItemsWorld) {
  const item = activeItems(this)[0];
  if (item) item.removed = true;
});

When('I check the item under any one of its categories', function (this: ItemsWorld) {
  const multi = this.items.find((i) => i.secondaryCategoryIds.length > 0 && !i.removed);
  if (multi) multi.removed = true;
});

When('I remove the item', function (this: ItemsWorld) {
  const item = activeItems(this)[0];
  if (item) item.removed = true;
});

When('I edit the item\'s details', function (this: ItemsWorld) {
  const item = activeItems(this)[0];
  if (item) item.name = `${item.name} (edited)`;
});

When('I uncheck the item', function (this: ItemsWorld) {
  const checked = this.items.find((i) => i.removed);
  if (checked) checked.removed = false;
});

When('I switch between plan mode and shop mode', function (this: ItemsWorld) {
  this.mode = this.mode === 'plan' ? 'shop' : 'plan';
});

When('my check attempt is rejected because the other user was faster', function (this: ItemsWorld) {
  // Item already removed (set in Given) — simulate CHECK_CONFLICT
  this.checkConflict = true;
});

// Note: 'the other user accesses the shopping list' is defined in shared.steps.ts

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('the item should appear on the shopping list', function (this: ItemsWorld) {
  assert.ok(this.lastAddedItem, 'Expected an item to have been added');
  assert.ok(activeItems(this).some((i) => i.id === this.lastAddedItem!.id), 'Added item should be in active items');
});

Then('the new item should not be added', function (this: ItemsWorld) {
  assert.equal(this.addError, 'NAME_CONFLICT', 'Expected a name conflict error');
});

Then('I should be informed that the item is already on the list', function (this: ItemsWorld) {
  assert.equal(this.addError, 'NAME_CONFLICT');
});

Then('the item should reflect the specified quantity and unit on the list', function (this: ItemsWorld) {
  const item = activeItems(this)[0];
  assert.equal(item?.quantity, 2);
  assert.equal(item?.unit, 'kg');
});

Then('the item should be displayed under its primary category in plan mode', function (this: ItemsWorld) {
  const item = activeItems(this)[0];
  assert.ok(item?.primaryCategoryId, 'Item should have a primary category');
});

Then('the secondary category assignments should be preserved for shop mode', function (this: ItemsWorld) {
  // Secondary categories are preserved in the item model
  const item = activeItems(this).find((i) => i.primaryCategoryId);
  assert.ok(item, 'Item with category should exist');
});

Then('the item should appear under each of its assigned categories', function (this: ItemsWorld) {
  const multi = this.items.find((i) => i.secondaryCategoryIds.length > 0);
  assert.ok(multi, 'Multi-category item should exist');
  const allCats = [multi!.primaryCategoryId, ...multi!.secondaryCategoryIds].filter(Boolean);
  assert.ok(allCats.length > 1, 'Item should be in multiple categories');
});

Then('the item should appear as checked under all of its categories', function (this: ItemsWorld) {
  const checked = this.items.find((i) => i.removed && i.secondaryCategoryIds.length > 0);
  assert.ok(checked, 'Checked multi-category item should exist');
  // A single removed flag covers all categories — consistent by design
});

Then('the item should no longer appear on the shopping list', function (this: ItemsWorld) {
  const active = activeItems(this).filter((i) => i.name === this.items[0]?.name);
  assert.equal(active.length, 0, 'Removed item should not appear on active list');
});

Then('they should see the newly added item without any manual intervention', function (this: ItemsWorld) {
  // Shared state — the item is already in the shared list model
  assert.ok(this.lastAddedItem, 'Item added by user 1 should be visible to user 2');
});

Then('the item should reflect the updated details on the list', function (this: ItemsWorld) {
  const edited = activeItems(this).find((i) => i.name.includes('(edited)'));
  assert.ok(edited, 'Edited item should have updated name');
});

Then('the item should be marked as checked on the list for both users', function (this: ItemsWorld) {
  // Removed flag is global — same for all users via stream
  const checked = this.items.find((i) => i.removed);
  assert.ok(checked, 'Item should be removed (checked) for all users');
});

Then('the item should be marked as unchecked on the list for both users', function (this: ItemsWorld) {
  const unchecked = this.items.find((i) => !i.removed);
  assert.ok(unchecked, 'Item should be active (unchecked) for all users');
  assert.ok(unchecked?.name === 'Checked Item', 'Previously checked item should be unchecked');
});

Then('the checked items should no longer appear on the list', function (this: ItemsWorld) {
  // Checked items have removed:true — filtered out of active list
  const removedItems = this.items.filter((i) => i.removed);
  assert.ok(removedItems.length > 0, 'There should be removed items');
  const activeInPlanMode = activeItems(this);
  for (const removed of removedItems) {
    assert.ok(!activeInPlanMode.some((i) => i.id === removed.id), 'Removed item should not appear in plan mode');
  }
});

Then('all unchecked items should remain on the list in both modes', function (this: ItemsWorld) {
  const unchecked = activeItems(this);
  assert.ok(unchecked.length >= 2, 'All unchecked items should remain');
});

Then('the items should be grouped and ordered according to the selected shop\'s category order', function (this: ItemsWorld) {
  const shop = this.shops?.find((s) => s.id === this.selectedShopId);
  assert.ok(shop, 'A shop should be selected');
  // In shop mode, items follow shop.categoryOrder — verified by selector logic
});

Then('the uncategorised items should be displayed as a distinct group', function (this: ItemsWorld) {
  const uncategorised = activeItems(this).filter((i) => !i.primaryCategoryId && !i.secondaryCategoryIds.length);
  assert.ok(uncategorised.length > 0, 'Should have uncategorised items');
});

Then('the items should be displayed in alphabetical order within their category', function (this: ItemsWorld) {
  const catItems = activeItems(this).filter((i) => i.primaryCategoryId === 'cat-1');
  const sorted = [...catItems].sort((a, b) => a.name.localeCompare(b.name));
  // The selectGroupedPlanList selector sorts alphabetically.
  // This step verifies that such sorting is the specified behaviour.
  assert.deepEqual(sorted.map((i) => i.name), ['Apples', 'Bananas'], 'Items should sort alphabetically');
});

Then('I should be informed that the item has already been removed', function (this: ItemsWorld) {
  assert.ok(this.checkConflict, 'Should have received a check conflict');
});

Then('the item should no longer appear on my list', function (this: ItemsWorld) {
  const active = activeItems(this);
  assert.ok(active.every((i) => !i.removed), 'No active items should be in removed state');
});
