Feature: Requirement 11 - Fitness behavior isolation
Existing fitness behavior may remain, but it cannot own the core tracking architecture.

  Scenario: Exercise analysis does not initialize MediaPipe
    When exercise-analysis modules are inspected
    Then they do not create MediaPipe landmarker instances
    And they do not own camera startup

  Scenario: Exercise analysis consumes platform-independent data
    Given exercise analysis remains active
    When it evaluates a tracked movement
    Then its tracking input is a platform-independent domain value
    Or an existing transitional dependency is explicitly listed as technical debt

  Scenario: Fitness logic does not define TrackingFrame
    When tracking contracts are inspected
    Then TrackingFrame is defined outside exercise-specific modules
    And exercise names do not appear in the TrackingFrame contract

  Scenario: Robotics can be added without exercise selection
    Given a future robotics feature consumes tracking
    Then the documented tracking boundary does not require a selected exercise
    And the documented tracking boundary does not require rep counting
    And the documented tracking boundary does not require coaching cues

  Scenario: Dead fitness code is removed only after evidence
    Given fitness-related code appears unused
    When repository references and runtime routes are inspected
    Then code with no current consumer is classified as removable
    And working routed functionality is not deleted solely because it is fitness-related

  Scenario: Remaining fitness debt is explicit
    Given fitness code cannot safely be isolated within stabilization scope
    Then the exact dependency is listed in the final technical-debt section
    And the repository is not described as fully isolated when that dependency remains
