Feature: Requirement 4 - Platform-independent TrackingFrame contract
  All platform-specific tracking output is converted to one exact domain contract.

  Scenario: Landmark has the required shape
    Given a domain Landmark value is constructed
    Then it has numeric x, numeric y, and numeric z properties
    And it may have a visibility property
    And when visibility is present it is numeric
    And it has no required platform-specific property

  Scenario: TrackingFrame has the required shape and immutability
    Given a domain TrackingFrame value is constructed
    Then it has a timestamp property
    And it has a pose property
    And it has a readonly leftHand property
    And it has a readonly rightHand property
    And it has a readonly face property
    And pose, leftHand, rightHand, and face are readonly at the TypeScript contract level

  Scenario: Web output crosses the boundary as TrackingFrame
    Given the web MediaPipe adapter receives a tracking result
    When the adapter returns its value
    Then the value is a TrackingFrame
    And all four collections use the domain Landmark shape
    And no raw web MediaPipe result is exposed

  Scenario: Native output crosses the boundary as TrackingFrame
    Given the native MediaPipe adapter receives a tracking result
    When the adapter returns its value
    Then the value is a TrackingFrame
    And all four collections use the domain Landmark shape
    And no raw native MediaPipe result is exposed

  Scenario: Consumers depend only on TrackingFrame
    Given a consumer processes tracking data
    Then its input contract is TrackingFrame
    And it does not require a raw MediaPipe result type
