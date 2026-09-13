Feature: Requirement 2 - Definition of done and validation truth
Completion is based on executed evidence, not intent or documentation claims.

  Background:
    Given dependencies are installed by the documented clean-install command

  Scenario Outline: Required validation command passes
    When the documented <check> command is run from the repository root
    Then the process exits with status code 0
    And its output contains no error for that check
    And the command validates the application source used by the production build

    Examples:
      | check     |
      | build     |
      | typecheck |
      | test      |
      | lint      |

  Scenario: Validation cannot pass by excluding failing application code
    When validation configuration is inspected
    Then production source is not excluded solely to obtain a passing result
    And test source is not excluded solely to conceal a failing test
    And lint configuration does not ignore a known failing production path solely to obtain success
    And TypeScript configuration does not omit a required production path solely to obtain success

  Scenario: TypeScript success cannot use error suppression as a repair
    When changed TypeScript and JavaScript source is inspected
    Then no new ts-ignore directive exists to conceal a type error
    And no new ts-expect-error directive exists without a documented external compatibility reason
    And no new unsafe cast to any exists solely to silence a type error

  Scenario: The test suite contains no disabled stabilization tests
    When committed test source is inspected
    Then no stabilization test uses skip
    And no stabilization test uses todo
    And no stabilization test uses only
    And no required scenario is represented only by a disabled test

  Scenario: Development server starts
    When the documented development command is started
    Then startup completes without an application startup error
    And the server becomes reachable on its reported local address
    And the process remains running until intentionally stopped

  Scenario: Runtime checks use explicit result states
    Given a required runtime check is attempted
    When its result is recorded
    Then the result is exactly PASS, FAIL, or NOT VERIFIED

  Scenario: Unavailable runtime environments are not treated as success
    Given a required runtime check cannot execute because its platform or device is unavailable
    Then its result is NOT VERIFIED
    And the final report states why it could not execute
    And the result is not described as PASS, successful, working, verified, or READY

  Scenario: READY has one meaning
    When the final repository status is READY
    Then build is PASS
    And typecheck is PASS
    And test is PASS
    And lint is PASS
    And no blocker listed by Requirement 21 contradicts readiness
