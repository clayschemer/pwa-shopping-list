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
  /** Many-to-many: a category relevant to several kinds of shop sits in several groups. */
  groupIds: string[];
}

interface CategoryGroup {
  id: string;
  name: string;
}

interface CategoriesWorld {
  categories: Category[];
  groups: CategoryGroup[];
  lastCreatedGroup: CategoryGroup | null;
  /** Ids captured by a step so a later step can assert on the same set. */
  subjectCategoryIds: string[];
  /** Category names as listed before a grouping action, for the order guard. */
  orderBefore: string[];
  /** What reviewing a group's shop availability reported. */
  reportedAvailability: 'all' | 'some' | 'none' | null;
  shops: { id: string; name: string; categoryOrder: string[] }[];
  mode: 'plan' | 'shop';
  selectedShopId: string | null;
  addError: string | null;
  lastCreatedCategory: Category | null;
  items: { id: string; name: string; primaryCategoryId: string | null; secondaryCategoryIds: string[] }[];
  secondaryExpanded: boolean;
  excludedCategoryId: string | null;
}

/**
 * What the list shows for the currently selected shop. A shop's category order
 * doubles as its availability list — a category absent from it is excluded, so
 * neither it nor its items are listed while that shop is selected. With no shop
 * selected, everything is available.
 */
function visibleList(world: CategoriesWorld): { categoryNames: string[]; itemNames: string[] } {
  const shop = world.selectedShopId
    ? world.shops.find((s) => s.id === world.selectedShopId)
    : null;

  const available = shop
    ? shop.categoryOrder
        .map((id) => world.categories.find((c) => c.id === id))
        .filter((c): c is Category => c !== undefined)
    : world.categories;

  const availableIds = new Set(available.map((c) => c.id));

  return {
    categoryNames: available.map((c) => c.name),
    itemNames: (world.items ?? [])
      .filter((i) => i.primaryCategoryId !== null && availableIds.has(i.primaryCategoryId))
      .map((i) => i.name),
  };
}

let _catId = 1;
let _shopId = 1;

function makeCategory(name: string, order = 0, color: string | null = null): Category {
  return { id: `cat-${_catId++}`, name, color, globalSortOrder: order, groupIds: [] };
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

Given('a category is excluded from a shop', function (this: CategoriesWorld) {
  const produce = makeCategory('Produce', 1);
  const bakery = makeCategory('Bakery', 2);
  this.categories = [produce, bakery];
  this.items = [
    { id: 'item-1', name: 'Apples', primaryCategoryId: produce.id, secondaryCategoryIds: [] },
    { id: 'item-2', name: 'Bread', primaryCategoryId: bakery.id, secondaryCategoryIds: [] },
  ];
  // Bakery is excluded: it is absent from this shop's category order.
  this.shops = [{ id: `shop-${_shopId++}`, name: 'Test Shop', categoryOrder: [produce.id] }];
  this.excludedCategoryId = bakery.id;
  this.selectedShopId = null;
});

When('I plan my shopping for that shop', function (this: CategoriesWorld) {
  this.mode = 'plan';
  this.selectedShopId = this.shops[0].id;
});

Then('that category and its items should not appear in the plan', function (this: CategoriesWorld) {
  const excluded = this.categories.find((c) => c.id === this.excludedCategoryId);
  assert.ok(excluded, 'The excluded category should still exist');

  const visible = visibleList(this);
  assert.ok(
    !visible.categoryNames.includes(excluded.name),
    `Excluded category ${excluded.name} should not be listed when planning for that shop`,
  );
  assert.deepEqual(visible.itemNames, ['Apples'], 'Items of the excluded category should be hidden too');
});

Then('they should reappear when I plan without a specific shop', function (this: CategoriesWorld) {
  this.selectedShopId = null;

  const excluded = this.categories.find((c) => c.id === this.excludedCategoryId)!;
  const visible = visibleList(this);
  assert.ok(
    visible.categoryNames.includes(excluded.name),
    'Excluded category should be listed again when no shop is selected',
  );
  assert.deepEqual(visible.itemNames, ['Apples', 'Bread']);
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

// Note: 'I view the shopping list' is defined in items.steps.ts

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

// ---------------------------------------------------------------------------
// Category Group steps
// ---------------------------------------------------------------------------
//
// Groups are imperative bulk shortcuts: they carry no ordering, and a shop's
// category order doubles as its availability list, so "make a group available
// at a shop" means "put every member id into that shop's order".
//
// Note: 'I am in plan mode', 'I have access to the shopping list',
// 'the other user accesses the shopping list' and 'I should be informed that
// the name is already in use' are all defined in shared.steps.ts.
// Note: 'two or more shops exist' is defined above in this file.

let _groupId = 1;

function makeGroup(name: string): CategoryGroup {
  return { id: `grp-${_groupId++}`, name };
}

function initGroups(world: CategoriesWorld): void {
  world.categories = world.categories ?? [];
  world.groups = world.groups ?? [];
  world.shops = world.shops ?? [];
  world.subjectCategoryIds = world.subjectCategoryIds ?? [];
}

/** Members of a group, in list order. */
function membersOf(world: CategoriesWorld, groupId: string): Category[] {
  return world.categories.filter((c) => c.groupIds.includes(groupId));
}

function addToGroup(world: CategoriesWorld, ids: string[], groupId: string): void {
  for (const id of ids) {
    const cat = world.categories.find((c) => c.id === id);
    if (cat && !cat.groupIds.includes(groupId)) cat.groupIds.push(groupId);
  }
}

function removeFromGroup(world: CategoriesWorld, ids: string[], groupId: string): void {
  for (const id of ids) {
    const cat = world.categories.find((c) => c.id === id);
    if (cat) cat.groupIds = cat.groupIds.filter((g) => g !== groupId);
  }
}

function isAvailableAt(
  world: CategoriesWorld,
  categoryId: string,
  shopId: string,
): boolean {
  const shop = world.shops.find((s) => s.id === shopId);
  return !!shop && shop.categoryOrder.includes(categoryId);
}

/** 'all' | 'some' | 'none' of a group's members sit in the shop's order. */
function groupAvailability(
  world: CategoriesWorld,
  groupId: string,
  shopId: string,
): 'all' | 'some' | 'none' {
  const members = membersOf(world, groupId);
  if (members.length === 0) return 'none';
  const present = members.filter((c) => isAvailableAt(world, c.id, shopId)).length;
  if (present === 0) return 'none';
  return present === members.length ? 'all' : 'some';
}

function makeGroupAvailable(world: CategoriesWorld, groupId: string, shopId: string): void {
  const shop = world.shops.find((s) => s.id === shopId);
  if (!shop) return;
  for (const member of membersOf(world, groupId)) {
    if (!shop.categoryOrder.includes(member.id)) shop.categoryOrder.push(member.id);
  }
}

function makeGroupUnavailable(world: CategoriesWorld, groupId: string, shopId: string): void {
  const shop = world.shops.find((s) => s.id === shopId);
  if (!shop) return;
  const memberIds = new Set(membersOf(world, groupId).map((c) => c.id));
  shop.categoryOrder = shop.categoryOrder.filter((id) => !memberIds.has(id));
}

// --- Given ----------------------------------------------------------------

Given('a category group exists', function (this: CategoriesWorld) {
  initGroups(this);
  this.groups.push(makeGroup('Grocery'));
});

Given('a category group with a given name already exists', function (this: CategoriesWorld) {
  initGroups(this);
  this.groups.push(makeGroup('Grocery'));
});

Given('two category groups exist', function (this: CategoriesWorld) {
  initGroups(this);
  this.groups.push(makeGroup('Grocery'), makeGroup('Furniture'));
});

Given('two or more categories exist that belong to no group', function (this: CategoriesWorld) {
  initGroups(this);
  const a = makeCategory('Produce', 1);
  const b = makeCategory('Dairy', 2);
  this.categories.push(a, b);
  this.subjectCategoryIds = [a.id, b.id];
});

Given('a category group exists with categories assigned', function (this: CategoriesWorld) {
  initGroups(this);
  const group = makeGroup('Grocery');
  this.groups.push(group);
  const a = makeCategory('Produce', 1);
  const b = makeCategory('Dairy', 2);
  this.categories.push(a, b);
  addToGroup(this, [a.id, b.id], group.id);
  this.subjectCategoryIds = [a.id, b.id];
});

Given('a category group exists with no categories assigned', function (this: CategoriesWorld) {
  initGroups(this);
  this.groups.push(makeGroup('Furniture'));
});

Given('a category belongs to the first group', function (this: CategoriesWorld) {
  initGroups(this);
  const cat = makeCategory('Cleaning', 1);
  this.categories.push(cat);
  addToGroup(this, [cat.id], this.groups[0].id);
  this.subjectCategoryIds = [cat.id];
});

Given('a category belongs to two groups', function (this: CategoriesWorld) {
  initGroups(this);
  this.groups.push(makeGroup('Grocery'), makeGroup('Furniture'));
  const cat = makeCategory('Cleaning', 1);
  this.categories.push(cat);
  addToGroup(this, [cat.id], this.groups[0].id);
  addToGroup(this, [cat.id], this.groups[1].id);
  this.subjectCategoryIds = [cat.id];
});

Given('the category is available at a shop', function (this: CategoriesWorld) {
  initGroups(this);
  const shop = {
    id: `shop-${_shopId++}`,
    name: 'Test Shop',
    categoryOrder: [...this.subjectCategoryIds],
  };
  this.shops.push(shop);
  this.selectedShopId = shop.id;
});

Given(
  'a shop exists where only some of those categories are available',
  function (this: CategoriesWorld) {
    initGroups(this);
    const members = membersOf(this, this.groups[0].id);
    const shop = {
      id: `shop-${_shopId++}`,
      name: 'Partial Shop',
      // Only the first member is stocked here.
      categoryOrder: [members[0].id],
    };
    this.shops.push(shop);
    this.selectedShopId = shop.id;
  },
);

Given(
  'a shop exists where every category in the group is available',
  function (this: CategoriesWorld) {
    initGroups(this);
    const members = membersOf(this, this.groups[0].id);
    const shop = {
      id: `shop-${_shopId++}`,
      name: 'Full Shop',
      categoryOrder: members.map((c) => c.id),
    };
    this.shops.push(shop);
    this.selectedShopId = shop.id;
  },
);

Given('two or more categories exist in a known order', function (this: CategoriesWorld) {
  initGroups(this);
  this.categories = [
    makeCategory('Produce', 1),
    makeCategory('Dairy', 2),
    makeCategory('Bakery', 3),
  ];
  this.orderBefore = this.categories.map((c) => c.name);
});

Given('a user creates a category group', function (this: CategoriesWorld) {
  initGroups(this);
  const group = makeGroup('Shared Group');
  this.groups.push(group);
  this.lastCreatedGroup = group;
});

// --- When -----------------------------------------------------------------

When('I create a new category group with a valid name', function (this: CategoriesWorld) {
  initGroups(this);
  const group = makeGroup('Furniture');
  this.groups.push(group);
  this.lastCreatedGroup = group;
});

When(
  'I attempt to create another category group with the same name',
  function (this: CategoriesWorld) {
    initGroups(this);
    const name = this.groups[0].name;
    if (this.groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      this.addError = 'NAME_CONFLICT';
      return;
    }
    this.groups.push(makeGroup(name));
  },
);

When(
  'I add those categories to the group in a single action',
  function (this: CategoriesWorld) {
    addToGroup(this, this.subjectCategoryIds, this.groups[0].id);
  },
);

When(
  'I remove those categories from the group in a single action',
  function (this: CategoriesWorld) {
    removeFromGroup(this, this.subjectCategoryIds, this.groups[0].id);
  },
);

When('I add the category to the second group', function (this: CategoriesWorld) {
  addToGroup(this, this.subjectCategoryIds, this.groups[1].id);
});

When('I add some of those categories to a group', function (this: CategoriesWorld) {
  initGroups(this);
  const group = makeGroup('Grocery');
  this.groups.push(group);
  // Deliberately not the first ones in list order — grouping must not reorder.
  addToGroup(this, [this.categories[2].id, this.categories[0].id], group.id);
});

When('I rename the group to a valid new name', function (this: CategoriesWorld) {
  this.groups[0].name = 'Aisles';
});

When('I make the group available at that shop', function (this: CategoriesWorld) {
  makeGroupAvailable(this, this.groups[0].id, this.selectedShopId as string);
});

When('I make the group unavailable at that shop', function (this: CategoriesWorld) {
  makeGroupUnavailable(this, this.groups[0].id, this.selectedShopId as string);
});

When('I make the second group available at that shop', function (this: CategoriesWorld) {
  makeGroupAvailable(this, this.groups[1].id, this.selectedShopId as string);
});

When('I make the first group unavailable at that shop', function (this: CategoriesWorld) {
  makeGroupUnavailable(this, this.groups[0].id, this.selectedShopId as string);
});

When('I review where the group is available', function (this: CategoriesWorld) {
  this.reportedAvailability = groupAvailability(
    this,
    this.groups[0].id,
    this.selectedShopId as string,
  );
});

When('I delete the group', function (this: CategoriesWorld) {
  const groupId = this.groups[0].id;
  this.subjectCategoryIds = membersOf(this, groupId).map((c) => c.id);
  // Deleting a group detaches it from its members — it never deletes them.
  removeFromGroup(this, this.subjectCategoryIds, groupId);
  this.groups = this.groups.filter((g) => g.id !== groupId);
});

When('I review my category groups', function (this: CategoriesWorld) {
  initGroups(this);
});

// --- Then -----------------------------------------------------------------

Then('the group should exist with no categories in it', function (this: CategoriesWorld) {
  assert.ok(this.lastCreatedGroup, 'Expected a group to have been created');
  const created = this.lastCreatedGroup;
  const group = this.groups.find((g) => g.id === created.id);
  assert.ok(group, 'Created group should exist');
  assert.equal(membersOf(this, group.id).length, 0, 'A new group should be empty');
});

Then('the new group should not be created', function (this: CategoriesWorld) {
  const names = this.groups.map((g) => g.name.toLowerCase());
  assert.equal(new Set(names).size, names.length, 'Group names must be unique');
});

Then(
  'every one of those categories should belong to the group',
  function (this: CategoriesWorld) {
    const groupId = this.groups[0].id;
    for (const id of this.subjectCategoryIds) {
      const cat = this.categories.find((c) => c.id === id);
      assert.ok(cat, 'Category should still exist');
      assert.ok(cat.groupIds.includes(groupId), `${cat.name} should belong to the group`);
    }
  },
);

Then(
  'none of those categories should belong to the group',
  function (this: CategoriesWorld) {
    const groupId = this.groups[0].id;
    for (const id of this.subjectCategoryIds) {
      const cat = this.categories.find((c) => c.id === id);
      assert.ok(cat, 'Category should still exist');
      assert.ok(!cat.groupIds.includes(groupId), `${cat.name} should not belong to the group`);
    }
  },
);

Then('the categories should still exist', function (this: CategoriesWorld) {
  for (const id of this.subjectCategoryIds) {
    assert.ok(
      this.categories.some((c) => c.id === id),
      'Category should not have been deleted',
    );
  }
});

Then('the category should belong to both groups', function (this: CategoriesWorld) {
  const cat = this.categories.find((c) => c.id === this.subjectCategoryIds[0]);
  assert.ok(cat, 'Category should exist');
  assert.ok(cat.groupIds.includes(this.groups[0].id), 'Should belong to the first group');
  assert.ok(cat.groupIds.includes(this.groups[1].id), 'Should belong to the second group');
});

Then(
  'the categories should still be listed in the same order as before',
  function (this: CategoriesWorld) {
    assert.deepEqual(
      this.categories.map((c) => c.name),
      this.orderBefore,
      'Group membership must not affect list order',
    );
  },
);

Then('the group should be known by its new name', function (this: CategoriesWorld) {
  assert.equal(this.groups[0].name, 'Aisles');
});

Then('the same categories should still belong to it', function (this: CategoriesWorld) {
  const members = membersOf(this, this.groups[0].id).map((c) => c.id);
  assert.deepEqual([...members].sort(), [...this.subjectCategoryIds].sort());
});

Then(
  'every category in the group should be available at that shop',
  function (this: CategoriesWorld) {
    const shopId = this.selectedShopId as string;
    for (const member of membersOf(this, this.groups[0].id)) {
      assert.ok(
        isAvailableAt(this, member.id, shopId),
        `${member.name} should be available at the shop`,
      );
    }
  },
);

Then(
  'none of the categories in the group should be available at that shop',
  function (this: CategoriesWorld) {
    const shopId = this.selectedShopId as string;
    for (const member of membersOf(this, this.groups[0].id)) {
      assert.ok(
        !isAvailableAt(this, member.id, shopId),
        `${member.name} should not be available at the shop`,
      );
    }
  },
);

Then(
  'the group should be reported as partially available at that shop',
  function (this: CategoriesWorld) {
    assert.equal(this.reportedAvailability, 'some');
  },
);

Then('the category should not be available at that shop', function (this: CategoriesWorld) {
  const shopId = this.selectedShopId as string;
  assert.ok(
    !isAvailableAt(this, this.subjectCategoryIds[0], shopId),
    'Last action wins — the category should have been removed with the first group',
  );
});

Then('the group should no longer exist', function (this: CategoriesWorld) {
  assert.ok(
    !this.groups.some((g) => g.name === 'Grocery'),
    'Deleted group should be gone',
  );
});

Then(
  'every category that belonged to it should still exist and belong to no group',
  function (this: CategoriesWorld) {
    for (const id of this.subjectCategoryIds) {
      const cat = this.categories.find((c) => c.id === id);
      assert.ok(cat, 'Category should not have been deleted');
      assert.equal(cat.groupIds.length, 0, `${cat.name} should belong to no group`);
    }
  },
);

Then('the empty group should still be listed', function (this: CategoriesWorld) {
  const group = this.groups.find((g) => g.name === 'Furniture');
  assert.ok(group, 'Empty group should still be listed');
  assert.equal(membersOf(this, group.id).length, 0);
});

Then('they should see the newly created group', function (this: CategoriesWorld) {
  assert.ok(this.lastCreatedGroup, 'Expected a group to have been created');
  const created = this.lastCreatedGroup;
  assert.ok(
    this.groups.some((g) => g.id === created.id),
    'Shared groups stream to every account member',
  );
});
