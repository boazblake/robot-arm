Feature: Requirement 7 - Pure geometry operations
Generic geometry is independent of MediaPipe, UI, stores, fitness analysis, and robotics hardware.

  Scenario: Angle calculation returns a known right angle
    Given point A is at 1,0,0
    And vertex B is at 0,0,0
    And point C is at 0,1,0
    When the angle ABC is calculated in degrees
    Then the result is 90 within the documented floating-point tolerance

  Scenario: Angle calculation returns a straight angle
    Given point A is at -1,0,0
    And vertex B is at 0,0,0
    And point C is at 1,0,0
    When the angle ABC is calculated in degrees
    Then the result is 180 within the documented tolerance

  Scenario: Distance uses all three coordinates
    Given point A is at 0,0,0
    And point B is at 1,2,2
    When Euclidean distance is calculated
    Then the result is 3 within the documented tolerance

  Scenario: Distance from a point to itself is zero
    Given both distance operands have equal x, y, and z
    When distance is calculated
    Then the result is 0

  Scenario: Degenerate angle input has explicit behavior
    Given vertex B equals point A or point C
    When an angle is requested
    Then the function returns the documented invalid result
    And it does not silently return a plausible finite angle
    And the behavior is tested

  Scenario: Geometry is pure
    Given the same geometry inputs are supplied repeatedly
    When a geometry function runs
    Then it returns the same result each time
    And it does not mutate its inputs
    And it does not read an application store
    And it does not write an application store
    And it does not trigger a UI redraw
    And it does not access camera or MediaPipe state

  Scenario: Geometry has no robotics dependency
    When geometry imports are inspected
    Then no robot package is imported
    And no servo type is imported
    And no SO-101 type is imported
