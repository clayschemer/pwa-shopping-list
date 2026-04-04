# PLANNING.md — Shared Shopping List PWA

A living planning document. Update as decisions are made.

---

## Vision

A private shared shopping list PWA for two users. Mobile-first, accessibility-first, spec-driven, and built to allow a seamless backend swap as the project matures.

---

## Architecture

### Frontend
- Angular 21 SPA (no SSR), compiled as a PWA
- NgRx for state management
- Angular Material 3 for UI
- Offline support: nice-to-have

### Backend Abstraction
The Angular app communicates exclusively through an API service layer. No component, effect, or store touches the backend directly. This makes a backend swap (Firebase → Java + PostgreSQL) a single-layer change.

Current backend contract:
- `GET /items` — fetch list
- `POST /items` — add item
- `PATCH /items/:id` — update item
- `DELETE /items/:id` — remove item
- `GET /items/stream` — realtime updates (SSE or Firestore onSnapshot)

### Current Backend
- Firebase (Firestore, Firebase Auth, Firebase Hosting)
- Google OAuth via Firebase Auth
- Realtime: Firestore `onSnapshot` acting as SSE equivalent

### Future Backend (abstracted)
- Java + PostgreSQL with true SSE endpoint
- No client changes required on swap

---

## Testing Strategy

| Layer | Tool | Format |
|---|---|---|
| Acceptance tests | Cucumber.js | Gherkin `.feature` files |
| Unit & component tests | Vitest | `.spec.ts` files |
| E2E (future) | Playwright | TBD |

Gherkin style follows David Farley — scenarios describe observable system behaviour only. No UI assumptions, no implementation detail, no mention of buttons, taps, or gestures.

---

## Data Model

```
User
  - id, email, displayName

Shop
  - id, name
  - categoryOrder: CategoryId[]    ← ordered list of categories for this shop

Category
  - id, name
  - globalSortOrder: number        ← fallback order when no shop is selected

Item
  - id, name
  - quantity, unit
  - primaryCategoryId: CategoryId | null
  - secondaryCategoryIds: CategoryId[]
  - checked: boolean
  - checkedBy: UserId | null

Session
  - id
  - shopId: ShopId | null
  - startedBy: UserId
  - joinedBy: UserId | null
  - startedAt: timestamp
  - completedAt: timestamp | null
```

---

## Feature Scenarios

### Feature: Authentication

```gherkin
Feature: Authentication
  As a permitted user of the shopping app
  I want to authenticate with my identity provider
  So that I can securely access my shared shopping list

  Background:
    Given the application is available

  Scenario: Permitted user gains access
    Given I am not authenticated
    When I authenticate successfully with a permitted account
    Then I should have access to the shopping list

  Scenario: Non-permitted user is denied access
    Given I am not authenticated
    When I authenticate successfully with a non-permitted account
    Then I should be denied access to the application
    And I should be informed that I do not have permission

  Scenario: Authenticated session is restored
    Given I have previously authenticated
    When I return to the application on the same device with an intact session
    Then I should have access to the shopping list without re-authenticating

  Scenario: User ends their session
    Given I am authenticated
    When I end my session
    Then I should no longer have access to the shopping list
    And I should be required to authenticate again to regain access

  Scenario: Session is not carried across contexts
    Given I am authenticated on one device
    When I access the application from a different device or a fresh session
    Then I should be required to authenticate again
```

---

### Feature: Application Modes

```gherkin
Feature: Application Modes
  As an authenticated user
  I want to switch between planning and shopping modes
  So that I have the right level of interaction for my current activity

  Background:
    Given I am authenticated and have access to the shopping list

  Scenario: Application starts in plan mode
    When I access the application for the first time
    Then I should be in plan mode

  Scenario: User switches to shop mode
    Given I am in plan mode
    When I switch to shop mode
    Then I should be in shop mode
    And I should have access to a reduced set of interactions

  Scenario: User switches back to plan mode
    Given I am in shop mode
    When I switch to plan mode
    Then I should be in plan mode
    And I should have access to the full set of interactions

  Scenario: Each user's mode is independent
    Given one user is in plan mode
    When the other user switches to shop mode
    Then the first user should remain in plan mode
    And the second user should be in shop mode

  Scenario: Mode is not persisted across sessions
    Given I am in shop mode
    When I start a new session
    Then I should be returned to plan mode
```

---

### Feature: Settings

```gherkin
Feature: Settings
  As an authenticated user
  I want to configure the application to my preferences
  So that the app suits my environment and accessibility needs

  Background:
    Given I am authenticated and have access to the application

  Scenario: Settings default to device preferences
    Given my device has a preference configured for an accessibility or display setting
    When I open the application for the first time
    Then the application should reflect my device preference for that setting
    And I should not need to configure it manually

  Scenario: User overrides a device default
    Given the application is using a device default for a setting
    When I change that setting in the application
    Then the application should use my chosen value instead of the device default

  Scenario: User restores a setting to device default
    Given I have overridden a setting
    When I reset that setting to default
    Then the application should once again reflect my device preference

  Scenario: Settings are persisted across sessions
    Given I have configured one or more settings
    When I start a new session on the same device with an intact session
    Then my settings should be restored as I left them

  Scenario: Settings are not shared between users
    Given one user has configured their settings
    When the other user opens the application
    Then they should see their own settings and device defaults
    And not the other user's configuration

  Scenario: Settings are not carried across devices
    Given I have configured settings on one device
    When I access the application from a different device
    Then the application should reflect that device's own defaults
    And not my settings from another device
```

---

### Feature: Category Management

```gherkin
Feature: Category Management
  As an authenticated user in plan mode
  I want to manage categories
  So that I can organise my shopping list in a meaningful way

  Scenario: Create a category
    Given I am in plan mode
    And I have access to the shopping list
    When I create a new category with a valid name
    Then the category should appear in my shopping list

  Scenario: Category names must be unique
    Given I am in plan mode
    And a category with a given name already exists
    When I attempt to create another category with the same name
    Then the new category should not be created
    And I should be informed that the name is already in use

  Scenario: Rename a category
    Given I am in plan mode
    And a category exists
    When I rename the category to a valid new name
    Then the category should be reflected with the new name throughout the application

  Scenario: Delete a category
    Given I am in plan mode
    And a category exists with no items assigned to it
    When I delete the category
    Then the category should no longer exist in the application

  Scenario: Delete a category that contains items
    Given I am in plan mode
    And a category exists with one or more items assigned to it
    When I delete the category
    Then the category should no longer exist in the application
    And the items that belonged to it should remain in the list as uncategorised

  Scenario: Categories are shared between users
    Given a user creates a category
    When the other user accesses the shopping list
    Then they should see the newly created category

  Scenario: Reorder categories
    Given I am in plan mode
    And two or more categories exist
    When I change the order of the categories
    Then the categories should be displayed in my chosen order

  Scenario: Set the global category order
    Given I am in plan mode
    And two or more categories exist
    When I set the global category order
    Then the categories should be displayed in that order whenever no shop-specific order applies

  Scenario: Category order can differ per shop
    Given I am in plan mode
    And two or more categories exist
    And two or more shops exist
    When I set a different category order for each shop
    Then each shop should reflect its own category order

  Scenario: Category order follows the selected shop in shop mode
    Given one or more shops exist with their own category order configured
    When I switch to shop mode and select a shop
    Then the categories should be displayed in the order configured for that shop

  Scenario: Category order falls back to global order when no shop is selected
    Given I am in plan mode
    And no shop-specific category order has been configured
    When I view the shopping list
    Then the categories should be displayed in the global default order
```

---

### Feature: Shop Management

```gherkin
Feature: Shop Management
  As an authenticated user in plan mode
  I want to manage shops
  So that I can organise my shopping list according to where I intend to shop

  Scenario: Create a shop
    Given I am in plan mode
    When I create a new shop with a valid name
    Then the shop should be available in the application

  Scenario: Shop names must be unique
    Given I am in plan mode
    And a shop with a given name already exists
    When I attempt to create another shop with the same name
    Then the new shop should not be created
    And I should be informed that the name is already in use

  Scenario: Rename a shop
    Given I am in plan mode
    And a shop exists
    When I rename the shop to a valid new name
    Then the shop should be reflected with the new name throughout the application

  Scenario: Delete a shop
    Given I am in plan mode
    And a shop exists
    When I delete the shop
    Then the shop should no longer exist in the application
    And any category order configured for that shop should be removed
    And all items and categories should remain unaffected

  Scenario: Shops are shared between users
    Given a user creates a shop
    When the other user accesses the application
    Then they should see the newly created shop

  Scenario: Select a shop when entering shop mode
    Given one or more shops exist
    When I switch to shop mode
    Then I should be prompted to select which shop I am shopping in
    Or I should be able to proceed without selecting a shop

  Scenario: Shopping without a selected shop uses global category order
    Given I am in shop mode
    And I have not selected a shop
    When I view the shopping list
    Then the categories should be displayed in the configured global category order

  Scenario: Change shop during a shopping session
    Given I am in shop mode
    And I have selected a shop
    When I select a different shop
    Then the category order should update to reflect the newly selected shop
```

---

### Feature: Item Management

```gherkin
Feature: Item Management
  As an authenticated user in plan mode
  I want to manage items on the shopping list
  So that I can keep track of what needs to be bought

  Scenario: Add an item to the list
    Given I am in plan mode
    When I add a new item with a valid name
    Then the item should appear on the shopping list

  Scenario: Item names must be unique
    Given I am in plan mode
    And an item with a given name already exists on the list
    When I attempt to add another item with the same name
    Then the new item should not be added
    And I should be informed that the item is already on the list

  Scenario: Add a quantity to an item
    Given I am in plan mode
    And an item exists on the list
    When I set a quantity and unit for the item
    Then the item should reflect the specified quantity and unit on the list

  Scenario: Assign categories to an item
    Given I am in plan mode
    And an item exists on the list
    And one or more categories exist
    When I assign a primary category and optionally one or more secondary categories to the item
    Then the item should be displayed under its primary category in plan mode
    And the secondary category assignments should be preserved for shop mode

  Scenario: An item appears under all assigned categories in shop mode
    Given I am in shop mode
    And an item exists with a primary category and one or more secondary categories
    When I view the shopping list
    Then the item should appear under each of its assigned categories

  Scenario: Checking an item in one category marks it as checked across all categories
    Given I am in shop mode
    And an item appears under more than one category
    When I check the item under any one of its categories
    Then the item should appear as checked under all of its categories

  Scenario: Remove an item from the list
    Given I am in plan mode
    And an item exists on the list
    When I remove the item
    Then the item should no longer appear on the shopping list

  Scenario: Items are shared between users in real time
    Given one user adds an item to the shopping list
    When the other user accesses the shopping list
    Then they should see the newly added item without any manual intervention

  Scenario: Edit an item
    Given I am in plan mode
    And an item exists on the list
    When I edit the item's details
    Then the item should reflect the updated details on the list

  Scenario: Check an item in shop mode
    Given I am in shop mode
    And an item exists on the list that has not been checked
    When I check the item
    Then the item should be marked as checked on the list for both users

  Scenario: Uncheck an item in shop mode
    Given I am in shop mode
    And an item exists on the list that has been checked
    When I uncheck the item
    Then the item should be marked as unchecked on the list for both users

  Scenario: Checked items are removed from the list in plan mode
    Given one or more items were checked during a shopping session
    When I access the list in plan mode
    Then the checked items should no longer appear on the list

  Scenario: Unchecked items persist when switching between modes
    Given one or more unchecked items exist on the list
    When I switch between plan mode and shop mode
    Then all unchecked items should remain on the list in both modes

  Scenario: Item order reflects category order in shop mode
    Given I am in shop mode
    And a shop has been selected
    And items exist across multiple categories
    When I view the shopping list
    Then the items should be grouped and ordered according to the selected shop's category order

  Scenario: Uncategorised items are displayed separately
    Given one or more items exist with no category assigned
    When I view the shopping list in either mode
    Then the uncategorised items should be displayed as a distinct group

  Scenario: Items are sorted alphabetically within a category
    Given two or more items exist within the same category
    When I view the shopping list
    Then the items should be displayed in alphabetical order within their category
```

---

## Open Design Decisions

| # | Topic | Options | Status |
|---|---|---|---|
| 1 | Permitted user definition | Allowlist (email/uid) vs Firestore approved users collection | Allowlist for now |
| 2 | Uncategorised items label | Show "Uncategorised" label vs no label at bottom of list | TBD in design phase |
| 3 | Checked item visibility in shop mode | Remove from active list (preferred) vs keep with distinct visual treatment | Preferred: remove. Revisit in design. |
| 4 | Session model | Explicit session with start/join/close | Planned scope — not yet specced |
| 5 | Shop binding on items | Items are not tied to shops — confirmed | Confirmed |

---

## Design Notes

- **Checked item UX**: When an item is checked in shop mode, it should remain visible briefly with a distinct visual state and an undo action before being removed. Duration and visual treatment TBD in design phase.
- **Mode difference**: Plan and shop mode share the same underlying list and data. The difference is purely visual, with the addition of shopping session history tracked only in shop mode.
- **Categories as tags**: Categories are not containers. They appear in the list only when at least one item is assigned to them.
- **Uncategorised items**: Appear as a distinct group at the bottom of the list. Label TBD.

---

## Planned Scope (future feature files)

- Shopping sessions (explicit start, join, close; expense tracking per category)
- AI price estimation (indicative market price per item; category and session totals)
- AI frequency tracking (auto-suggest frequently bought items)
- Autocomplete on item add (suggest previous items; pre-fill category, quantity, unit)
- Barcode scanning with AI-assisted item matching
- Signup flow (if app opens to general availability)
