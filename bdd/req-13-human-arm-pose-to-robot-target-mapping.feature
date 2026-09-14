Feature: Requirement 13 - Human arm pose to robot target mapping

  TeleopMapper composes the robot-independent teleoperation pipeline for one selected
  arm. It consumes HumanArmPose, ArmCalibration, ArmTrackingValidity, and the
  Requirement 14 WorkspaceMapping contract, then produces at most one absolute
  robot-independent RobotTarget. It does not perform confidence, staleness, control,
  robot, orientation, or gripper policy.

  The mapping boundary has the following shape:

    HumanArmPose + ArmCalibration + ArmTrackingValidity
      -> ArmDisplacement
      -> WorkspaceMapping
      -> absolute workspace position
      -> RobotTarget

  TeleopMappingInput contains side, pose, calibration, validity, workspace, and
  sequence. sourceTimestamp is not supplied separately: RobotTarget.sourceTimestamp
  is always pose.timestamp.

  Scenario: A valid left arm input produces one RobotTarget
    Given the selected side is "left"
    And the pose contains a usable left HumanArm
    And left tracking validity is valid
    And left calibration matches the selected side
    And the WorkspaceMapping is valid
    When TeleopMapper processes the input
    Then it produces one successful RobotTarget
    And the target side is "left"
    And the target position is absolute within the normalized workspace
    And it does not produce a right-arm target

  Scenario: A valid right arm input produces one RobotTarget
    Given the selected side is "right"
    And the pose contains a usable right HumanArm
    And right tracking validity is valid
    And right calibration matches the selected side
    And the WorkspaceMapping is valid
    When TeleopMapper processes the input
    Then it produces one successful RobotTarget
    And the target side is "right"
    And the target position is absolute within the normalized workspace
    And it does not produce a left-arm target

  Scenario: Mapping uses calibrated hand-anchor displacement
    Given the selected arm is usable, valid, and calibrated
    When TeleopMapper processes the input
    Then it calculates ArmDisplacement from the current handAnchor and calibration reference handAnchor
    And it passes that displacement to WorkspaceMapping
    And it does not use raw camera coordinates as the target position
    And it does not substitute human joint angles for robot joint angles

  Scenario: Zero calibrated displacement is mapped through the workspace contract
    Given the selected arm handAnchor equals its calibration reference handAnchor
    And tracking validity is valid
    And the WorkspaceMapping is valid
    When TeleopMapper processes the input
    Then it passes zero displacement to WorkspaceMapping
    And the resulting workspace position becomes RobotTarget.position

  Scenario: Non-zero calibrated displacement is mapped through the workspace contract
    Given the selected arm has a finite non-zero calibrated displacement
    When TeleopMapper processes the input
    Then it obtains the absolute target position only through WorkspaceMapping
    And the resulting workspace position becomes RobotTarget.position
    And Requirement 13 does not define or override axis, origin, scale, units, or bounds

  Scenario: The selected arm is unavailable
    Given the selected arm in HumanArmPose is null
    When TeleopMapper processes the input
    Then it returns a failed result with reason "arm-unavailable"
    And it does not produce a RobotTarget

  Scenario: Invalid selected-arm tracking is rejected
    Given the selected arm is present in HumanArmPose
    And the selected arm tracking validity is invalid
    When TeleopMapper processes the input
    Then it returns a failed result with reason "tracking-invalid"
    And it does not calculate displacement
    And it does not produce a RobotTarget

  Scenario: Calibration is required for the selected arm
    Given the selected arm is available and tracking validity is valid
    And calibration is null
    When TeleopMapper processes the input
    Then it returns a failed result with reason "not-calibrated"
    And it does not produce a RobotTarget

  Scenario: Calibration must match the selected side
    Given the selected side is "left"
    And the supplied calibration has side "right"
    When TeleopMapper processes the input
    Then it returns a failed result with reason "not-calibrated"
    And it does not produce a RobotTarget

  Scenario: Unavailable arm takes precedence over other failures
    Given the selected arm is unavailable
    And its tracking validity is invalid
    And calibration is null
    When TeleopMapper processes the input
    Then it returns a failed result with reason "arm-unavailable"

  Scenario: Invalid tracking takes precedence over missing calibration
    Given the selected arm is available but tracking validity is invalid
    And calibration is null
    When TeleopMapper processes the input
    Then it returns a failed result with reason "tracking-invalid"

  Scenario: Missing calibration is reported after availability and validity pass
    Given the selected arm is available and tracking validity is valid
    And calibration is null
    When TeleopMapper processes the input
    Then it returns a failed result with reason "not-calibrated"

  Scenario: An invalid workspace mapping is rejected
    Given the selected arm is available, valid, and calibrated
    And the WorkspaceMapping cannot produce a valid workspace position
    When TeleopMapper processes the input
    Then it returns a failed result with reason "workspace-invalid"
    And it does not produce a RobotTarget

  Scenario: Non-finite displacement is rejected
    Given the selected arm is available, valid, and calibrated
    And the calculated displacement contains a non-finite value
    When TeleopMapper processes the input
    Then it returns a failed result with reason "mapping-invalid"
    And it does not produce a RobotTarget
    And it does not silently clamp the invalid value

  Scenario: Non-finite mapped position is rejected
    Given the selected arm is available, valid, and calibrated
    And WorkspaceMapping returns a position containing a non-finite value
    When TeleopMapper processes the input
    Then it returns a failed result with reason "mapping-invalid"
    And it does not produce a RobotTarget
    And it does not silently clamp the invalid value

  Scenario: Pose timestamp is preserved
    Given the selected arm input has pose timestamp T
    And mapping succeeds
    When the RobotTarget is inspected
    Then sourceTimestamp equals T
    And no target-generation timestamp is used

  Scenario: Supplied sequence is forwarded
    Given the session orchestration supplies a non-negative integer sequence
    And mapping succeeds
    When the RobotTarget is inspected
    Then target.sequence equals the supplied sequence
    And TeleopMapper does not own or mutate a sequence counter

  Scenario: Orientation is absent
    Given mapping succeeds
    When the RobotTarget is inspected
    Then the orientation property is absent
    And orientation is not fabricated from shoulder, elbow, wrist, or handAnchor geometry

  Scenario: Gripper intent is absent
    Given mapping succeeds
    When the RobotTarget is inspected
    Then the gripper property is absent
    And no hand classification or gripper state is inferred

  Scenario: Expected failures are typed results
    Given tracking, calibration, displacement, or workspace input is invalid
    When TeleopMapper processes the input
    Then it returns a typed failed result
    And it does not throw for the expected failure

  Scenario: Staleness and control policy remain outside the mapper
    When TeleopMapper is inspected
    Then it does not compare timestamps with a clock
    And it does not apply stale-input or tracking-loss timeout policy
    And it does not contain enabled, emergencyStop, or controlActive policy
    And Requirement 16 owns control enablement
    And Requirement 17 owns staleness and tracking-loss policy

  Scenario: TeleopMapper has no screen, camera, UI, or concrete robot dependency
    When TeleopMapper dependencies are inspected
    Then they may include HumanArmPose, ArmCalibration, ArmTrackingValidity, ArmDisplacement, WorkspaceMapping, RobotTarget, and generic geometry
    And they do not include window, screen dimensions, canvas dimensions, DOM, UI stores, render state, or camera dimensions
    And they do not include RobotAdapter, NASA, iMETRO, CLR, UR10e, Hand-E, SO-101, ROS, ROS 2, MoveIt, MuJoCo, clr_ws, or servo protocols
    And they do not include platform modules

  Scenario: TeleopMapper does not define spatial mapping policy
    When TeleopMapper is inspected
    Then axis assignment, origin, scale, units, and workspace bounds are obtained through WorkspaceMapping
    And no such values are hard-coded in TeleopMapper
    And Requirement 14 owns the spatial transformation and normalization rules
