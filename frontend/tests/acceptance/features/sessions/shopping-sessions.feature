Feature: Shopping Sessions
  As an authenticated user in shop mode
  I want to start and manage a shopping session
  So that I can track what I have bought and monitor spending during a shop

  Scenario: Start a shopping session
    Given I am in shop mode
    And there is no active session for the selected shop
    When I start a new shopping session
    Then an active session should be associated with the selected shop
    And I should be a participant in that session
    And the session should begin tracking my activity

  Scenario: Only one active session per shop per account
    Given I am in shop mode
    And an active session already exists for the selected shop
    When I attempt to start a new session for the same shop
    Then a new session should not be created
    And I should be added as a participant in the existing session

  Scenario: Multiple shops can have concurrent sessions
    Given one user has an active session at one shop
    When another user starts a session at a different shop
    Then both sessions should be active simultaneously
    And each session should track activity independently

  Scenario: User joins existing session for same shop
    Given one user has an active session at a shop
    When the other user selects the same shop
    Then the second user should automatically join the existing session
    And both users should be participating in the same session

  Scenario: Selecting a shop starts a session
    Given I am in shop mode
    When I select a shop or choose to shop without a specific shop
    Then a session should be started automatically
    And the session should reflect the selected shop or global scope

  Scenario: Shop selection shows active session indicator
    Given an active session exists at one or more shops
    When I am presented with the shop selection
    Then shops with active sessions should be clearly indicated
    And shops without active sessions should have no indicator

  Scenario: Checking an item is tracked within the session
    Given I have an active shopping session
    And one or more items exist on the list
    When I check an item
    Then the item should be recorded as checked within the current session

  Scenario: Checked items identify who checked them
    Given I have an active shopping session with another participant
    When either participant checks an item
    Then the checked item should record which participant checked it
    And the undo history should display the checker's initials

  Scenario: Session tracks a running total per category
    Given I have an active shopping session
    And one or more items with prices exist on the list
    When I check an item
    Then the session should update the running total for that item's category
    And the overall session total should also be updated

  Scenario: Unchecking an item updates the session total
    Given I have an active shopping session
    And I have checked one or more items
    When I uncheck an item
    Then the session total should decrease by that item's price
    And the item should reappear on the active list

  Scenario: Any participant can undo a check
    Given two users are participating in the same session
    And one user has checked an item
    When the other user views the undo history
    Then the checked item should be visible with the checker's initials
    And the other user should be able to uncheck it

  Scenario: Two concurrent sessions at different shops display independent totals
    Given two users each have an active session at different shops
    And both users are checking items
    When either user views their session total
    Then they should see only the total accumulated within their own session
    And a combined category total reflecting all checked items should also be visible

  Scenario: Either user can explicitly close a session
    Given one or more users have an active shopping session
    When either user closes the session
    Then the session should be marked as complete
    And the session should be recorded in history
    And neither user should have an active session for that shop any longer

  Scenario: Inactive session triggers a reminder to close
    Given I have an active shopping session
    When the session has had no activity for thirty minutes
    Then I should be reminded that a session is still active
    And I should be prompted to close it or continue shopping

  Scenario: Session is recorded in history on close
    Given a shopping session has been closed
    When I view my session history
    Then the completed session should be visible
    And it should include the shop, items checked, and total spend for the session

  Scenario: Session history informs frequency tracking
    Given one or more shopping sessions have been completed
    When the system evaluates item frequency
    Then items that appear regularly across sessions should be identified
    And those items should be available as suggestions for future lists
