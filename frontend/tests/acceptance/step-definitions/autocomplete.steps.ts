import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// World state
// ---------------------------------------------------------------------------

interface AutocompleteItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  categoryId: string | null;
  purchaseCount: number;
}

interface AutocompleteWorld {
  autocompleteItems: AutocompleteItem[];
  suggestions: AutocompleteItem[];
  selectedSuggestion: AutocompleteItem | null;
  addedItem: { name: string; quantity: number | null; unit: string | null; categoryId: string | null } | null;
  inputText: string;
  suggestionsDisplayed: boolean;
  namesOnList: string[];
  fullMatchListDisplayed: boolean;
}

/** Suggestions shown before the user asks to see every match. */
const COMPACT_SUGGESTION_COUNT = 3;

let _acId = 1;

function makeAcItem(name: string, purchaseCount = 1, catId: string | null = null): AutocompleteItem {
  return {
    id: `ac-${_acId++}`,
    name,
    quantity: null,
    unit: null,
    categoryId: catId,
    purchaseCount,
  };
}

function makeAcVariant(
  name: string,
  quantity: number,
  unit: string,
  purchaseCount: number,
): AutocompleteItem {
  return { id: `ac-${_acId++}`, name, quantity, unit, categoryId: null, purchaseCount };
}

/** Every match, ranked. Omit `limit` for the full list the "show all" affordance reveals. */
function getMatches(
  world: AutocompleteWorld,
  input: string,
  limit?: number,
): AutocompleteItem[] {
  if (!input || input.length < 2) return [];
  const byName = new Map<string, AutocompleteItem>();
  for (const i of world.autocompleteItems) {
    if (!i.name.toLowerCase().includes(input.toLowerCase())) continue;
    const key = i.name.toLowerCase();
    const existing = byName.get(key);
    if (!existing || i.purchaseCount > existing.purchaseCount) {
      byName.set(key, i);
    }
  }
  const ranked = [...byName.values()].sort(
    (a, b) => b.purchaseCount - a.purchaseCount,
  );
  return limit === undefined ? ranked : ranked.slice(0, limit);
}

function getSuggestions(world: AutocompleteWorld, input: string): AutocompleteItem[] {
  return getMatches(world, input, COMPACT_SUGGESTION_COUNT);
}

function isOnList(world: AutocompleteWorld, name: string): boolean {
  return (world.namesOnList ?? []).some(
    (n) => n.toLowerCase() === name.toLowerCase(),
  );
}

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('one or more items have previously been on the shopping list', function (this: AutocompleteWorld) {
  this.autocompleteItems = [
    makeAcItem('Milk', 5, 'cat-dairy'),
    makeAcItem('Bread', 3, 'cat-bakery'),
    makeAcItem('Butter', 2, 'cat-dairy'),
  ];
  this.suggestions = [];
  this.selectedSuggestion = null;
  this.addedItem = null;
  this.inputText = '';
  this.suggestionsDisplayed = false;
});

Given('previously added items are being suggested', function (this: AutocompleteWorld) {
  this.autocompleteItems = [makeAcItem('Milk', 5, 'cat-dairy')];
  this.inputText = 'Mil';
  this.suggestions = getSuggestions(this, this.inputText);
  this.suggestionsDisplayed = this.suggestions.length > 0;
});

Given('I have selected a suggestion and details have been pre-filled', function (this: AutocompleteWorld) {
  this.autocompleteItems = [{ id: 'ac-1', name: 'Milk', quantity: 2, unit: 'L', categoryId: 'cat-dairy', purchaseCount: 5 }];
  this.selectedSuggestion = this.autocompleteItems[0];
  this.addedItem = {
    name: this.selectedSuggestion.name,
    quantity: this.selectedSuggestion.quantity,
    unit: this.selectedSuggestion.unit,
    categoryId: this.selectedSuggestion.categoryId,
  };
});

Given('multiple previously added items match what I am adding', function (this: AutocompleteWorld) {
  this.autocompleteItems = [
    makeAcItem('Milk', 10),
    makeAcItem('Milkshake', 2),
    makeAcItem('Milk Chocolate', 4),
  ];
  this.inputText = 'Milk';
  this.suggestions = getSuggestions(this, this.inputText);
  this.suggestionsDisplayed = true;
});

Given('the same item has previously been bought in several quantity or unit variants', function (this: AutocompleteWorld) {
  this.autocompleteItems = [
    makeAcVariant('Milk', 1, 'L', 4),
    makeAcVariant('Milk', 1.5, 'L', 9),
    makeAcVariant('Milk', 0.5, 'L', 2),
  ];
  this.inputText = 'Milk';
  this.suggestions = [];
  this.suggestionsDisplayed = false;
});

Given('suggestions are displayed when adding a new item', function (this: AutocompleteWorld) {
  this.autocompleteItems = [makeAcItem('Milk', 5)];
  this.inputText = 'Mil';
  this.suggestions = getSuggestions(this, this.inputText);
  this.suggestionsDisplayed = true;
});

Given('more previously added items match what I am adding than are initially suggested', function (this: AutocompleteWorld) {
  this.autocompleteItems = [
    makeAcItem('Milky Way', 10, 'cat-snacks'),
    makeAcItem('Milkshake', 8, 'cat-dairy'),
    makeAcItem('Milk', 6, 'cat-dairy'),
    makeAcItem('Oat milk', 4, 'cat-dairy'),
    makeAcItem('Milk chocolate', 2, 'cat-snacks'),
  ];
  this.namesOnList = [];
  this.inputText = 'milk';
  this.suggestions = getSuggestions(this, this.inputText);
  this.suggestionsDisplayed = true;
  this.fullMatchListDisplayed = false;
  assert.ok(
    getMatches(this, this.inputText).length > this.suggestions.length,
    'Precondition: more matches exist than are initially suggested',
  );
});

Given('all matching previously added items are listed', function (this: AutocompleteWorld) {
  this.autocompleteItems = [
    { id: 'ac-1', name: 'Milky Way', quantity: 1, unit: 'pcs', categoryId: 'cat-snacks', purchaseCount: 10 },
    { id: 'ac-2', name: 'Milkshake', quantity: 1, unit: 'pcs', categoryId: 'cat-dairy', purchaseCount: 8 },
    { id: 'ac-3', name: 'Milk', quantity: 2, unit: 'L', categoryId: 'cat-dairy', purchaseCount: 6 },
    { id: 'ac-4', name: 'Oat milk', quantity: 1, unit: 'L', categoryId: 'cat-dairy', purchaseCount: 4 },
  ];
  this.namesOnList = [];
  this.inputText = 'milk';
  this.suggestions = getMatches(this, this.inputText);
  this.suggestionsDisplayed = true;
  this.fullMatchListDisplayed = true;
  this.selectedSuggestion = null;
  this.addedItem = null;
});

Given('one of them is already on the shopping list', function (this: AutocompleteWorld) {
  this.namesOnList = ['oat MILK'];
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('I choose to see all matching items', function (this: AutocompleteWorld) {
  this.suggestions = getMatches(this, this.inputText);
  this.fullMatchListDisplayed = true;
});

When('I choose one of them', function (this: AutocompleteWorld) {
  const choice = this.suggestions.find((s) => !isOnList(this, s.name)) ?? null;
  this.selectedSuggestion = choice;
  if (choice) {
    this.addedItem = {
      name: choice.name,
      quantity: choice.quantity,
      unit: choice.unit,
      categoryId: choice.categoryId,
    };
    this.fullMatchListDisplayed = false;
  }
});

When('I begin adding a new item', function (this: AutocompleteWorld) {
  this.inputText = 'Mi';
  this.suggestions = getSuggestions(this, this.inputText);
  this.suggestionsDisplayed = this.suggestions.length > 0;
});

When('I select a suggestion', function (this: AutocompleteWorld) {
  this.selectedSuggestion = this.suggestions[0] ?? null;
  if (this.selectedSuggestion) {
    this.addedItem = {
      name: this.selectedSuggestion.name,
      quantity: this.selectedSuggestion.quantity,
      unit: this.selectedSuggestion.unit,
      categoryId: this.selectedSuggestion.categoryId,
    };
  }
});

When('I modify any of the pre-filled details', function (this: AutocompleteWorld) {
  if (this.addedItem) {
    this.addedItem.quantity = 3; // user changes from 2 to 3
  }
});

When('suggestions are displayed', function (this: AutocompleteWorld) {
  // Already set in Given
});

When('suggestions are displayed for that item', function (this: AutocompleteWorld) {
  this.suggestions = getSuggestions(this, this.inputText);
  this.suggestionsDisplayed = this.suggestions.length > 0;
});

When('I ignore the suggestions and enter a new item name', function (this: AutocompleteWorld) {
  this.inputText = 'Oat Milk';
  this.selectedSuggestion = null;
  this.addedItem = { name: 'Oat Milk', quantity: null, unit: null, categoryId: null };
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('the application should suggest matching previously added items', function (this: AutocompleteWorld) {
  assert.ok(this.suggestionsDisplayed, 'Suggestions should be displayed');
  assert.ok(this.suggestions.length > 0, 'Should have at least one suggestion');
});

Then('the item should be added to the list', function (this: AutocompleteWorld) {
  assert.ok(this.addedItem, 'An item should have been added');
  assert.ok(this.addedItem?.name, 'Added item should have a name');
});

Then('its previously used category, quantity, and unit should be pre-filled', function (this: AutocompleteWorld) {
  assert.equal(this.addedItem?.categoryId, 'cat-dairy', 'Category should be pre-filled');
});

Then('the modified values should be used when the item is added to the list', function (this: AutocompleteWorld) {
  assert.equal(this.addedItem?.quantity, 3, 'Modified quantity should be used');
});

Then('more frequently bought items should appear higher in the suggestions', function (this: AutocompleteWorld) {
  assert.ok(this.suggestions.length >= 2, 'Should have multiple suggestions');
  const first = this.suggestions[0];
  const second = this.suggestions[1];
  assert.ok(first.purchaseCount >= second.purchaseCount, 'Most frequent item should be first');
});

Then('only the most frequently bought variant of that item should be suggested', function (this: AutocompleteWorld) {
  const milk = this.suggestions.filter((s) => s.name.toLowerCase() === 'milk');
  assert.equal(milk.length, 1, 'Exactly one Milk variant should be suggested');
  assert.equal(milk[0].quantity, 1.5, 'The most-purchased variant (1.5 L) should be the one suggested');
  assert.equal(milk[0].purchaseCount, 9, 'The suggested variant should be the highest purchaseCount');
});

Then('no other variant of the same item should appear in the suggestions', function (this: AutocompleteWorld) {
  const milk = this.suggestions.filter((s) => s.name.toLowerCase() === 'milk');
  assert.equal(milk.length, 1, 'No additional Milk variants should appear');
});

Then('every matching previously added item should be listed', function (this: AutocompleteWorld) {
  assert.ok(this.fullMatchListDisplayed, 'The full match list should be shown');
  const expected = getMatches(this, this.inputText).map((i) => i.name);
  assert.deepEqual(this.suggestions.map((i) => i.name), expected);
  assert.ok(
    expected.length > COMPACT_SUGGESTION_COUNT,
    'The full list should go beyond the truncated set',
  );
});

Then('that item should be added to the list with its previously used category, quantity, and unit', function (this: AutocompleteWorld) {
  const chosen = this.selectedSuggestion;
  assert.ok(chosen, 'A suggestion should have been chosen');
  assert.deepEqual(this.addedItem, {
    name: chosen.name,
    quantity: chosen.quantity,
    unit: chosen.unit,
    categoryId: chosen.categoryId,
  });
});

Then('the full match list should no longer be shown', function (this: AutocompleteWorld) {
  assert.equal(this.fullMatchListDisplayed, false, 'The full match list should be dismissed');
});

Then('that item should be indicated as already on the list', function (this: AutocompleteWorld) {
  const onList = this.suggestions.filter((s) => isOnList(this, s.name));
  assert.equal(onList.length, 1, 'Exactly one listed item should be flagged as already on the list');
});

Then('it should not be selectable', function (this: AutocompleteWorld) {
  const onList = this.suggestions.filter((s) => isOnList(this, s.name));
  for (const item of onList) {
    this.selectedSuggestion = null;
    this.addedItem = null;
    // Choosing an already-listed item is a no-op.
    if (!isOnList(this, item.name)) {
      this.addedItem = {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        categoryId: item.categoryId,
      };
    }
    assert.equal(this.addedItem, null, `${item.name} should not be addable again`);
  }
});

Then('the new item should be added as entered', function (this: AutocompleteWorld) {
  assert.equal(this.addedItem?.name, 'Oat Milk', 'Item should be added with the entered name');
});

Then('no suggestion should be automatically applied', function (this: AutocompleteWorld) {
  assert.equal(this.selectedSuggestion, null, 'No suggestion should be applied');
});
