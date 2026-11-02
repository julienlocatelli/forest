Feature: Front theme from the shared variables

  Scenario Outline: Follows the system color preference
    Given my system prefers the <theme> color scheme
    When I open the page at "/"
    Then the page uses the <theme> theme colors

    Examples:
      | theme |
      | light |
      | dark  |

  Scenario: Falls back to the light theme without a system preference
    Given my system states no color scheme preference
    When I open the page at "/"
    Then the page uses the light theme colors
