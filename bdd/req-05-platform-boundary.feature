Feature: Requirement 5 - Web and native platform boundary
  Platform implementations are isolated from domain logic behind the TrackingFrame boundary.

  Scenario: Web selects the web adapter
    Given the application is running in the web platform
    When tracking is initialized
    Then the web MediaPipe implementation is selected
    And the native MediaPipe implementation is not selected

  Scenario: Capacitor selects the native adapter
    Given the application is running in Capacitor
    When tracking is initialized
    Then the native MediaPipe implementation is selected
    And the web MediaPipe implementation is not selected as the native implementation

  Scenario: Domain behavior is platform independent
    Given identical TrackingFrame values produced by web and native adapters
    When domain logic consumes them
    Then domain logic produces the same result
    And it cannot determine which platform produced the frame from the domain contract

  Scenario: Domain modules contain no platform imports
    Given every module under the domain boundary is inspected
    Then no domain module imports a package matching @mediapipe/*
    And no domain module imports a package matching @capacitor/*
    And no domain module imports camera-preview
    And no domain module imports browser APIs
    And no domain module imports native plugin APIs
