Feature: Requirement 16 - Developer workflow commands
  A developer can run the standard validation lifecycle using package commands.

  Scenario Outline: Standard command is exposed and succeeds
    Given the repository dependencies are installed
    When the <command> command is run from the repository root
    Then a package script or documented command named <command> exists
    And the command exits with status code 0 under its supported conditions

    Examples:
      | command    |
      | dev        |
      | build      |
      | typecheck  |
      | test       |
      | lint       |

  Scenario: Validation does not hide application failures
    Given the application contains code included in the product
    When build, typecheck, test, or lint configuration is inspected
    Then that application code is not excluded solely to force a passing result
    And failures are fixed or reported rather than suppressed
