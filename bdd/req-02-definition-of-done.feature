Feature: Requirement 2 - Definition of done
  Validation is complete only when the stated commands and reporting rules are satisfied.

  Scenario: Production build succeeds
    When the documented production build command is run from the repository root
    Then the command exits with status code 0
    And the command reports no build error

  Scenario: TypeScript typecheck succeeds without suppression
    When the documented TypeScript typecheck command is run from the repository root
    Then the command exits with status code 0
    And the output contains no TypeScript errors
    And the source does not suppress a TypeScript error to obtain success

  Scenario: Unit tests pass
    When the documented unit-test command is run from the repository root
    Then the command exits with status code 0
    And every collected test passes
    And no test is marked as skipped, todo, or otherwise used to conceal a failure

  Scenario: Lint succeeds
    When the documented lint command is run from the repository root
    Then the command exits with status code 0
    And the output contains no lint error

  Scenario: Development server starts without an error
    When the documented development-server command is started
    Then the process starts successfully
    And startup emits no error
    And the process remains available to serve the application until stopped

  Scenario: Untestable behavior is reported as NOT VERIFIED
    Given a required scenario cannot be executed or its result cannot be established
    Then its result is written exactly as NOT VERIFIED
    And it is not written as passing, successful, verified, or READY
