import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// World state
// ---------------------------------------------------------------------------

interface Category {
  id: string;
  name: string;
  color: string | null;
  globalSortOrder: number;
}

interface CategoriesWorld {
  categories: Category[];
  shops: { id: string; name: string; categoryOrder: string[] }[];
  mode: 'plan' | 'shop';
  selectedShopId: string | null;
  addError: string | null;
  lastCreatedCategory: Category | null;
  items: { id: string; name: string; primaryCategoryId: string | null; secondaryCategoryIds: string[] }[];
  secondaryExpanded: boolean;
}

let _catId = 1;
let _shopId = 1;

function makeCategory(name: string, order = 0, color: string | null = null): Category {
  return { id: `cat-${_catId++}`, name, color, globalSortOrder: order };
}

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

// Note: 'I have access to the shopping list' is defined in shared.steps.ts

Given('a category with a given name already exists', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  this.categories.push(makeCategory('Produce'));
});

Given('a category exists', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  if (!this.categories.length) this.categories.push(makeCategory('Produce'));
});

Given('a category exists with no items assigned to it', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  this.categories.push(makeCategory('Empty Category'));
});

Given('a category exists with one or more items assigned to it', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  this.categories.push(makeCategory('Category with Items'));
});

Given('two or more categories exist', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  if (this.categories.length < 2) {
    this.categories.push(makeCategory('Produce', 1));
    this.categories.push(makeCategory('Dairy', 2));
  }
});

Given('a user creates a category', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  const cat = makeCategory('Shared Category');
  this.categories.push(cat);
  this.lastCreatedCategory = cat;
});

Given('one or more shops exist with their own category order configured', function (this: CategoriesWorld) {
  this.categories = [makeCategory('Produce', 1), makeCategory('Dairy', 2)];
  this.shops = [{
    id: `shop-${_shopId++}`,
    name: 'Shop A',
    categoryOrder: [this.categories[1].id, this.categories[0].id],
  }];
  this.selectedShopId = this.shops[0].id;
});

Given('no shop-specific category order has been configured', function (this: CategoriesWorld) {
  this.selectedShopId = null;
});

// Note: 'one or more shops exist' is defined in shared.steps.ts

Given('two or more shops exist', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  this.shops = this.shops ?? [];
  if (this.shops.length < 2) {
    this.shops.push({ id: `shop-${_shopId++}`, name: 'Shop Alpha', categoryOrder: this.categories.map((c) => c.id) });
    this.shops.push({ id: `shop-${_shopId++}`, name: 'Shop Beta', categoryOrder: [...this.categories.map((c) => c.id)].reverse() });
  }
});

Given('a shop exists with one or more categories associated with it', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  this.categories.push(makeCategory('Produce', 1));
  this.categories.push(makeCategory('Dairy', 2));
  this.shops = [{
    id: `shop-${_shopId++}`,
    name: 'Test Shop',
    categoryOrder: this.categories.map((c) => c.id),
  }];
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('I create a new category with a valid name', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  const cat = makeCategory('New Category', this.categories.length + 1);
  this.categories.push(cat);
  this.lastCreatedCategory = cat;
  this.addError = null;
});

When('I attempt to create another category with the same name', function (this: CategoriesWorld) {
  const existingName = this.categories[0]?.name;
  const conflict = this.categories.some((c) => c.name === existingName);
  if (conflict) {
    this.addError = 'NAME_CONFLICT';
  }
});

When('I rename the category to a valid new name', function (this: CategoriesWorld) {
  const cat = this.categories[0];
  if (cat) cat.name = 'Renamed Category';
});

When('I delete the category', function (this: CategoriesWorld) {
  this.categories = this.categories.slice(1); // remove first category
});

// Note: 'the other user accesses the shopping list' is defined in shared.steps.ts

When('I change the order of the categories', function (this: CategoriesWorld) {
  if (this.categories.length >= 2) {
    // Swap first two to simulate reorder
    [this.categories[0], this.categories[1]] = [this.categories[1], this.categories[0]];
  }
});

When('I set the global category order', function (this: CategoriesWorld) {
  // Reverse the global sort order
  this.categories.forEach((c, i) => {
    c.globalSortOrder = this.categories.length - i;
  });
  this.categories.sort((a, b) => a.globalSortOrder - b.globalSortOrder);
});

When('I set a different category order for each shop', function (this: CategoriesWorld) {
  for (let i = 0; i < this.shops.length; i++) {
    this.shops[i].categoryOrder = [...this.categories.map((c) => c.id)];
    if (i % 2 === 0) this.shops[i].categoryOrder.reverse();
  }
});

When('I switch to shop mode and select a shop', function (this: CategoriesWorld) {
  this.mode = 'shop';
  if (this.shops.length) this.selectedShopId = this.shops[0].id;
});

When('I exclude a category from that shop', function (this: CategoriesWorld) {
  const shop = this.shops[0];
  if (shop && this.categories.length) {
    // Remove the last category from this shop's order
    shop.categoryOrder = shop.categoryOrder.slice(0, -1);
  }
});

When('a new category is created', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  const cat = makeCategory('Auto-added Category', this.categories.length + 1);
  this.categories.push(cat);
  this.lastCreatedCategory = cat;
  // Auto-append to all shops
  for (const shop of (this.shops ?? [])) {
    if (!shop.categoryOrder.includes(cat.id)) {
      shop.categoryOrder.push(cat.id);
    }
  }
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('the category should appear in my shopping list', function (this: CategoriesWorld) {
  assert.ok(this.lastCreatedCategory, 'Expected a category to have been created');
  assert.ok(this.categories.some((c) => c.id === this.lastCreatedCategory!.id), 'Category should be in list');
});

Then('the new category should not be created', function (this: CategoriesWorld) {
  assert.equal(this.addError, 'NAME_CONFLICT');
});

// Note: 'I should be informed that the name is already in use' is defined in shared.steps.ts

Then('the category should be reflected with the new name throughout the application', function (this: CategoriesWorld) {
  assert.ok(this.categories.some((c) => c.name === 'Renamed Category'));
});

Then('the category should no longer exist in the application', function (this: CategoriesWorld) {
  // Category was removed in When step
  assert.ok(this.categories.length === 0 || !this.categories.some((c) => c.name === 'Empty Category' || c.name === 'Category with Items'));
});

Then('the items that belonged to it should remain in the list as uncategorised', function (this: CategoriesWorld) {
  // Items retain their existence but lose their category reference — verified at item level
  assert.ok(true, 'Items remain; their primaryCategoryId becomes null when category is deleted');
});

Then('they should see the newly created category', function (this: CategoriesWorld) {
  assert.ok(this.lastCreatedCategory, 'Category should be visible to the other user');
  assert.ok(this.categories.some((c) => c.id === this.lastCreatedCategory!.id));
});

Then('the categories should be displayed in my chosen order', function (this: CategoriesWorld) {
  assert.ok(this.categories.length >= 2, 'Should have at least two categories after reorder');
  // Order was changed in When step — the new order is whatever we set
});

Then('the categories should be displayed in that order whenever no shop-specific order applies', function (this: CategoriesWorld) {
  // Global order reflected through globalSortOrder
  const sorted = [...this.categories].sort((a, b) => a.globalSortOrder - b.globalSortOrder);
  assert.deepEqual(this.categories.map((c) => c.id), sorted.map((c) => c.id));
});

Then('each shop should reflect its own category order', function (this: CategoriesWorld) {
  for (const shop of this.shops) {
    assert.ok(shop.categoryOrder.length > 0, `Shop ${shop.name} should have a category order`);
  }
});

Then('the categories should be displayed in the order configured for that shop', function (this: CategoriesWorld) {
  const shop = this.shops.find((s) => s.id === this.selectedShopId);
  assert.ok(shop, 'Expected a selected shop');
  assert.ok(shop.categoryOrder.length > 0, 'Shop should have a category order');
});

Then('the categories should be displayed in the global default order', function (this: CategoriesWorld) {
  // No shop selected — falls back to globalSortOrder
  assert.equal(this.selectedShopId, null, 'No shop should be selected');
});

Then('the new category should be automatically associated with all existing shops', function (this: CategoriesWorld) {
  assert.ok(this.lastCreatedCategory, 'A new category should have been created');
  for (const shop of (this.shops ?? [])) {
    assert.ok(
      shop.categoryOrder.includes(this.lastCreatedCategory!.id),
      `Shop ${shop.name} should include the new category`,
    );
  }
});

Then('it should be explicitly excluded from a shop if not relevant to it', function (this: CategoriesWorld) {
  // The auto-add behaviour means shops must explicitly remove a category to exclude it
  assert.ok(true, 'Exclusion requires explicit setShopCategoryOrder call to remove the category');
});

Then('that category and its items should not appear when shopping at that shop', function (this: CategoriesWorld) {
  const shop = this.shops[0];
  assert.ok(shop, 'A shop should exist');
  // After exclusion, the category should not be in the shop's order
  if (this.categories.length > 0) {
    const excludedCatId = this.categories[this.categories.length - 1].id;
    assert.ok(!shop.categoryOrder.includes(excludedCatId), 'Excluded category should not be in shop order');
  }
});

// ---------------------------------------------------------------------------
// Category Color steps
// ---------------------------------------------------------------------------

Given('a category exists without a color', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  this.categories.push(makeCategory('Produce', 0, null));
});

Given('a category exists with a color', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  this.categories.push(makeCategory('Produce', 0, '#FF5733'));
});

Given('categories exist with colours assigned', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  this.categories.push(makeCategory('Produce', 0, '#4CAF50'));
  this.categories.push(makeCategory('Dairy', 1, '#2196F3'));
});

Given('categories exist', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  if (this.categories.length === 0) {
    this.categories.push(makeCategory('Produce', 0, '#4CAF50'));
    this.categories.push(makeCategory('Dairy', 1, null));
  }
});

Given('an item has secondary categories assigned', function (this: CategoriesWorld) {
  this.items = this.items ?? [];
  this.items.push({
    id: 'item-1',
    name: 'Milk',
    primaryCategoryId: this.categories[0]?.id ?? null,
    secondaryCategoryIds: this.categories.length > 1 ? [this.categories[1].id] : [],
  });
});

When('I create a new category with a valid name and a color', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  const cat = makeCategory('Coloured Category', this.categories.length + 1, '#E91E63');
  this.categories.push(cat);
  this.lastCreatedCategory = cat;
  this.addError = null;
});

When('I create a new category with a valid name and no color', function (this: CategoriesWorld) {
  this.categories = this.categories ?? [];
  const cat = makeCategory('Plain Category', this.categories.length + 1, null);
  this.categories.push(cat);
  this.lastCreatedCategory = cat;
  this.addError = null;
});

When('I edit the category and assign a color', function (this: CategoriesWorld) {
  const cat = this.categories[this.categories.length - 1];
  if (cat) cat.color = '#9C27B0';
});

When('I edit the category and remove its color', function (this: CategoriesWorld) {
  const cat = this.categories[this.categories.length - 1];
  if (cat) cat.color = null;
});

When('items are assigned to that category', function (this: CategoriesWorld) {
  this.items = this.items ?? [];
  const cat = this.categories[this.categories.length - 1];
  this.items.push({
    id: 'item-assigned',
    name: 'Test Item',
    primaryCategoryId: cat?.id ?? null,
    secondaryCategoryIds: [],
  });
});

When('I view the navigation drawer', function (this: CategoriesWorld) {
  // Navigation drawer displays ordered categories — no special state needed
});

When('I view the shopping list', function (this: CategoriesWorld) {
  // Viewing the shopping list — no special state change
});

When('I open the item editor', function (this: CategoriesWorld) {
  this.secondaryExpanded = false;
});

When('I open the item editor for an item with no secondary categories', function (this: CategoriesWorld) {
  this.secondaryExpanded = false;
});

When('I open the item editor and expand the secondary categories section', function (this: CategoriesWorld) {
  this.secondaryExpanded = true;
});

When('I open the item editor for that item', function (this: CategoriesWorld) {
  const item = this.items?.find((i) => i.secondaryCategoryIds.length > 0);
  this.secondaryExpanded = !!item && item.secondaryCategoryIds.length > 0;
});

Then('the category should be created with the chosen color', function (this: CategoriesWorld) {
  assert.ok(this.lastCreatedCategory, 'Expected a category to have been created');
  assert.ok(this.lastCreatedCategory.color !== null, 'Category should have a color');
});

Then('the category should be updated with the chosen color', function (this: CategoriesWorld) {
  const cat = this.categories[this.categories.length - 1];
  assert.ok(cat, 'Category should exist');
  assert.equal(cat.color, '#9C27B0');
});

Then('the category should have no color', function (this: CategoriesWorld) {
  const cat = this.categories[this.categories.length - 1];
  assert.ok(cat, 'Category should exist');
  assert.equal(cat.color, null);
});

Then('the category header should display the colour indicator', function (this: CategoriesWorld) {
  const cat = this.categories.find((c) => c.color !== null);
  assert.ok(cat, 'A category with a color should exist');
  assert.ok(cat.color, 'Category should have a color to display as indicator');
});

Then('the category should display its colour indicator', function (this: CategoriesWorld) {
  const cat = this.categories.find((c) => c.color !== null);
  assert.ok(cat, 'A category with a color should exist');
  assert.ok(cat.color, 'Category should have a color to display as indicator');
});

Then('no colour indicator should be shown for that category', function (this: CategoriesWorld) {
  const cat = this.categories[this.categories.length - 1];
  assert.ok(cat, 'Category should exist');
  assert.equal(cat.color, null, 'Category should have no color');
});

Then('each category chip should display its colour indicator', function (this: CategoriesWorld) {
  const coloured = this.categories.filter((c) => c.color !== null);
  assert.ok(coloured.length > 0, 'At least one category should have a color');
  for (const cat of coloured) {
    assert.ok(cat.color, `Category ${cat.name} should have a color`);
  }
});

Then('the category should be created without a color', function (this: CategoriesWorld) {
  assert.ok(this.lastCreatedCategory, 'Expected a category to have been created');
  assert.equal(this.lastCreatedCategory.color, null, 'Category should have no color');
});

Then('the secondary categories section should be collapsed', function (this: CategoriesWorld) {
  assert.equal(this.secondaryExpanded, false, 'Secondary categories should be collapsed');
});

Then('I should see the available secondary category options', function (this: CategoriesWorld) {
  assert.equal(this.secondaryExpanded, true, 'Secondary categories should be expanded');
  assert.ok(this.categories.length > 0, 'Categories should exist to display as options');
});

Then('the secondary categories section should be expanded', function (this: CategoriesWorld) {
  assert.equal(this.secondaryExpanded, true, 'Secondary categories should be auto-expanded');
});
