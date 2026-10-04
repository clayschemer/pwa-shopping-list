Feature: Automatic Additions From Purchase History
  As an authenticated user
  I want items I buy regularly to reappear on the list when they are due
  So that recurring purchases are not forgotten without me having to keep track of them

  Scenario: A regularly purchased item is added automatically once it is due
    Given automatic additions are enabled for the account
    And an item has been purchased repeatedly at a consistent interval
    And at least that interval has passed since it was last purchased
    When automatic additions are evaluated
    Then the item should be added to the shopping list
    And the item should be marked as having been added automatically

  Scenario: An item purchased at irregular intervals is not added automatically
    Given automatic additions are enabled for the account
    And an item has been purchased repeatedly at widely varying intervals
    When automatic additions are evaluated
    Then the item should not be added to the shopping list

  Scenario: An item with too little purchase history is not added automatically
    Given automatic additions are enabled for the account
    And an item has been purchased too few times to establish an interval
    When automatic additions are evaluated
    Then the item should not be added to the shopping list

  Scenario: An item purchased only rarely is not added automatically
    Given automatic additions are enabled for the account
    And an item has been purchased repeatedly but only at long intervals
    When automatic additions are evaluated
    Then the item should not be added to the shopping list

  Scenario: An item whose purchase habit has lapsed is not added automatically
    Given automatic additions are enabled for the account
    And an item was previously purchased at a consistent interval
    And far longer than that interval has passed since it was last purchased
    When automatic additions are evaluated
    Then the item should not be added to the shopping list

  Scenario: An item already on the list is not added again
    Given automatic additions are enabled for the account
    And an item is due to be added automatically
    And that item is already on the shopping list
    When automatic additions are evaluated
    Then the item should appear on the list exactly once
    And the item should remain marked as it was before the evaluation

  Scenario: The reason for an automatic addition can be viewed
    Given an item has been added automatically
    When I request the reason for that addition
    Then I should be presented with an explanation referring to how often the item is purchased

  Scenario: Automatically added items are distinguishable from items added by a person
    Given an item has been added automatically
    And another item has been added by a user
    When I view the shopping list
    Then the automatically added item should be distinguishable from the one added by a user

  Scenario: Removing an automatically added item prevents it being added again for a period
    Given an item has been added automatically
    When I remove that item from the list without purchasing it
    And automatic additions are evaluated again
    Then the item should not be added to the shopping list

  Scenario: Purchasing an automatically added item is treated as acceptance
    Given an item has been added automatically
    When I purchase that item during a shopping trip
    And automatic additions are evaluated after the interval has passed again
    Then the item should be added to the shopping list

  Scenario: The number of automatic additions on the list at once is limited
    Given automatic additions are enabled for the account
    And more items are due to be added automatically than the allowed limit
    When automatic additions are evaluated
    Then only up to the allowed limit of items should be added
    And the items added should be those most overdue

  Scenario: No automatic additions are made during an active shopping trip
    Given automatic additions are enabled for the account
    And an item is due to be added automatically
    And a shopping trip is in progress
    When automatic additions are evaluated
    Then the item should not be added to the shopping list

  Scenario: Automatic additions are evaluated at most once a day for the account
    Given automatic additions are enabled for the account
    And automatic additions have already been evaluated for the account today
    When automatic additions would otherwise be evaluated again
    Then no further evaluation should take place
    And no items should be added to the shopping list

  Scenario: Automatic additions respect the shared setting
    Given automatic additions are disabled for the account
    And an item is due to be added automatically
    When automatic additions would otherwise be evaluated
    Then the item should not be added to the shopping list

  Scenario: Either user can change the automatic additions setting
    Given automatic additions are enabled for the account
    When either user disables automatic additions
    Then automatic additions should stop for both users

  Scenario: Automatic additions are unavailable until the application is installed
    Given the application has not been installed on my device
    When I view the automatic additions setting
    Then I should not be able to enable automatic additions
    And I should be informed that installing the application is required

  Scenario: Automatically added items behave like any other item
    Given an item has been added automatically
    When I interact with that item
    Then it should behave in every respect the same as an item added by a user
