Feature: Application Modes
  As an authenticated user
  I want to switch between planning and shopping modes
  So that I have the right level of interaction for my current activity

  Background:
    Given I am authenticated and have access to the shopping list

  Scenario: Application starts in plan mode
    When I access the application for the first time
    Then I should be in plan mode

  Scenario: User switches to shop mode
    Given I am in plan mode
    When I switch to shop mode
    Then I should be in shop mode
    And I should have access to a reduced set of interactions

  Scenario: User switches back to plan mode
    Given I am in shop mode
    When I switch to plan mode
    Then I should be in plan mode
    And I should have access to the full set of interactions

  Scenario: Each user's mode is independent
    Given one user is in plan mode
    When the other user switches to shop mode
    Then the first user should remain in plan mode
    And the second user should be in shop mode

  Scenario: Mode is not persisted across sessions
    Given I am in shop mode
    When I start a new session
    Then I should be returned to plan mode
