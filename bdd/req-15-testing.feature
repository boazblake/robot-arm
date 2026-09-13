Feature: Requirement 15 - Deterministic automated testing
  Tests verify tracking and geometry without physical hardware.

  Scenario: Select the test framework
    Given an existing test framework is configured and can execute the repository test suite
    Then that framework is used

  Scenario: Add Vitest only when no suitable framework exists
    Given no existing test framework is configured and able to execute the repository test suite
    Then Vitest is used
    And a second test framework is not added

  Scenario: Test every required deterministic behavior
    Then tests exist for landmark normalization
    And tests exist for web result normalization
    And tests exist for native result normalization
    And tests exist for angle calculation
    And tests exist for distance calculation
    And tests exist for missing landmarks
    And tests exist for handedness normalization

  Scenario: Fixtures produce stable TrackingFrame values
    Given fixed MediaPipe-like input fixtures
    When normalization tests run repeatedly
    Then each fixture produces the same TrackingFrame values on every run
    And expected values are asserted for timestamp and each tracking collection

  Scenario: Tests run without physical dependencies
    When the complete unit-test suite runs in a clean non-device environment
    Then it does not require a camera
    And it does not require a robot
    And it does not require live MediaPipe input
    And it exits successfully only when all assertions pass

  Scenario: Do not add unrequired Cypress coverage
    Given no demonstrated browser-automation requirement exists
    Then Cypress is not added
