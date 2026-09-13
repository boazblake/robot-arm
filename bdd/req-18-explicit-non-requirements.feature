Feature: Requirement 18 - Explicit non-requirements
  Stabilization does not expand into robotics implementation or a product-stack migration.

  Scenario: Robotics implementation remains out of scope
    Then no SO-101 driver is implemented
    And no servo communication is implemented
    And no Web Serial integration is implemented
    And no robot WebSocket integration is implemented
    And no inverse-kinematics implementation is implemented
    And no RobotMapper implementation is implemented
    And no Three.js dependency or implementation is added
    And no robot simulator is implemented

  Scenario: Existing product technologies remain in place
    Then the product is not visually redesigned
    And the product is not migrated away from Mithril
    And the product is not migrated away from Ionic
    And the product is not migrated away from Capacitor
    And the product is not migrated away from MediaPipe
