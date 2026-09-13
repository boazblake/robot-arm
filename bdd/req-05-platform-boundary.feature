Feature: Requirement 5 - MediaPipe and platform boundary
Platform-specific APIs are isolated from domain and platform-independent application logic.

  Scenario: Web MediaPipe has a defined integration location
    When the stabilized source tree is inspected
    Then web MediaPipe initialization and raw-result conversion have one documented platform integration location

  Scenario: Native MediaPipe has a defined integration location
    When the stabilized source tree is inspected
    Then Capacitor MediaPipe integration and native-result conversion have one documented platform integration location

  Scenario: Domain code has no MediaPipe dependency
    When imports under the domain tracking and geometry locations are inspected
    Then none imports @mediapipe packages
    And none imports a MediaPipe result type from application platform code

  Scenario: Domain code has no Capacitor dependency
    When imports under domain code are inspected
    Then none imports @capacitor packages
    And none imports camera-preview packages
    And none imports the native MediaPipe plugin

  Scenario: Platform-independent consumers cannot distinguish the producer
    Given equivalent web and native detections are normalized
    When a platform-independent consumer receives either value
    Then both values satisfy the same TrackingFrame contract
    And the consumer needs no platform discriminator to read tracking coordinates

  Scenario: Platform selection remains outside domain logic
    When the code deciding web versus native tracking is inspected
    Then that decision is not made inside geometry functions
    And that decision is not made inside tracking domain types

  Scenario: Raw platform results do not escape by side channel
    When application stores, service APIs, and event payloads are inspected
    Then no long-lived platform-independent state exposes raw MediaPipe result objects as its public tracking contract
