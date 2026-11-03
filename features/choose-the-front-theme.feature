Feature: Choose the front theme

  Scenario Outline: Applies the chosen theme at once
    Given my system prefers the <system> color scheme
    And I am on the page at "/"
    When I choose the <choice> theme
    Then the page uses the <choice> theme colors

    Examples:
      | system | choice |
      | light  | dark   |
      | dark   | light  |

  Scenario: Keeps the chosen theme after a reload
    Given my system prefers the light color scheme
    And I chose the dark theme on the page at "/"
    When I reload the page
    Then the page uses the dark theme colors

  Scenario: Follows the system again when I choose the system theme
    Given my system prefers the dark color scheme
    And I chose the light theme on the page at "/"
    When I choose the system theme
    Then the page uses the dark theme colors
