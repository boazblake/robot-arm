Feature: Requirement 7 - Pure geometry operations
  Geometry is deterministic, pure, and independent of MediaPipe and application state.

  Scenario: Joint angle uses valid points
    Given three valid landmarks representing a joint and its two connected points
    When the joint-angle operation is called
    Then it returns the mathematically expected angle
    And the accepted tolerance is defined in the test or API contract
    And the returned angle uses the explicitly documented angle unit

  Scenario: Joint angle rejects incomplete input explicitly
    Given one or more required angle points are missing
    When the joint-angle operation is called
    Then it returns the documented invalid result or rejects the call
    And it does not return a plausible numeric angle
    And it does not throw an incidental null or undefined property error

  Scenario: Joint angle rejects invalid numeric input explicitly
    Given one or more angle coordinates are non-numeric, non-finite, or otherwise invalid
    When the joint-angle operation is called
    Then it returns the documented invalid result or rejects the call
    And the invalid input is not silently converted into a valid angle

  Scenario: Landmark distance is geometrically correct
    Given two valid landmarks with known coordinates
    When the distance operation is called
    Then it returns the Euclidean distance for those coordinates
    And the distance unit is the coordinate unit documented by the API

  Scenario: Identical landmarks have zero distance
    Given two landmarks with equal x, y, and z coordinates
    When the distance operation is called
    Then it returns exactly zero

  Scenario: Geometry has no side effects or platform dependency
    Given a geometry operation is called with the same inputs twice
    Then both results are equal
    And the operation does not access a store
    And the operation does not trigger a UI update
    And the operation does not import or require MediaPipe
