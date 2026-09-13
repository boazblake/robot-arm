Feature: Requirement 15 - Deterministic automated testing
Automated tests prove domain and normalization behavior without cameras, robots, or live MediaPipe services.

  Scenario: One unit-test framework is authoritative
    Given a suitable unit-test framework already executes repository tests
    When stabilization is complete
    Then that framework remains authoritative
    And a second unit-test framework is not added without a documented requirement

  Scenario: Vitest is used when no suitable framework exists
    Given no suitable unit-test framework exists
    When test infrastructure is added
    Then Vitest is configured as the unit-test framework
    And the documented test command runs it

  Scenario: Landmark normalization is tested
    Given deterministic platform-like landmark fixtures
    When normalization tests run
    Then valid x, y, z, and optional visibility values are asserted
    And missing detections are asserted as empty collections
    And malformed required coordinates are tested

  Scenario: Web result normalization is tested
    Given representative web MediaPipe-like results
    When the web normalizer runs
    Then expected TrackingFrame pose, face, leftHand, and rightHand collections are asserted

  Scenario: Native result normalization is tested
    Given representative native plugin result shapes supported by the application
    When the native normalizer runs
    Then expected TrackingFrame collections are asserted
    And supported alternate field names are covered when they remain required

  Scenario: Handedness normalization is tested
    Given left and right hand fixtures with handedness metadata
    When normalization runs
    Then left and right collections are asserted separately
    And a regression that swaps them causes test failure

  Scenario: Geometry is tested with exact known cases
    When geometry tests run
    Then a 90 degree angle case is asserted
    And a 180 degree angle case is asserted
    And a known 3D distance case is asserted
    And zero distance is asserted
    And degenerate angle behavior is asserted

  Scenario: Fixtures are deterministic
    Given a fixed test fixture
    When the same test runs repeatedly
    Then expected TrackingFrame values do not depend on current wall-clock time
    And expected values do not depend on network access
    And expected values do not depend on camera access

  Scenario: Unit tests require no physical hardware
    When the complete unit-test suite runs
    Then no camera is required
    And no robot is required
    And no serial device is required
    And no native mobile device is required

  Scenario: Stabilization tests are enabled
    When test source is inspected
    Then no required stabilization test uses skip
    And no required stabilization test uses todo
    And no required stabilization test uses only

  Scenario: Cypress is not added without a browser-automation requirement
    Given no approved stabilization scenario requires browser automation
    When dependencies are inspected
    Then Cypress is not added solely as future preparation
