Feature: Requirement 19 - Refactoring constraints and code quality rules
Refactoring reduces accidental complexity while preserving required behavior.

  Scenario: Pure transformations remain pure
    Given a function only transforms tracking or geometry values
    When it is refactored
    Then it receives required data through parameters
    And it returns its result directly
    And it does not read global stores
    And it does not write global stores
    And it does not trigger UI redraws

  Scenario: New domain code prefers functions over classes
    When new tracking or geometry domain code is inspected
    Then classes exist only when a library contract or demonstrated stateful requirement needs them
    And stateless transformations use functions

  Scenario: New transformations do not mutate inputs
    Given a normalization or geometry function receives an input object or collection
    When the function completes
    Then it does not require mutation of the caller-owned input

  Scenario: New abstractions require a current consumer
    Given a new interface, adapter, manager, controller, provider, factory, or repository abstraction is introduced
    When its use is inspected
    Then a current stabilization requirement or current runtime consumer requires it
    And it is not added solely for hypothetical future robotics work

  Scenario: New dependencies require justification
    Given stabilization adds a dependency
    When the dependency audit is inspected
    Then the dependency maps to a current requirement
    And native TypeScript or existing project capability was considered first

  Scenario: New domain code does not use any
    When changed domain tracking and geometry code is inspected
    Then explicit any is absent
    And TypeScript errors are not hidden by unsafe casts solely to pass validation

  Scenario: Comments explain durable reasons rather than temporary instructions
    When new code comments are inspected
    Then comments explain non-obvious constraints, external behavior, or durable design reasons
    And temporary agent instructions are not committed as source comments

  Scenario: Working behavior is not rewritten only for style
    Given code already satisfies a requirement and does not block the target boundary
    When stabilization is performed
    Then it is not rewritten solely to match personal formatting or architectural preference

  Scenario: Refactoring is validated after meaningful changes
    Given a refactor changes a tracking boundary, build configuration, or dependency
    When that change is considered complete
    Then relevant automated checks are run before the final completion claim
