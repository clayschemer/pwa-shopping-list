Feature: Category Groups
  As an authenticated user setting up where I shop
  I want to gather categories into named groups
  So that I can make many categories available or unavailable at a shop in one action

  Scenario: Create a category group
    Given I am in plan mode
    And I have access to the shopping list
    When I create a new category group with a valid name
    Then the group should exist with no categories in it

  Scenario: Category group names must be unique
    Given I am in plan mode
    And a category group with a given name already exists
    When I attempt to create another category group with the same name
    Then the new group should not be created
    And I should be informed that the name is already in use

  Scenario: Add several categories to a group at once
    Given a category group exists
    And two or more categories exist that belong to no group
    When I add those categories to the group in a single action
    Then every one of those categories should belong to the group

  Scenario: Remove several categories from a group at once
    Given a category group exists with categories assigned
    When I remove those categories from the group in a single action
    Then none of those categories should belong to the group
    And the categories should still exist

  Scenario: A category can belong to several groups
    Given two category groups exist
    And a category belongs to the first group
    When I add the category to the second group
    Then the category should belong to both groups

  Scenario: Group membership does not affect the order categories are listed in
    Given two or more categories exist in a known order
    When I add some of those categories to a group
    Then the categories should still be listed in the same order as before

  Scenario: Rename a group without affecting its categories
    Given a category group exists with categories assigned
    When I rename the group to a valid new name
    Then the group should be known by its new name
    And the same categories should still belong to it

  Scenario: Make every category in a group available at a shop
    Given a category group exists with categories assigned
    And a shop exists where only some of those categories are available
    When I make the group available at that shop
    Then every category in the group should be available at that shop

  Scenario: Make every category in a group unavailable at a shop
    Given a category group exists with categories assigned
    And a shop exists where every category in the group is available
    When I make the group unavailable at that shop
    Then none of the categories in the group should be available at that shop
    And the categories should still exist

  Scenario: Partial availability of a group at a shop is reported
    Given a category group exists with categories assigned
    And a shop exists where only some of those categories are available
    When I review where the group is available
    Then the group should be reported as partially available at that shop

  Scenario: Making one group unavailable does not affect categories held by another group
    Given a category belongs to two groups
    And the category is available at a shop
    When I make the second group available at that shop
    And I make the first group unavailable at that shop
    Then the category should not be available at that shop

  Scenario: Delete a group without deleting its categories
    Given a category group exists with categories assigned
    When I delete the group
    Then the group should no longer exist
    And every category that belonged to it should still exist and belong to no group

  Scenario: An empty group is retained
    Given a category group exists with no categories assigned
    When I review my category groups
    Then the empty group should still be listed

  Scenario: Category groups are shared between users
    Given a user creates a category group
    When the other user accesses the shopping list
    Then they should see the newly created group
