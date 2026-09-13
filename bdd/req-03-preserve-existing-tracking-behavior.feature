Feature: Requirement 3 - Preserve existing tracking behavior
  Tracking normalization preserves the existing observable behavior for pose, hands, and face.

  Scenario: A detected pose is normalized
    Given a MediaPipe-like result contains a detected pose landmark list
    When the pose result crosses the tracking boundary
    Then each returned pose landmark is represented by normalized landmark data
    And x, y, and z are numeric values
    And any supplied visibility is numeric
    And no raw MediaPipe result object is returned to application consumers

  Scenario: No pose produces an empty collection and no exception
    Given a result contains no pose
    When pose processing is called
    Then the returned pose collection contains zero landmarks
    And the call completes without throwing
    And the returned value has the same collection shape as a detected pose result

  Scenario: Both detected hands are assigned by handedness
    Given a result contains one left hand and one right hand
    When hand processing is called
    Then the left-hand collection contains only the left hand landmarks
    And the right-hand collection contains only the right hand landmarks
    And the left and right hands are not swapped
    And each hand's landmarks are normalized

  Scenario: One detected hand is assigned to the correct side
    Given a result contains exactly one detected hand
    And that hand is labeled left
    When hand processing is called
    Then the left-hand collection contains that hand
    And the right-hand collection is empty
    When the same case is evaluated with the label right
    Then the right-hand collection contains that hand
    And the left-hand collection is empty

  Scenario: No detected hands produce two empty collections
    Given a result contains no hands
    When hand processing is called
    Then the left-hand collection is empty
    And the right-hand collection is empty
    And the call completes without throwing

  Scenario: A detected face is normalized
    Given a MediaPipe-like result contains detected face landmarks
    When face processing is called
    Then each returned face landmark is a normalized face landmark
    And its coordinates are numeric
    And no raw MediaPipe result object is returned to application consumers

  Scenario: No detected face produces an empty collection and no exception
    Given a result contains no face
    When face processing is called
    Then the returned face collection contains zero landmarks
    And the call completes without throwing
