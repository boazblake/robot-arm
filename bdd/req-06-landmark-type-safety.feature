Feature: Requirement 6 - Landmark type safety
  New domain code cannot bypass the typed landmark contract.

  Scenario: Raw any landmark arrays are prohibited
    Given every new domain function that accepts landmark data is inspected
    Then no raw landmark array is declared with type any
    And no landmark collection is declared as any[]
    And every landmark coordinate is statically typed as numeric
    And optional visibility is statically typed as numeric when present

  Scenario: Error suppression is prohibited
    Given all new domain source files are inspected
    Then the files contain no as any expression
    And the files contain no @ts-ignore directive
    And the files contain no equivalent TypeScript error suppression
    And typecheck success is achieved without excluding the code
