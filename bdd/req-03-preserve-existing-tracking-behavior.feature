Feature: Requirement 3 - Preserve existing tracking behavior
Stabilization preserves working pose, hand, face, camera, and rendering behavior.
  Refactoring may change implementation structure but not the required observable outputs.

  Scenario: Pose landmarks survive normalization
    Given a platform result contains one valid pose
    When the result is normalized
    Then TrackingFrame.pose contains that pose's landmarks in source index order
    And each retained landmark preserves x, y, and z
    And visibility is preserved when supplied

  Scenario: Missing pose produces an empty collection
    Given a platform result contains no pose
    When the result is normalized
    Then TrackingFrame.pose is an empty readonly collection
    And normalization does not throw because pose data is absent

  Scenario: Left and right hands retain identity
    Given a platform result contains one left hand and one right hand with handedness metadata
    When the result is normalized
    Then TrackingFrame.leftHand contains the left-hand landmarks
    And TrackingFrame.rightHand contains the right-hand landmarks
    And the two collections are not swapped

  Scenario Outline: One detected hand is represented without inventing the other hand
    Given only the <side> hand is detected
    When the result is normalized
    Then the <side> hand collection contains its landmarks
    And the <missing> hand collection is empty

    Examples:
      | side  | missing |
      | left  | right   |
      | right | left    |

  Scenario: Missing hands produce empty collections
    Given no hand is detected
    When the result is normalized
    Then TrackingFrame.leftHand is empty
    And TrackingFrame.rightHand is empty
    And normalization does not throw

  Scenario: Face landmarks survive normalization
    Given a platform result contains one face
    When the result is normalized
    Then TrackingFrame.face contains its landmarks in source index order

  Scenario: Missing face produces an empty collection
    Given no face is detected
    When the result is normalized
    Then TrackingFrame.face is empty
    And normalization does not throw

  Scenario: Web tracking still supports continuous frames
    Given the web camera is active
    And web MediaPipe initialization succeeded
    When successive video frames are processed
    Then successive TrackingFrame values can be produced without reinitializing MediaPipe for each frame

  Scenario: Native tracking remains callable through the Capacitor path
    Given a supported native build is available
    When the existing native tracking entry point is invoked
    Then native MediaPipe can return tracking data to the TypeScript application boundary
    Or the runtime result is reported as NOT VERIFIED when the native environment is unavailable

  Scenario: Front-camera display orientation remains explicit
    Given the front camera is selected
    When landmarks are rendered over the preview
    Then the preview and landmark overlay use the same documented mirror convention
    And stabilization does not silently change that convention

  Scenario: Existing tracking behavior has regression evidence
    When stabilization is complete
    Then deterministic tests cover normalization behavior
    And a runtime smoke check covers the web tracking start path when camera access is available
