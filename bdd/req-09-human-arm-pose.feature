Feature: Requirement 9 - HumanArmPose

HumanArmPose is a concrete robot-independent representation of tracked human arm movement.

Scenario: Valid arm landmarks produce HumanArmPose
Given a TrackingFrame contains valid shoulder landmarks
And valid elbow landmarks
And valid wrist landmarks
And valid hand landmarks
When the frame is processed
Then a valid HumanArmPose is produced

Scenario: HumanArmPose represents human anatomy
When HumanArmPose is inspected
Then it represents human arm joints and hand state
And it contains no robot joint identifiers
And it contains no external robotics types

Scenario: Invalid tracking cannot produce valid HumanArmPose
Given a required arm landmark is missing or invalid
When the frame is processed
Then HumanArmPose is rejected as invalid

Scenario: HumanArmPose does not require later boundaries
When HumanArmPose dependencies are inspected
Then it does not depend on RobotTarget
And it does not depend on TeleopMapper
