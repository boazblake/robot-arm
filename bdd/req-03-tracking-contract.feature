Feature: Requirement 3 - Create one tracking data contract

TrackingFrame is an immutable, runtime-validated, index-preserving representation of one MediaPipe tracking frame. It preserves MediaPipe coordinate semantics while removing MediaPipe-specific types from downstream application code.

Scenario: A landmark has one application type
When tracking types are inspected
Then a Landmark type exists
And Landmark is readonly
And Landmark contains numeric x
And Landmark contains numeric y
And Landmark contains numeric z
And Landmark can contain visibility when supplied

Scenario: Landmark coordinates preserve MediaPipe semantics
When the Landmark contract is inspected
Then x uses normalized MediaPipe landmark coordinates
And y uses normalized MediaPipe landmark coordinates
And z preserves MediaPipe depth semantics
And z is not represented as a real-world distance
And XYZ values are not clamped by this contract

Scenario: A frame has one application type
When tracking types are inspected
Then a TrackingFrame type exists
And TrackingFrame is readonly
And TrackingFrame contains an epoch-millisecond timestamp
And TrackingFrame contains pose landmarks
And TrackingFrame contains left-hand landmarks
And TrackingFrame contains right-hand landmarks
And TrackingFrame contains face landmarks
And every landmark collection is readonly

Scenario: Missing detections use empty collections
Given a tracking category has no detection
When TrackingFrame is created
Then that category contains an empty collection
And it does not contain null
And it does not contain undefined

Scenario: MediaPipe results are normalized
Given MediaPipe produces a tracking result
When the result enters application tracking code
Then it is converted to TrackingFrame
And downstream application code consumes TrackingFrame
And MediaPipe-specific result types do not cross the boundary

Scenario: The frame timestamp is established once
Given a capture-frame timestamp is available
When TrackingFrame is created
Then timestamp contains that capture-frame timestamp in epoch milliseconds
And downstream code does not replace it

Scenario: The integration supplies a fallback timestamp
Given a capture-frame timestamp is unavailable
When TrackingFrame is created
Then timestamp contains the integration-boundary time in epoch milliseconds
And downstream code does not replace it

Scenario: Landmark indices are preserved
Given a tracking category contains indexed landmarks
When the category is normalized
Then each valid landmark remains at its original index
And no landmark is shifted because another landmark is invalid

Scenario: A malformed landmark rejects its category
Given an individual landmark has missing coordinates
Or an individual landmark has a non-numeric coordinate
Or an individual landmark has NaN coordinates
Or an individual landmark has infinite coordinates
When the category is normalized
Then the entire category becomes an empty collection
And no individual landmark is dropped while retaining the category

Scenario: Malformed timestamps are rejected safely
Given a tracking result has a missing timestamp
Or a non-numeric timestamp
Or a NaN timestamp
Or an infinite timestamp
When the result is normalized
Then the integration uses the documented boundary-time fallback
And the resulting timestamp is finite epoch milliseconds

Scenario: Handedness assignment remains in the integration
Given a hand result has reliable handedness
When MediaPipe results are normalized
Then the integration assigns the hand to the corresponding left or right collection

Scenario: Unreliable handedness is not guessed
Given a hand result has missing, ambiguous, or unreliable handedness
When MediaPipe results are normalized
Then the integration does not guess the hand identity
And the corresponding hand collection remains empty

Scenario: Runtime validation protects the boundary
When normalization tests are inspected
Then tests cover NaN coordinates
And tests cover infinite coordinates
And tests cover missing coordinates
And tests cover malformed landmark arrays
And tests cover malformed timestamps

Scenario: Raw MediaPipe types remain inside the integration
When source imports are inspected
Then general application code does not import MediaPipe result types
And MediaPipe-specific types remain inside MediaPipe integration code

Scenario: Tracking domain and integration code do not use any
When tracking source is inspected
Then Landmark does not use any
And TrackingFrame does not use any
And tracking integration code does not use any
And tracking fixtures do not use any
And unknown third-party data is narrowed through runtime validation
