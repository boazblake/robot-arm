Feature: Requirement 20 - Required audit and stabilization work process
Stabilization follows an evidence-first sequence so destructive cleanup does not rely on guesses.

  Scenario: Repository inspection occurs before destructive refactoring
    Given stabilization work has started
    When source modification begins
    Then the application entry path has already been traced
    And the build system has already been identified
    And web tracking has already been traced
    And native tracking locations have already been identified
    And major state and rendering paths have already been identified

  Scenario: Audit classifies significant paths
    When the pre-change audit is produced
    Then significant application paths are classified as KEEP, MOVE, REFACTOR, REMOVE, or UNKNOWN
    And each REMOVE item has evidence that it is not required
    And each important UNKNOWN item has a stated question

  Scenario: Important UNKNOWN items block destructive action
    Given an UNKNOWN item could affect build, runtime tracking, native integration, or stored user data
    When its purpose remains unresolved
    Then the item is not deleted
    And the uncertainty is resolved or reported before completion

  Scenario: Baseline validation is recorded before refactoring
    When the existing repository baseline is established
    Then build is run when available
    And typecheck is run when available
    And tests are run when available
    And lint is run when available
    And each baseline result records PASS, FAIL, NOT AVAILABLE, or NOT VERIFIED

  Scenario: Pre-existing failures are distinguished from introduced failures
    Given a baseline check fails
    When final validation is compared with baseline
    Then the final report identifies whether the failure existed before stabilization
    And stabilization does not claim to have introduced a baseline failure without evidence
    And READY still follows Requirement 2 regardless of baseline history

  Scenario: Refactoring proceeds in coherent units
    When stabilization changes are made
    Then each major change has one stated purpose
    And unrelated robotics implementation is not bundled into the change

  Scenario: Final validation occurs after the final source change
    Given stabilization source changes are complete
    When final status is determined
    Then required validation commands are executed against that final state
    And earlier passing results are not reused after later changes invalidate them

  Scenario: Final report is based on executed evidence
    When the final report is written
    Then validation claims match command results
    And runtime claims match executed smoke checks
    And unexecuted runtime claims are NOT VERIFIED
