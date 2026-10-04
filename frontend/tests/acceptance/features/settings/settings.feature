Feature: Settings
  As an authenticated user
  I want to configure the application to my preferences
  So that the app suits my environment and accessibility needs

  Background:
    Given I am authenticated and have access to the application

  Scenario: Settings default to device preferences
    Given my device has a preference configured for an accessibility or display setting
    When I open the application for the first time
    Then the application should reflect my device preference for that setting
    And I should not need to configure it manually

  Scenario: User overrides a device default
    Given the application is using a device default for a setting
    When I change that setting in the application
    Then the application should use my chosen value instead of the device default

  Scenario: User restores a setting to device default
    Given I have overridden a setting
    When I reset that setting to default
    Then the application should once again reflect my device preference

  Scenario: Settings are persisted across sessions
    Given I have configured one or more settings
    When I start a new session on the same device with an intact session
    Then my settings should be restored as I left them

  Scenario: Settings are not shared between users
    Given one user has configured their settings
    When the other user opens the application
    Then they should see their own settings and device defaults
    And not the other user's configuration

  Scenario: Settings are not carried across devices
    Given I have configured settings on one device
    When I access the application from a different device
    Then the application should reflect that device's own defaults
    And not my settings from another device
