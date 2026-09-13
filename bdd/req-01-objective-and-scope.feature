Feature: Requirement 1 - Lift-Mate stabilization objective and scope
  The repository is stabilized as a verified foundation for later robotics work.
  This feature is satisfied only when every scope boundary below is true.

  Scenario: Stabilization has the exact stated objective
    Given the repository under test is Lift-Mate
    When the stabilization change is inspected
    Then its purpose is to produce a clean, verified base for robotics development
    And its purpose includes stabilization and refactoring only
    And its purpose does not include implementing robotics behavior

  Scenario: The future pipeline boundary is preserved exactly
    Given the documented tracking-to-robot pipeline is inspected
    Then the ordered stages are exactly Camera, MediaPipe, TrackingFrame, HumanArmPose, RobotMapper, and Simulator or physical robot
    And the boundary after HumanArmPose remains available for future work
    And the stabilization work stops before RobotMapper
    And no implementation invokes, defines, or depends on RobotMapper as part of stabilization
