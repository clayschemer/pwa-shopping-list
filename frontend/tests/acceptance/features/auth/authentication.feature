Feature: Authentication
  As a permitted user of the shopping app
  I want to authenticate with my identity provider
  So that I can securely access my shared shopping list

  Background:
    Given the application is available

  Scenario: Permitted user gains access
    Given I am not authenticated
    When I authenticate successfully with a permitted account
    Then I should have access to the shopping list

  Scenario: Non-permitted user is denied access
    Given I am not authenticated
    When I authenticate successfully with a non-permitted account
    Then I should be denied access to the application
    And I should be informed that I do not have permission

  Scenario: User awaits verification after authenticating for the first time
    Given I am not authenticated
    When I authenticate successfully with an account that has not yet been verified
    Then I should not have access to the shopping list
    And I should be informed that my access is pending verification

  Scenario: User gains access once their account is verified
    Given I have previously authenticated and was awaiting verification
    When my account is verified and I return to the application
    Then I should have access to the shopping list

  Scenario: Authenticated session is restored
    Given I have previously authenticated
    When I return to the application on the same device with an intact session
    Then I should have access to the shopping list without re-authenticating

  Scenario: User ends their session
    Given I am authenticated
    When I end my session
    Then I should no longer have access to the shopping list
    And I should be required to authenticate again to regain access

  Scenario: Session is not carried across contexts
    Given I am authenticated on one device
    When I access the application from a different device or a fresh session
    Then I should be required to authenticate again
