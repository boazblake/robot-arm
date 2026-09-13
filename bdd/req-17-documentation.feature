Feature: Requirement 17 - Current and minimal repository documentation
Documentation describes the stabilized repository as it exists after the change.

  Scenario: README identifies the current project purpose
    When README is inspected
    Then it states that Lift-Mate provides camera and MediaPipe tracking as the current foundation
    And it states that robotics control is future work
    And it does not claim an SO-101 driver exists
    And it does not claim a robot simulator exists

  Scenario: README provides reproducible web setup
    When a new developer reads README
    Then prerequisites are listed
    And the install command is listed
    And the dev command is listed
    And the build command is listed
    And the typecheck command is listed
    And the test command is listed
    And the lint command is listed

  Scenario: README distinguishes web and native paths
    When platform documentation is inspected
    Then web MediaPipe behavior is identified
    And Capacitor native behavior is identified
    And native build requirements are not presented as required for ordinary web development

  Scenario: ARCHITECTURE describes actual source ownership
    When ARCHITECTURE.md is compared with the source tree
    Then active application bootstrap is documented
    And tracking platform integration is documented
    And TrackingFrame ownership is documented
    And geometry ownership is documented
    And application state ownership is documented

  Scenario: ARCHITECTURE documents the tracking data flow
    When ARCHITECTURE.md is inspected
    Then it shows Camera to MediaPipe to platform normalization to TrackingFrame
    And it identifies TrackingFrame as the stabilization boundary
    And future HumanArmPose and RobotMapper stages are clearly marked as not implemented

  Scenario: Stale documents are not authoritative by accident
    Given a planning or agent document conflicts with README or ARCHITECTURE
    When stabilization is complete
    Then the stale document is updated, removed, or explicitly marked historical
    And there is one documented source of truth for current architecture

  Scenario: Documentation does not duplicate volatile implementation detail without need
    When documentation is inspected
    Then it explains contracts, boundaries, commands, and ownership
    And it does not require a manually maintained exhaustive list of internal functions
