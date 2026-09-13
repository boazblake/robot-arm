Feature: Requirement 4 - Separate tracking responsibilities

The current large tracking implementation must be divided into focused responsibilities.

Scenario: Camera code has one location
When source structure is inspected
Then camera acquisition and camera lifecycle code have one clear source location

Scenario: MediaPipe integration has one location
When source structure is inspected
Then MediaPipe initialization and inference code have one clear source location

Scenario: Result normalization is separate
When source structure is inspected
Then conversion from MediaPipe results to TrackingFrame is testable without starting a camera

Scenario: Rendering is separate
When source structure is inspected
Then canvas drawing code is separate from MediaPipe inference
And rendering code does not perform exercise analysis

Scenario: Geometry is separate
When source structure is inspected
Then generic angle and distance calculations are separate from MediaPipe initialization
And geometry functions do not access UI state
And geometry functions do not access camera state

Scenario: Tracking contains no fitness analysis
When tracking modules are inspected
Then they contain no rep counting
And they contain no exercise classification
And they contain no coaching cues
And they contain no squat state
And they contain no press state
And they contain no workout session state

---
