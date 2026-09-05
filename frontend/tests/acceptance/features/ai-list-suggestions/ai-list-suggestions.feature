Feature: AI List Suggestions
  As an authenticated user with AI configured
  I want the AI to proactively suggest items for my shopping list
  So that I am reminded of things I may need without having to think of everything myself

  Scenario: AI suggested items are visually distinguishable from user added items
    Given the AI has added one or more items to the shopping list
    When I view the shopping list
    Then AI suggested items should be visually distinct from items I have added myself

  Scenario: User can view the motivation for an AI suggested item
    Given the AI has added an item to the shopping list
    When I request the motivation for that item
    Then I should be presented with the AI's reasoning for suggesting it

  Scenario: User can remove an AI suggested item
    Given the AI has added an item to the shopping list
    When I remove the item
    Then the item should be removed from the list
    And the removal should be treated the same as removing a user added item

  Scenario: AI suggestions respect the shared toggle setting
    Given the AI auto-add setting has been disabled
    When the AI would otherwise suggest an item
    Then no item should be automatically added to the list

  Scenario: Either user can toggle the AI auto-add setting
    Given the AI auto-add setting is enabled
    When either user disables the setting
    Then the AI should stop automatically adding items to the list for both users

  Scenario: AI suggested items are functionally identical to user added items
    Given the AI has added one or more items to the shopping list
    When I interact with those items
    Then they should behave in every respect the same as items I have added myself

  Scenario: AI features are inactive without configuration
    Given no AI provider has been configured for the account
    When suggestions would otherwise be generated
    Then no items should be automatically added to the list
