Feature: Requirement 12 - Repository structure
  Each responsibility has a predictable location and every directory has a current purpose.

  Scenario: Application startup and routing are located correctly
    Then startup code is under src/app/
    And routing code is under src/app/

  Scenario: Tracking UI is located in one documented feature location
    Then every tracking UI file is inside one feature directory
    And that directory has a descriptive name containing tracking
    And the directory is identified in ARCHITECTURE.md

  Scenario: Platform integrations use the required directory layout
    Then the platform integration root is src/platform/mediapipe/
    And the web implementation is inside src/platform/mediapipe/web/
    And the native implementation is inside src/platform/mediapipe/native/
    And no platform implementation is stored under src/domain/

  Scenario: Domain and shared code are separated
    Then geometry and tracking contracts are under src/domain/tracking/
    And human motion types are under src/domain/motion/
    And state is under src/stores/
    And if state is not under src/stores/, exactly one alternative owner is named in ARCHITECTURE.md
    And shared UI and utilities are under src/shared/
    And UI code is not stored in domain modules

  Scenario: Directories and legacy code are purposeful
    Given every repository directory is listed
    Then each directory has a current documented purpose
    And unused legacy code is removed
    And removal preserves Git history by normal version-control deletion rather than destructive history rewriting
