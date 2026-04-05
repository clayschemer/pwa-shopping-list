# FUTURE-FEATURES.md — Shared Shopping List PWA

Features that are scoped for future implementation. Gherkin scenarios are included here for completeness but **no implementation or step definitions should be generated from this file** until the feature is moved into `PLANNING.md` and a corresponding screen is added to `DESIGN.md`.

---

## Barcode Scanning

No API operations defined yet. No screen in DESIGN.md. Depends on a device camera API integration and a product lookup service (barcode → product name). AI matching logic will need its own API contract extension when this feature is designed.

### Feature: Barcode Scanning

```gherkin
Feature: Barcode Scanning
  As an authenticated user in plan mode
  I want to scan a product barcode to add items to the list
  So that I can quickly identify and add products I have at hand

  Scenario: Scanning a barcode identifies a product
    Given I am in plan mode
    When I scan a product barcode
    Then the application should attempt to identify the product from the barcode

  Scenario: AI matches a scanned product to an existing list item
    Given a product has been identified from a barcode scan
    And one or more items exist on the list that may describe the same product
    When the AI evaluates the scanned product against existing items
    Then the AI should suggest a match if the products are descriptively equivalent
    And the suggestion should disregard brand, packaging size, and other non-descriptive attributes

  Scenario: User confirms or rejects an AI suggested match
    Given the AI has suggested a match between a scanned product and an existing list item
    When the match is presented to me
    Then I should be able to confirm the match and add the item to the list
    Or reject the match and add the scanned product as a new item

  Scenario: Scanning a product with no existing match adds a new item
    Given a product has been identified from a barcode scan
    And no suitable match exists among current list items
    When the scan result is evaluated
    Then the product should be added to the list as a new item

  Scenario: Scanning an unrecognised barcode is handled gracefully
    Given I attempt to scan a product barcode
    When the application cannot identify the product from the barcode
    Then I should be informed that the product could not be identified
    And I should be able to add an item manually instead

  Scenario: A scanned and confirmed item behaves like any other list item
    Given a product has been added to the list via barcode scanning
    When I view the shopping list
    Then the scanned item should behave identically to any manually added item
```

---

## Signup / Invitation Flow

For general availability. Not yet designed. Initial users are hardcoded per account in Firestore.

---

## AI Provider Configuration UI

Settings screen (S4) has a placeholder link. Needs its own design pass.

---

## Broader AI Analytics

Basket analysis, spend trends per category, session patterns, price drift, item co-occurrence, time-since-last-purchase signals, items added but never checked.
