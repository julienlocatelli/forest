Feature: Local user login

  Scenario: Opens a session with valid credentials
    Given I have a local account
    When I log in with my email and password
    Then my session is open

  Scenario: Refuses invalid credentials
    Given I have a local account
    When I log in with a wrong password
    Then I am told the credentials are invalid
    And no session is open
