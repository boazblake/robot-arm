Feature: Requirement 18 - Explicit stabilization non-requirements
Stabilization does not implement robotics, simulation, or unrelated product redesign.

  Scenario: No robot hardware control is added
    When production source and dependencies are inspected
    Then no servo command implementation is added
    And no serial robot protocol implementation is added
    And no SO-101-specific control implementation is added
    And no robot hardware SDK is added for future use

  Scenario: No robot mapping is added
    When production source is inspected
    Then no RobotMapper is defined
    And no human landmark to robot joint mapping is implemented
    And no robot joint limits are introduced as stabilization behavior
    And no inverse kinematics implementation is added

  Scenario: No transport for robot commands is added
    When production source is inspected
    Then no Web Serial robot transport is added
    And no WebSocket robot command transport is added
    And no Bluetooth robot command transport is added

  Scenario: No simulator is added
    When source and dependencies are inspected
    Then no robot simulator implementation is added
    And Three.js is not added solely for robot visualization
    And no URDF or SO-101 model is added solely for future simulation

  Scenario: No framework migration is performed
    When stabilization changes are inspected
    Then Mithril remains the application UI framework
    And Ionic remains unless confirmed unused by a separate approved decision
    And Capacitor remains for native integration
    And MediaPipe remains the tracking technology

  Scenario: No unrelated visual redesign is performed
    When UI changes are inspected
    Then visual changes exist only when required to preserve or verify stabilized behavior
    And stabilization does not introduce a new design system solely for aesthetic improvement

  Scenario: Future concepts may appear only in documentation
    Given HumanArmPose, RobotMapper, RobotTarget, Simulator, or PhysicalRobot is mentioned
    When the mention is inspected
    Then it is clearly identified as future work
    And the mention does not require a production placeholder implementation
