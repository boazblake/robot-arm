Feature: Requirement 8 - Coordinate and unit safety
  Coordinate systems and measurement units are explicit and cannot be confused.

  Scenario: MediaPipe normalized-coordinate convention is documented
    Given the tracking documentation is inspected
    Then it states that MediaPipe x and y coordinates use normalized image coordinates
    And it states how z is interpreted
    And it states the valid or expected range for each normalized coordinate
    And it identifies any conversion required before another coordinate system is used

  Scenario: Angle units are explicit
    Given an API or type exposes an angle
    Then its unit is explicitly named, typed, or documented
    And a consumer can distinguish degrees from radians without guessing

  Scenario: Normalized coordinates cannot silently become servo positions
    Given a value crosses from normalized tracking coordinates toward motion or hardware code
    Then an explicit conversion boundary is present
    And the value is not passed as a servo position without conversion
    And the conversion documents source units and destination units

  Scenario: Distinct units are not ambiguous generic numbers
    Given coordinates, angles, distances, ranges, or servo positions are represented
    Then each distinct unit has a distinct name, type, or documented contract
    And no consumer must infer the unit from an unqualified number
