Feature: Requirement 4 - Platform-independent TrackingFrame contract
Application tracking data uses one explicit contract after platform normalization.

  Scenario: Landmark has the required coordinate fields
    When the Landmark type is inspected
    Then x is a number
    And y is a number
    And z is a number
    And visibility is an optional number
    And Landmark contains no MediaPipe class or interface dependency

  Scenario: TrackingFrame has one timestamp and four tracking collections
    When the TrackingFrame type is inspected
    Then timestamp is a number with a documented time basis
    And pose is a readonly Landmark collection
    And leftHand is a readonly Landmark collection
    And rightHand is a readonly Landmark collection
    And face is a readonly Landmark collection

  Scenario: Empty detection is represented by empty collections
    Given a valid processed frame contains no detected subject
    When a TrackingFrame is produced
    Then pose is empty
    And leftHand is empty
    And rightHand is empty
    And face is empty
    And no collection uses null to mean no detection

  Scenario: Web output crosses the boundary as TrackingFrame
    Given web MediaPipe returns a valid result
    When the result leaves the web platform integration layer
    Then application consumers receive TrackingFrame
    And consumers do not require the raw web MediaPipe result

  Scenario: Native output crosses the boundary as TrackingFrame
    Given native MediaPipe returns a valid result
    When the result leaves the native platform integration layer
    Then application consumers receive TrackingFrame
    And consumers do not require the raw native plugin result

  Scenario: TrackingFrame does not contain robot concepts
    When the TrackingFrame contract is inspected
    Then it contains no servo identifier
    And it contains no robot joint identifier
    And it contains no robot angle limit
    And it contains no RobotMapper
    And it contains no SO-101-specific field

  Scenario: Contract conversion does not mutate platform results
    Given a platform result object is supplied for normalization
    When TrackingFrame is produced
    Then normalization does not require mutation of the supplied platform result
