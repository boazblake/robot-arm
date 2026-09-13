Feature: Requirement 9 - HumanArmPose boundary
  Human motion is modeled independently from robot hardware.

  Scenario: HumanArmPose exposes the required motion fields
    Given the HumanArmPose contract is inspected
    Then it contains shoulderYaw
    And it contains shoulderPitch
    And it contains elbowFlexion
    And it contains wristPitch
    And it contains wristRoll
    And it contains grip
    And the unit for each of the six fields is documented
    And the allowed range for each bounded field is documented
    And each field without a bounded range is explicitly documented as unbounded or not applicable

  Scenario: HumanArmPose is robot independent
    Given HumanArmPose is imported by domain code
    Then it does not import SO-101 types
    And it does not import servo types
    And it does not import robot drivers or hardware APIs
    And its fields describe human motion rather than a specific robot

  Scenario: Conversion has a defined future location but is not implemented
    Given the architecture is inspected
    Then it identifies the future module or boundary for TrackingFrame to HumanArmPose conversion
    And no TrackingFrame to HumanArmPose conversion is implemented as part of stabilization
    And no RobotMapper is implemented as part of stabilization
