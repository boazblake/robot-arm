Feature: Requirement 21 - Final report
  The final report gives an auditable account of readiness and verification.

  Scenario: Final report contains all mandatory sections
    Given stabilization work is complete
    When the final report is inspected
    Then it contains STATUS
    And STATUS is exactly READY or NOT READY
    And it contains baseline build results
    And it contains baseline typecheck results
    And it contains baseline test results
    And it contains baseline lint results
    And it lists changes
    And it lists removed items
    And it describes final architecture
    And it describes tracking data flow
    And it reports build, typecheck, test, lint, web, iOS, and Android validation results
    And it lists remaining technical debt
    And it identifies the next development boundary
    And it lists blockers

  Scenario: READY is conditional on required validation
    Given production build, typecheck, unit tests, and lint all pass
    When final status is determined
    Then STATUS is READY

  Scenario: Failed required validation prevents READY
    Given at least one of production build, typecheck, unit tests, or lint does not pass
    When final status is determined
    Then STATUS is NOT READY

  Scenario: Unavailable platforms are not falsely verified
    Given web, iOS, or Android validation cannot be performed
    Then that platform result is written exactly as NOT VERIFIED
    And that result is not written as passing
