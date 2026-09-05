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

  Scenario: The selected shop is visible throughout the application
    Given I have selected a shop
    When I view the shopping list, the active shopping session, or the category order
    Then I should be able to see which shop is currently selected

  Scenario: Changing shop during an active session offers a choice
    Given I am in shop mode
    And I have selected a shop
    When I choose to change the currently selected shop
    Then I should be offered the choice to switch to plan mode for the currently selected shop
    And I should be offered the choice to select a different shop and start or join a session there

  Scenario: Switching to plan mode during an active session preserves the selected shop
    Given I have an active shopping session
    When I switch to plan mode without changing the shop
    Then I should be in plan mode
    And the currently selected shop should remain unchanged

  Scenario: Configure a price search URL for a shop
    Given I am in plan mode
    And a shop exists
    When I configure a price search URL for that shop
    Then the shop should have the price search URL stored

  Scenario: Remove a price search URL from a shop
    Given I am in plan mode
    And a shop exists with a price search URL configured
    When I remove the price search URL from that shop
    Then the shop should have no price search URL stored

  @pending
  Scenario: Reorder shops
    Given I am in plan mode
    And two or more shops exist
    When I change the order of the shops
    Then the shops should be displayed in my chosen order throughout the application

  @pending
  Scenario: Shop order is shared between users
    Given a user has set the order of the shops
    When the other user accesses the application
    Then they should see the shops in the same order

  @pending
  Scenario: Edit multiple shop attributes in one operation
    Given I am in plan mode
    And a shop exists
    When I change the name and the price search URL of the shop in a single edit
    And I save the changes
    Then both changes should be reflected throughout the application

  @pending
  Scenario: Discard shop edits before saving
    Given I am in plan mode
    And a shop exists
    When I begin editing the shop and change one or more attributes
    And I discard the edit without saving
    Then the shop should retain its previous name and price search URL
