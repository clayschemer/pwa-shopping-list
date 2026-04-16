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
