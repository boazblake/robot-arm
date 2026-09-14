Feature: Requirement 13 - Human arm pose to workspace intent mapping

  Requirement 13 derives robot-independent WorkspacePosition intent for one selected
  arm. It composes HumanArmPose, ArmCalibration, ArmTrackingValidity, and the
  Requirement 14 WorkspaceMapping contract.

  Requirement 13 does not stabilize positions or construct RobotTarget. The complete
  orchestration pipeline is:

    HumanArmPose + ArmCalibration + ArmTrackingValidity
      -> ArmDisplacement
      -> WorkspaceMapping
      -> WorkspacePosition
      -> Requirement 15 stabilization
      -> WorkspacePosition
      -> Requirement 12 RobotTarget construction

  TeleopMapper does not own StabilizationState or StabilizationConfig. The session
  orchestration layer composes mapping, stabilization, and RobotTarget construction.

  One selected arm is mapped per call. The mapping result is a WorkspacePosition in
  the normalized workspace defined by Requirement 14. A successful mapping result
  contains no timestamp, sequence, orientation, gripper, control, or robot data.

  The mapping boundary accepts side, pose, calibration, validity, and WorkspaceMapping.
  source timestamps and sequences are supplied later when the orchestration layer
  constructs RobotTarget from the stabilized WorkspacePosition.

  Scenario: A valid left arm produces one WorkspacePosition
    Given the selected side is "left"
    And the pose contains a usable left HumanArm
    And left tracking validity is valid
    And left calibration matches the selected side
    And the WorkspaceMapping is valid
    When TeleopMapper processes the input
    Then it produces one successful WorkspacePosition result
    And the result contains the normalized absolute workspace position
    And it does not produce a right-arm result

  Scenario: A valid right arm produces one WorkspacePosition
    Given the selected side is "right"
    And the pose contains a usable right HumanArm
    And right tracking validity is valid
    And right calibration matches the selected side
    And the WorkspaceMapping is valid
    When TeleopMapper processes the input
    Then it produces one successful WorkspacePosition result
    And the result contains the normalized absolute workspace position
    And it does not produce a left-arm result

  Scenario: Mapping uses calibrated hand-anchor displacement
    Given the selected arm is usable, valid, and calibrated
    When TeleopMapper processes the input
    Then it calculates ArmDisplacement from the current handAnchor and calibration reference handAnchor
    And it passes that displacement to WorkspaceMapping
    And it does not use raw camera coordinates as the workspace position
    And it does not substitute human joint angles for robot joint angles

  Scenario: Zero calibrated displacement maps through WorkspaceMapping
    Given the selected arm handAnchor equals its calibration reference handAnchor
    And tracking validity is valid
    And the WorkspaceMapping is valid
    When TeleopMapper processes the input
    Then it passes zero displacement to WorkspaceMapping
    And the resulting WorkspacePosition is returned unchanged

  Scenario: Non-zero calibrated displacement maps through WorkspaceMapping
    Given the selected arm has a finite non-zero calibrated displacement
    When TeleopMapper processes the input
    Then it obtains the WorkspacePosition only through WorkspaceMapping
    And Requirement 13 does not define or override axis, origin, scale, units, or bounds

  Scenario: Stabilization is composed after mapping, outside TeleopMapper
    Given TeleopMapper produces a successful WorkspacePosition
    And a StabilizationState and StabilizationConfig are available to orchestration
    When the orchestration layer stabilizes the WorkspacePosition
    Then it calls Requirement 15 with the selected ArmSide
    And it owns the returned StabilizationState
    And TeleopMapper does not own or update stabilization state

  Scenario: RobotTarget construction is composed after stabilization
    Given Requirement 15 produces a stabilized WorkspacePosition
    And the orchestration layer supplies the selected side, pose timestamp, and sequence
    When RobotTarget construction runs
    Then RobotTarget.position equals the stabilized WorkspacePosition
    And RobotTarget.sourceTimestamp equals pose.timestamp
    And RobotTarget.sequence equals the supplied sequence
    And the unstabilized WorkspacePosition is not used directly

  Scenario: The selected arm is unavailable
    Given the selected arm in HumanArmPose is null
    When TeleopMapper processes the input
    Then it returns a failed result with reason "arm-unavailable"
    And it does not produce a WorkspacePosition

  Scenario: Invalid selected-arm tracking is rejected
    Given the selected arm is present in HumanArmPose
    And the selected arm tracking validity is invalid
    When TeleopMapper processes the input
    Then it returns a failed result with reason "tracking-invalid"
    And it does not calculate displacement
    And it does not produce a WorkspacePosition

  Scenario: Calibration is required for the selected arm
    Given the selected arm is available and tracking validity is valid
    And calibration is null
    When TeleopMapper processes the input
    Then it returns a failed result with reason "not-calibrated"
    And it does not produce a WorkspacePosition

  Scenario: Calibration must match the selected side
    Given the selected side is "left"
    And the supplied calibration has side "right"
    When TeleopMapper processes the input
    Then it returns a failed result with reason "not-calibrated"
    And it does not produce a WorkspacePosition

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
    And the WorkspaceMapping cannot produce a valid WorkspacePosition
    When TeleopMapper processes the input
    Then it returns a failed result with reason "workspace-invalid"
    And it does not produce a WorkspacePosition

  Scenario: Non-finite displacement is rejected
    Given the selected arm is available, valid, and calibrated
    And the calculated displacement contains a non-finite value
    When TeleopMapper processes the input
    Then it returns a failed result with reason "mapping-invalid"
    And it does not produce a WorkspacePosition
    And it does not silently clamp the invalid value

  Scenario: Non-finite workspace position is rejected
    Given the selected arm is available, valid, and calibrated
    And WorkspaceMapping returns a position containing a non-finite value
    When TeleopMapper processes the input
    Then it returns a failed result with reason "mapping-invalid"
    And it does not produce a WorkspacePosition
    And it does not silently clamp the invalid value

  Scenario: Expected mapping failures are typed results
    Given tracking, calibration, displacement, or workspace input is invalid
    When TeleopMapper processes the input
    Then it returns a typed failed result
    And it does not throw for the expected failure

  Scenario: Staleness and control policy remain outside mapping
    When TeleopMapper is inspected
    Then it does not compare timestamps with a clock
    And it does not apply stale-input or tracking-loss timeout policy
    And it does not contain enabled, emergencyStop, or controlActive policy
    And Requirement 16 owns control enablement
    And Requirement 17 owns staleness and tracking-loss policy

  Scenario: TeleopMapper has no stabilization state or robot dependency
    When TeleopMapper dependencies are inspected
    Then they may include HumanArmPose, ArmCalibration, ArmTrackingValidity, ArmDisplacement, WorkspaceMapping, WorkspacePosition, and generic geometry
    And they do not include StabilizationState or StabilizationConfig
    And they do not include RobotTarget construction or RobotAdapter
    And they do not include NASA, iMETRO, CLR, UR10e, Hand-E, SO-101, ROS, ROS 2, MoveIt, MuJoCo, clr_ws, or servo protocols
    And they do not include screen, camera, UI, platform, or render modules

  Scenario: TeleopMapper does not define spatial or stabilization policy
    When TeleopMapper is inspected
    Then axis assignment, origin, scale, units, and workspace bounds are obtained through WorkspaceMapping
    And smoothing, dead zones, and stabilization state are obtained through Requirement 15
    And no such spatial or stabilization values are hard-coded in TeleopMapper
