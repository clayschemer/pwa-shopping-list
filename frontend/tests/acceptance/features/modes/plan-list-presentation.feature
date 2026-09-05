Feature: Plan List Presentation Options
  As an authenticated user in plan mode
  I want to adjust how the shopping list is presented
  So that I can focus on the information that matters to me right now

  Background:
    Given I am authenticated and have access to the shopping list
    And I am in plan mode

  @pending
  Scenario: Default presentation
    When I view the shopping list
    Then the items should be grouped by category
    And each item with a known price should display its price
    And items that have been checked during a shop session should not be shown

  @pending
  Scenario: Hide category grouping
    Given two or more categories exist with items assigned to them
    When I hide category grouping
    Then the items should be presented as a single sequence
    And the order should match the active shop layout
    And no category headers or category totals should be shown

  @pending
  Scenario: Reveal items previously checked off
    Given items have been checked off during a shop session
    When I reveal checked items in the plan view
    Then those items should appear in the plan list
    And they should be visually distinguished from items that are still active

  @pending
  Scenario: Remove a revealed checked item from the plan view
    Given a checked item is revealed in the plan view
    When I remove that item from the list
    Then it should no longer appear in the plan list
    And it should not reappear if I reveal checked items again

  @pending
  Scenario: Hide item prices
    Given one or more items have a known price
    When I hide item prices
    Then no per-item price should be displayed in the plan list
    And category totals should still be shown when category grouping is enabled
    And the shop mode checkout total should still be shown

  @pending
  Scenario: Presentation options persist on the same device
    Given I have enabled one or more presentation options
    When I start a new session on the same device
    Then the same presentation options should still be in effect

  @pending
  Scenario: Presentation options are not shared between users
    Given one user has enabled a presentation option
    When the other user opens the application
    Then they should see the default presentation
    And the other user's choice should not affect their view

  @pending
  Scenario: Reorder categories starting from the plan view preserves the active layout
    Given I am viewing the shopping list with a specific shop layout active
    When I choose to reorder categories from the plan view
    Then I should be reordering categories for that same shop layout
