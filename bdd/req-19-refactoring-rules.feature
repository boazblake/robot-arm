Feature: Requirement 19 - Refactoring rules
  Changes remain minimal, typed, composable, and within domain boundaries.

  Scenario: Use the simplest functional implementation
    Given new or refactored logic is introduced
    Then the logic is implemented as a pure function unless a documented side effect is required
    And composition is used unless a documented concrete reason prevents it
    And inputs are not mutated unless a documented concrete reason requires mutation
    And a class is introduced only when a named concrete requirement demonstrates the need
    And no abstraction is added solely for a hypothetical future use
    And no dependency is added when the required behavior is available from TypeScript or browser APIs

  Scenario: Keep new domain code strictly typed
    Given new domain code is reviewed
    Then it contains no any type
    And it contains no as any expression
    And it contains no @ts-ignore or equivalent suppression
    And it does not exclude problematic code from validation

  Scenario: Remove dead code and preserve behavior intentionally
    Given existing code is considered for change or removal
    Then dead code is not retained for possible future use
    And working behavior is changed only with a stated reason
    And every module has one focused responsibility

  Scenario: Enforce architectural boundaries
    Then platform code remains outside domain code
    And UI code remains outside domain logic
    And hardware concepts remain outside human-motion models
