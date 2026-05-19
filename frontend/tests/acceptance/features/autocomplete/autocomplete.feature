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

  Scenario: Only the most-purchased variant of an item is suggested
    Given the same item has previously been bought in several quantity or unit variants
    When suggestions are displayed for that item
    Then only the most frequently bought variant of that item should be suggested
    And no other variant of the same item should appear in the suggestions

  Scenario: No suggestion is forced on the user
    Given suggestions are displayed when adding a new item
    When I ignore the suggestions and enter a new item name
    Then the new item should be added as entered
    And no suggestion should be automatically applied
