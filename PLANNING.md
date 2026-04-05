# PLANNING.md — Shared Shopping List PWA

A living planning document. Update as decisions are made.

UI/UX design decisions, screen layouts, interaction specifications, and design tokens are captured in `DESIGN.md` and `design-system.scss`.

---

## Vision

A private shared shopping list PWA for two users. Mobile-first, accessibility-first, spec-driven, and built to allow a seamless backend swap as the project matures. May be opened to wider availability in the future — the model and architecture must support that without requiring structural changes.

---

## Architecture

### Project Structure

```
/
├── CLAUDE.md            ← persistent Claude Code context; read at every session start
├── PLANNING.md          ← this file
├── DATA-MODEL.md        ← logical data model (backend-agnostic)
├── API-CONTRACT.md      ← service layer contract (types + operations)
├── DESIGN.md            ← UI/UX spec (all 6 screens signed off)
├── design-system.scss   ← design token specification (colours, typography, spacing, motion)
│
├── frontend/            ← Angular PWA
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── api/             ← API service layer — ONLY place that touches backend
│   │   │   │   │   ├── item-api.service.ts
│   │   │   │   │   ├── category-api.service.ts
│   │   │   │   │   ├── shop-api.service.ts
│   │   │   │   │   ├── session-api.service.ts
│   │   │   │   │   └── account-api.service.ts
│   │   │   │   ├── auth/
│   │   │   │   └── stream/          ← change-stream.service.ts
│   │   │   ├── store/               ← NgRx per-domain (items/, categories/, shops/, sessions/, account/, ui/)
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── plan/
│   │   │   │   ├── shop/
│   │   │   │   ├── settings/
│   │   │   │   └── shared/          ← shared presentational components (no store access)
│   │   │   ├── models/              ← domain types (*.model.ts)
│   │   │   └── app.config.ts
│   │   └── styles/                  ← Angular Material theme (_theme-*.scss)
│   ├── tests/
│   │   └── acceptance/
│   │       ├── features/            ← Gherkin feature files (source of truth for behaviour)
│   │       │   ├── auth/
│   │       │   ├── modes/
│   │       │   ├── settings/
│   │       │   ├── categories/
│   │       │   ├── shops/
│   │       │   ├── items/
│   │       │   ├── sessions/
│   │       │   ├── ai-price-estimation/
│   │       │   ├── ai-list-suggestions/
│   │       │   ├── autocomplete/
│   │       │   └── barcode-scanning/
│   │       └── step-definitions/
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
│
└── backend/             ← backend project root
    ├── BACKEND.md       ← backend spec and decisions
    ├── firebase/        ← Firebase config, Firestore rules + indexes
    └── future/          ← placeholder for Java/Go + PostgreSQL implementation
```

**Key rule:** Nothing outside `frontend/src/app/core/api/` may import from or reference any backend SDK directly.

### Frontend
- Angular 21 SPA (no SSR), compiled as a PWA — upgrade to Angular 22 expected May 2026
- Signal Forms — experimental in Angular 21, expected stable in Angular 22. Use when stable; fall back to Reactive Forms until then.
- NgRx for state management
- Angular Material 3 for UI
- Fonts: DM Serif Display + Plus Jakarta Sans (Google Fonts)
- Offline support: nice-to-have, not a hard requirement

### Backend Abstraction
The Angular app communicates exclusively through the API service layer (`frontend/src/app/core/api/`). No component, effect, or store touches the backend directly. This makes a backend swap a single-layer change. The full service layer contract — types, streams, and operations — is in `API-CONTRACT.md`.

### Current Backend (Firebase)
- Firestore for data persistence
- Firebase Auth for Google OAuth
- Firebase Hosting for deployment
- Realtime: Firestore `onSnapshot` acting as SSE equivalent
- Access control: email/uid allowlist in Firestore (not a general signup flow)

### Future Backend (abstracted)
- Likely Java or Go + PostgreSQL with a true SSE endpoint
- `backend/future/` exists as a placeholder
- No frontend changes required on swap — only the service layer implementation changes

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

The full logical data model with design rationale lives in `DATA-MODEL.md`. The summary below reflects all decisions made to date.

```
Account
  - id, name
  - aiConfig: AiConfig | null

AiConfig
  - provider
  - apiKeyRef
  - priceLookupShopOrder: ShopId[]
  - autoAddEnabled: boolean

User
  - id, accountId, email, displayName

Shop
  - id, accountId, name
  - categoryOrder: CategoryId[]

Category
  - id, accountId, name
  - globalSortOrder: number

Item
  - id, accountId, name
  - quantity, unit
  - primaryCategoryId: CategoryId | null
  - secondaryCategoryIds: CategoryId[]
  - removed: boolean
  - removedAt: timestamp | null
  - addedBy: 'user' | 'ai'
  - aiMotivation: string | null
  - price: number | null
  - priceQuantity: number | null
  - priceUnit: string | null
  - priceUpdatedAt: timestamp | null
  - purchaseCount: number

Session
  - id, accountId
  - shopId: ShopId | null
  - participants: UserId[]
  - startedBy: UserId
  - startedAt: timestamp
  - completedAt: timestamp | null
  - checkedItems: SessionCheckedItem[]

SessionCheckedItem
  - itemId: ItemId
  - checkedBy: UserId
  - checkedAt: timestamp
  - priceSnapshot: number | null
  - priceQuantitySnapshot: number | null
  - priceUnitSnapshot: string | null
```

---

## Key Data Model Decisions

- **Items are never hard deleted.** Once created, an item persists forever. This preserves autocomplete history and purchase frequency data.
- **`Item.removed` is the single source of truth for list visibility.** It is set by two actors: a plan-mode deletion, or a session check. It is cleared by an uncheck. No separate checked/deleted distinction.
- **Checked state is global and first-write-wins.** Concurrent check conflicts are rejected gracefully for the slower user.
- **Session log (`SessionCheckedItem`) is the source of truth for purchase history and session totals.** It snapshots price, quantity, and unit at the time of checking so history remains accurate as prices change.
- **A single price field on Item.** No manual/estimated distinction — last writer wins, whether user or AI. Price staleness is determined by `priceUpdatedAt` alone.
- **Price is anchored to a quantity and unit.** AI handles conversion when quantity or unit changes. Linearity is assumed; sales and bulk discounts are out of scope.
- **AI features are an optional layer.** The app is fully functional without AI. AI activates only when `AiConfig` is set on the account. Users bring their own AI provider — the app does not pay for external AI usage.
- **AI price lookups follow a per-account shop priority order.** The AI checks shops in order and falls back down the list. Exact lookup mechanics are TBD.
- **`purchaseCount` on Item is incremented per completed session** in which the item appears in the session's checked log. Drives autocomplete frequency ranking.
- **Sessions use `participants: UserId[]`** rather than a single `joinedBy` field. The product is currently two-user but the model supports any number of participants.
- **Account is the top-level container.** All shared data belongs to an account. The model supports multiple users per account even though registration/invitation flows are not yet built.
- **Two category totals in shop mode:** category total (all active unchecked items, drops when any session checks an item) and session checked total (this session's running checkout bill, drops on uncheck).

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

  Scenario: Exclude a category from a shop
    Given I am in plan mode
    And a shop exists with one or more categories associated with it
    When I exclude a category from that shop
    Then that category and its items should not appear when shopping at that shop

  Scenario: New categories are automatically added to all shops
    Given one or more shops exist
    When a new category is created
    Then the new category should be automatically associated with all existing shops
    And it should be explicitly excluded from a shop if not relevant to it
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

  Scenario: Selecting a shop starts a session
    Given I am in shop mode
    When I select a shop or choose to shop without a specific shop
    Then a session should be started automatically
    And the session should reflect the selected shop or global scope

  Scenario: Shopping without a selected shop uses global category order
    Given I am in shop mode
    And I have not selected a shop
    When I access the shopping list
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

  Scenario: Concurrent check conflict is handled gracefully
    Given I am in shop mode
    And another user checks an item at the same moment I do
    When my check attempt is rejected because the other user was faster
    Then I should be informed that the item has already been removed
    And the item should no longer appear on my list

  Scenario: Uncheck an item in shop mode
    Given I am in shop mode
    And an item exists on the list that has been checked
    When I uncheck the item
    Then the item should be marked as unchecked on the list for both users
    And the item should reappear on the active list

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

### Feature: Shopping Sessions

```gherkin
Feature: Shopping Sessions
  As an authenticated user in shop mode
  I want to start and manage a shopping session
  So that I can track what I have bought and monitor spending during a shop

  Scenario: Start a shopping session
    Given I am in shop mode
    And there is no active session for me
    When I start a new shopping session
    Then an active session should be associated with me
    And the session should begin tracking my activity

  Scenario: Only one active session per user at a time
    Given I am in shop mode
    And I already have an active session
    When I attempt to start a new session
    Then a new session should not be created
    And I should be informed that I already have an active session

  Scenario: Other user can join an active session
    Given one user has an active shopping session
    When the other user joins that session
    Then both users should be participating in the same session
    And activity from both users should be tracked within that session

  Scenario: Selecting a shop starts a session
    Given I am in shop mode
    When I select a shop or choose to shop without a specific shop
    Then a session should be started automatically
    And the session should reflect the selected shop or global scope

  Scenario: Checking an item is tracked within the session
    Given I have an active shopping session
    And one or more items exist on the list
    When I check an item
    Then the item should be recorded as checked within the current session

  Scenario: Session tracks a running total per category
    Given I have an active shopping session
    And one or more items with prices exist on the list
    When I check an item
    Then the session should update the running total for that item's category
    And the overall session total should also be updated

  Scenario: Unchecking an item updates the session total
    Given I have an active shopping session
    And I have checked one or more items
    When I uncheck an item
    Then the session total should decrease by that item's price
    And the item should reappear on the active list

  Scenario: Two concurrent sessions display independent totals
    Given two users each have their own active session
    And both users are checking items
    When either user views their session total
    Then they should see only the total accumulated within their own session
    And a combined category total reflecting all checked items should also be visible

  Scenario: Either user can explicitly close a session
    Given one or more users have an active shopping session
    When either user closes the session
    Then the session should be marked as complete
    And the session should be recorded in history
    And neither user should have an active session any longer

  Scenario: Inactive session triggers a reminder to close
    Given I have an active shopping session
    When the session has had no activity for thirty minutes
    Then I should be reminded that a session is still active
    And I should be prompted to close it or continue shopping

  Scenario: Session is recorded in history on close
    Given a shopping session has been closed
    When I view my session history
    Then the completed session should be visible
    And it should include the shop, items checked, and total spend for the session

  Scenario: Session history informs frequency tracking
    Given one or more shopping sessions have been completed
    When the system evaluates item frequency
    Then items that appear regularly across sessions should be identified
    And those items should be available as suggestions for future lists
```

---

### Feature: AI Price Estimation

```gherkin
Feature: AI Price Estimation
  As an authenticated user with AI configured
  I want the application to estimate the price of items on my list
  So that I can get an indication of my expected spend before and during shopping

  Scenario: An estimated price is associated with an item
    Given one or more items exist on the shopping list
    When the application retrieves an estimated price for an item
    Then that estimate should be associated with the item on the list

  Scenario: Category total is calculated from item prices
    Given one or more items with prices exist within a category
    When I view the shopping list during an active session
    Then the estimated total for that category should be visible

  Scenario: Session total is calculated from checked items
    Given I have an active shopping session
    And one or more checked items have prices
    When I view my session total
    Then it should reflect the sum of prices for all items checked in my session

  Scenario: Prices are updated periodically
    Given a price is associated with an item
    When sufficient time has passed since the price was last set
    Then the application should refresh the price for that item

  Scenario: Items without a price do not affect totals
    Given one or more items on the list have no price
    When category or session totals are calculated
    Then only items with prices should contribute to the totals

  Scenario: User can manually set a price for an item
    Given an item exists on the shopping list
    When I manually enter a price for the item
    Then the entered price should be used for that item in all totals

  Scenario: AI can suggest an update to a stale price
    Given an item has a price that has not been updated for some time
    When the application determines the price may be outdated
    Then the application should suggest an updated price
    And the existing price should remain in use until the user accepts the suggestion

  Scenario: Price is anchored to a quantity and unit
    Given an item has a price set for a specific quantity and unit
    When the item is added with a different quantity or unit
    Then the application should derive an estimated price for the new quantity and unit

  Scenario: AI features are inactive without configuration
    Given no AI provider has been configured for the account
    When a price lookup would otherwise be triggered
    Then no lookup should occur
    And the item should have no price until one is entered manually
```

---

### Feature: AI List Suggestions

```gherkin
Feature: AI List Suggestions
  As an authenticated user with AI configured
  I want the AI to proactively suggest items for my shopping list
  So that I am reminded of things I may need without having to think of everything myself

  Scenario: AI suggested items are visually distinguishable from user added items
    Given the AI has added one or more items to the shopping list
    When I view the shopping list
    Then AI suggested items should be visually distinct from items I have added myself

  Scenario: User can view the motivation for an AI suggested item
    Given the AI has added an item to the shopping list
    When I request the motivation for that item
    Then I should be presented with the AI's reasoning for suggesting it

  Scenario: User can remove an AI suggested item
    Given the AI has added an item to the shopping list
    When I remove the item
    Then the item should be removed from the list
    And the removal should be treated the same as removing a user added item

  Scenario: AI suggestions respect the shared toggle setting
    Given the AI auto-add setting has been disabled
    When the AI would otherwise suggest an item
    Then no item should be automatically added to the list

  Scenario: Either user can toggle the AI auto-add setting
    Given the AI auto-add setting is enabled
    When either user disables the setting
    Then the AI should stop automatically adding items to the list for both users

  Scenario: AI suggested items are functionally identical to user added items
    Given the AI has added one or more items to the shopping list
    When I interact with those items
    Then they should behave in every respect the same as items I have added myself

  Scenario: AI features are inactive without configuration
    Given no AI provider has been configured for the account
    When suggestions would otherwise be generated
    Then no items should be automatically added to the list
```

---

### Feature: Autocomplete on Item Add

```gherkin
Feature: Autocomplete on Item Add
  As an authenticated user in plan mode
  I want the application to suggest previously added items as I add new ones
  So that I can quickly re-add familiar items with minimal effort

  Scenario: Previously added items are suggested when adding a new item
    Given one or more items have previously been on the shopping list
    When I begin adding a new item
    Then the application should suggest matching previously added items

  Scenario: Selecting a suggestion pre-fills item details
    Given previously added items are being suggested
    When I select a suggestion
    Then the item should be added to the list
    And its previously used category, quantity, and unit should be pre-filled

  Scenario: Pre-filled details are editable before confirming
    Given I have selected a suggestion and details have been pre-filled
    When I modify any of the pre-filled details
    Then the modified values should be used when the item is added to the list

  Scenario: Suggestions are ranked by frequency
    Given multiple previously added items match what I am adding
    When suggestions are displayed
    Then more frequently bought items should appear higher in the suggestions

  Scenario: No suggestion is forced on the user
    Given suggestions are displayed when adding a new item
    When I ignore the suggestions and enter a new item name
    Then the new item should be added as entered
    And no suggestion should be automatically applied
```

---

### Feature: Barcode Scanning

> **Future scope.** Full Gherkin scenarios moved to `FUTURE-FEATURES.md`. No screen in DESIGN.md, no API operations defined. Do not implement until designed.


---

## Open Design Decisions

| # | Topic | Status |
|---|---|---|
| 1 | Permitted user definition | Allowlist for now; may expand to signup flow |
| 2 | Uncategorised items label | Resolved: "Uncategorised", muted style, always last, no context menu |
| 3 | Checked item undo window | Resolved: 4s, client-side only, checking user only |
| 4 | AI analytical scope | Starting with purchase frequency. Basket analysis, co-occurrence, spend trends deferred. |
| 5 | Price staleness threshold | Working assumption 6–12 months. Exact value TBD. |
| 6 | AI price lookup mechanics | Beyond shop priority order — exact mechanics TBD. |
| 7 | AI suggestion motivation refresh | Existing motivation reused on re-suggestion. Update deferred. |
| 8 | Shop → plan mode with active session | Open: modal or bottom sheet prompt? |
| 9 | Price field granularity in edit sheet | Open: flat amount only, or also priceQty + priceUnit sub-fields? |
| 10 | AI provider setup screen | Open: needs own design pass |
| 11 | Shops reorderable in Manage Shops? | Open |
| 12 | Delete category with items | Resolved: show warning dialog (items become uncategorised, not deleted) |

---

## Design Notes

- **Checked item UX**: When an item is checked in shop mode it dims to ~42% opacity with strikethrough and a "tap to undo" label for 4 seconds. Tapping the checkbox again within that window unchecks it. After 4 seconds with no action the item disappears from the list. Undo is client-side only and visible only to the user who performed the check.
- **Mode difference**: Plan and shop mode share the same underlying list and data. The difference is purely visual, with the addition of shopping session history tracked only in shop mode.
- **Categories as tags**: Categories are not containers. They appear in the list only when at least one item is assigned to them.
- **Uncategorised items**: Appear as a distinct group at the bottom of the list, labelled "Uncategorised" in a muted style. No context menu. Always last.
- **AI item origin**: The visual indicator on AI added items exists only to inform. It carries no functional meaning. Once the user interacts with the item in any way it is a fully owned list item.
- **Session auto-start**: Selecting a shop (or global) when entering shop mode starts a session automatically. No separate action required.
- **Items are never hard deleted**: Removed items persist in the database for autocomplete history and purchase frequency tracking.
- **Two totals in shop mode**: The category total reflects all active unchecked items and drops when any session checks an item. The session checked total is the running checkout bill for this session only and drops on uncheck.
- **AI is optional**: All AI features are inactive unless an AI provider is configured on the account. The app is fully functional without AI — prices must be entered manually and suggestions are unavailable.
- **Bring your own AI**: Users connect their own AI provider account. The app does not absorb AI usage costs.

---

## Planned Scope (future feature files)

See `FUTURE-FEATURES.md` for full details and Gherkin scenarios for all of the below.

- Barcode scanning
- Signup / invitation flow (if app opens to general availability)
- Broader AI analytics (basket analysis, spend trends per category, session patterns, price drift, item co-occurrence, time-since-last-purchase signals, items added but never checked)
- AI provider configuration UI
