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
    When 90 days have passed since the price was last set
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

  Scenario: User can inspect the product an estimated price was matched against
    Given an item has an estimated price set by the application
    When the user inspects the price
    Then the matched product's name and source should be available for review

  Scenario: User can reject an inaccurate price match
    Given an item has an estimated price set by the application
    When the user indicates the matched product is incorrect and provides a reason
    Then the price should be queued for re-estimation
    And the rejection reason should be retained

  Scenario: Rejected matches inform subsequent price lookups
    Given the user has previously rejected a price match for an item with a reason
    When the application re-estimates the price for that item
    Then the previous rejection and reason should influence the new lookup

  Scenario: Successful re-estimation clears prior rejections for the item
    Given the user has previously rejected one or more price matches for an item
    When the application successfully sets a new estimated price for that item
    Then the prior rejections should no longer influence future lookups

  Scenario: Rejection feedback is retained for future analysis
    Given the user rejects a price match with a reason
    When the rejection is recorded
    Then the search context and reason should be retained for later analysis independently of the item's operational state

  Scenario: Item category contributes to price lookup accuracy
    Given an item has a primary category assigned
    When the application looks up an estimated price for that item
    Then the item's category should inform which product is selected as the match

  Scenario: Item shows the shop-specific price when a shop is in context
    Given an item has a price recorded for a specific shop
    When that shop is in context
    Then the shop-specific price should be displayed for that item

  Scenario: Item shows global fallback price in parentheses when no shop-specific price exists
    Given an item has a global price but no price recorded for the shop currently in context
    When the price for that item is displayed
    Then the global price should be shown in parentheses to indicate it is a fallback

  Scenario: Global price is the lowest price found across all shops
    Given the application has found prices for an item at multiple shops
    When the global price is determined
    Then it should reflect the lowest price value found across all shops

  Scenario: Pipeline records prices from all configured shops
    Given an item needs a price update
    And multiple shops are configured for price lookup
    When the application looks up the price for that item
    Then a price should be recorded for each shop where a match was found

  Scenario: Manually entered price is stored against the currently selected shop
    Given a shop is selected
    When I manually enter a price for an item
    Then that price should be stored as the price for the selected shop

  Scenario: Manually entered price without a selected shop becomes the global price
    Given no shop is currently selected
    When I manually enter a price for an item
    Then that price should be stored as the global fallback price
