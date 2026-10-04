Feature: Collapsible Secondary Categories
  As a user editing an item
  I want secondary categories to be collapsed by default
  So that the editor remains uncluttered unless I need secondary assignments

  Scenario: Secondary categories are hidden by default
    Given categories exist
    When I open the item editor for an item with no secondary categories
    Then the secondary categories section should be collapsed

  Scenario: Secondary categories can be expanded
    Given categories exist
    When I open the item editor and expand the secondary categories section
    Then I should see the available secondary category options

  Scenario: Secondary categories are auto-expanded when selections exist
    Given categories exist
    And an item has secondary categories assigned
    When I open the item editor for that item
    Then the secondary categories section should be expanded
