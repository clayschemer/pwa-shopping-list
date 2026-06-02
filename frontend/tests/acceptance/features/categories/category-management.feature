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

  Scenario: New categories are automatically added to all shops
    Given one or more shops exist
    When a new category is created
    Then the new category should be automatically associated with all existing shops
    And it should be explicitly excluded from a shop if not relevant to it

  Scenario: Exclude a category from a shop
    Given I am in plan mode
    And a shop exists with one or more categories associated with it
    When I exclude a category from that shop
    Then that category and its items should not appear when shopping at that shop

  @pending
  Scenario: Edit multiple category attributes in one operation
    Given I am in plan mode
    And a category exists
    When I change the name, the colour and the shop availability of the category in a single edit
    And I save the changes
    Then all three changes should be reflected throughout the application

  @pending
  Scenario: Discard category edits before saving
    Given I am in plan mode
    And a category exists
    When I begin editing the category and change one or more attributes
    And I discard the edit without saving
    Then the category should retain its previous name, colour, and shop availability
