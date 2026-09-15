Feature: Requirement 10 - Human reference frame and calibration

Calibration establishes an explicit, robot-independent hand-anchor translation reference
for each usable human arm during the current teleoperation session.

Scenario: Calibration establishes a human reference for one usable arm
Given a HumanArmPose contains a structurally usable left arm
And calibration is not active robot control
When the left arm is explicitly calibrated
Then calibration succeeds
And an ArmCalibration contains side "left"
And its timestamp equals the HumanArmPose timestamp
And its reference is a snapshot of the left HumanArm

Scenario: One arm can be calibrated independently
Given a HumanArmPose contains a structurally usable right arm
And the other arm is unavailable
When the right arm is explicitly calibrated
Then calibration succeeds

Scenario: Calibration requires the requested arm
Given the requested arm is unavailable
When that arm is explicitly calibrated
Then calibration fails with reason "arm-unavailable"

Scenario: Calibration is explicit
Given tracking is active
And calibration has not been completed for the selected arm
When no explicit calibration action occurs
Then movement is not represented as calibrated control input

Scenario: Tracking-loss recovery may rebase calibration through orchestration
Given an arm was previously calibrated
And Requirement 17 reports stale or lost input
When valid tracking returns
Then orchestration may replace that arm's calibration reference with the current HumanArm
And the replacement is session-scoped
And the arm remains disabled until explicit control enablement

Scenario: Calibration is rejected during active robot control
Given the requested arm is usable
And robot control is active
When the arm is explicitly calibrated
Then calibration fails with reason "control-active"

Scenario: Recalibration replaces only the selected side
Given both arms have calibration references
And robot control is inactive
When the left arm is explicitly recalibrated
Then the new left reference replaces the old left reference
And the right reference is unchanged

Scenario: Reset returns only the selected side to uncalibrated
Given both arms have calibration references
And robot control is inactive
When left calibration is explicitly reset
Then left calibration is null
And right calibration is unchanged

Scenario: Reset is rejected during active robot control
Given the selected arm has calibration
And robot control is active
When calibration is explicitly reset
Then reset fails with reason "control-active"

Scenario: Movement is relative to the hand-anchor reference
Given calibration is complete for an arm
When a current HumanArm is available
Then displacement equals current.handAnchor minus reference.handAnchor
And the original coordinate system, units, and axes are preserved
And rotation and joint-angle changes are not calculated

Scenario: Equal hand anchors produce deterministic zero displacement
Given calibration is complete for an arm
When the current and reference hand anchors have equal coordinates
Then displacement is available
And displacement is exactly x 0, y 0, z 0

Scenario: Uncalibrated displacement is unavailable
Given calibration has not been completed for an arm
When displacement is calculated
Then displacement is unavailable with reason "not-calibrated"

Scenario: Tracking loss suppresses displacement without deleting calibration
Given calibration is complete for an arm
When that arm is unavailable in the current HumanArmPose
Then displacement is unavailable with reason "arm-unavailable"
And the calibration reference remains available

Scenario: Tracking recovery uses the existing reference
Given calibration is complete for an arm
And that arm was temporarily unavailable
When the arm becomes available again
Then displacement is calculated against the existing reference

Scenario: Calibration values are deeply readonly and session-scoped
When calibration values are created
Then CalibrationState, ArmCalibration, HumanArm, and ArmDisplacement are deeply readonly
And calibration is held in memory for the current teleoperation session only
And calibration is not persisted to storage

Scenario: Calibration is robot-independent
When calibration logic is inspected
Then it depends only on HumanArmPose, HumanArm, generic geometry, and calibration domain types
And it does not depend on RobotTarget, RobotAdapter, TeleopMapper, NASA, iMETRO, SO-101, ROS, MoveIt, or robot-control modules

Scenario: Calibration HUD markers use the camera projection
Given a calibration reference and current hand anchor are displayed over the camera view
When the front-camera preview is mirrored
Then the fixed calibration marker, current anchor marker, and connecting line use the same mirror transform as the camera and skeleton
And the line still represents current hand anchor minus calibration reference
