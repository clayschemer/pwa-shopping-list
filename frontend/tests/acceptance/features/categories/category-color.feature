Feature: Category Color
  As an authenticated user
  I want to assign a color to my categories
  So that I can visually distinguish them at a glance

  Scenario: Assign a color when creating a category
    Given I am in plan mode
    And I have access to the shopping list
    When I create a new category with a valid name and a color
    Then the category should be created with the chosen color

  Scenario: Assign a color when editing a category
    Given I am in plan mode
    And a category exists without a color
    When I edit the category and assign a color
    Then the category should be updated with the chosen color

  Scenario: Remove a color from a category
    Given I am in plan mode
    And a category exists with a color
    When I edit the category and remove its color
    Then the category should have no color

  Scenario: Category color is displayed in plan mode
    Given I am in plan mode
    And a category exists with a color
    When items are assigned to that category
    Then the category header should display the colour indicator

  Scenario: Category color is displayed in shop mode
    Given I am in shop mode
    And a category exists with a color
    When items are assigned to that category
    Then the category header should display the colour indicator

  Scenario: Category color is displayed in the navigation drawer
    Given a category exists with a color
    When I view the navigation drawer
    Then the category should display its colour indicator

  Scenario: Category without a color has no indicator
    Given a category exists without a color
    When I view the shopping list
    Then no colour indicator should be shown for that category

  Scenario: Category color appears on selection chips in the item editor
    Given categories exist with colours assigned
    When I open the item editor
    Then each category chip should display its colour indicator

  Scenario: Creating a category without choosing a color
    Given I am in plan mode
    When I create a new category with a valid name and no color
    Then the category should be created without a color
