Feature: Requirement 3 - Create one tracking data contract

Application code must not depend directly on raw MediaPipe results.

Scenario: A landmark has one application type
When tracking types are inspected
Then a Landmark type exists
And Landmark contains numeric x
And Landmark contains numeric y
And Landmark contains numeric z
And Landmark can contain visibility when supplied

Scenario: A frame has one application type
When tracking types are inspected
Then a TrackingFrame type exists
And TrackingFrame contains a timestamp
And TrackingFrame contains pose landmarks
And TrackingFrame contains left-hand landmarks
And TrackingFrame contains right-hand landmarks
And TrackingFrame contains face landmarks if face tracking is retained

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

Scenario: Raw MediaPipe types remain inside the integration
When source imports are inspected
Then general application code does not import MediaPipe result types
And MediaPipe-specific types remain inside MediaPipe integration code

Scenario: Tracking domain types do not use any
When tracking domain types are inspected
Then Landmark does not use any
And TrackingFrame does not use any

---
