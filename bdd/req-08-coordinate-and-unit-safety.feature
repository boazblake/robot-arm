Feature: Requirement 8 - Coordinate systems and unit safety
Coordinate spaces and angular units are explicit at every domain boundary.

  Scenario: Tracking coordinate convention is documented
    When the TrackingFrame contract documentation is inspected
    Then it states the meaning of x
    And it states the meaning of y
    And it states the meaning of z
    And it states whether image coordinates are normalized
    And it states the front-camera mirror convention
    And it states whether z uses MediaPipe-relative depth rather than metric distance

  Scenario: Pixel coordinates are not silently stored as normalized landmarks
    Given a value represents canvas pixels
    When it enters geometry intended for normalized TrackingFrame landmarks
    Then an explicit conversion is required
    Or the type boundary prevents that use

  Scenario: Angle units are explicit
    Given a geometry function returns an angle
    When another module consumes that result
    Then the function name, return type, or documented contract identifies degrees or radians
    And callers do not infer the unit from an undocumented number

  Scenario: Conversion between degrees and radians is explicit
    Given an angle crosses between degree-based and radian-based APIs
    When conversion occurs
    Then one named conversion operation performs it
    And the conversion is covered by a deterministic test when introduced

  Scenario: Tracking coordinates cannot be treated as future servo values by convention
    When TrackingFrame is inspected
    Then its numeric fields do not claim servo units
    And no stabilization code maps normalized landmark values directly to servo ticks
    And no stabilization code maps landmark angles directly to robot joint commands

  Scenario: Timestamp basis is explicit
    When TrackingFrame.timestamp is inspected
    Then documentation identifies its clock or epoch basis
    And all platform normalizers produce the documented basis
