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

  Scenario: An item falls back to a secondary category when the shop does not stock its primary
    Given I am in plan mode
    And an item exists with a primary category and one or more secondary categories
    And the selected shop does not stock the item's primary category
    And the selected shop stocks one of the item's secondary categories
    When I view the shopping list
    Then the item should appear exactly once, under that secondary category

  Scenario: An item is hidden when the shop stocks none of its categories
    Given I am in plan mode
    And an item exists with a primary category and one or more secondary categories
    And the selected shop stocks none of the item's categories
    When I view the shopping list
    Then the item should not appear on the shopping list

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
    Then the item should be recorded as checked immediately for both users
    And the item should remain visible to me as checked for a short undo period
    And after the undo period the item should disappear from my active list

  Scenario: Undoing a check during the undo period
    Given I am in shop mode
    And I have just checked an item
    When I undo the check within the undo period
    Then the item should be restored as unchecked for both users
    And the session should no longer record the item as checked

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

  Scenario: Concurrent check conflict is handled gracefully
    Given I am in shop mode
    And another user checks an item at the same moment I do
    When my check attempt is rejected because the other user was faster
    Then I should be informed that the item has already been removed
    And the item should no longer appear on my list

  Scenario: A check that cannot be saved is rolled back and reported
    Given I am in shop mode
    And the connection to the backend is temporarily unavailable
    When I check an item
    Then I should be informed that the item could not be checked
    And the item should remain unchecked on the list
    And checking should work again once the connection is restored

  Scenario: An item edit that cannot be saved is reported
    Given I am in plan mode
    And the connection to the backend is temporarily unavailable
    When I edit an item's details
    Then I should be informed that my change could not be saved
    And the item should retain its previous details

  Scenario: Re-adding a previously bought item preserves its price and history
    Given an item has been on the list and has a price recorded
    And a session was completed in which that item was checked
    When I add the item to the list again
    Then the item should retain its recorded price
    And its purchase count should reflect previous sessions
