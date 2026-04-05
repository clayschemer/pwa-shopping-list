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
    And I should be able to proceed without selecting a shop

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
