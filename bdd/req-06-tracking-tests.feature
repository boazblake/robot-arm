Feature: Requirement 6 - Own deterministic tracking tests

Requirement 3 defines tracking contract behavior. Requirement 5 proves supported
platform integrations remain connected. Requirement 6 verifies deterministic,
platform-neutral behavior with automated tests.

Scenario: The authoritative one-run test command exists
When repository scripts are inspected
Then `npm test` runs the deterministic unit suite once
And `npm run test:unit` remains available for local watch-mode development

Scenario: Normalization tests verify the Requirement 3 contract
Given fixed MediaPipe-like input
When normalization tests run
Then they assert timestamp
And they assert poseLandmarks
And they assert leftHandLandmarks
And they assert rightHandLandmarks
And they assert faceLandmarks
And they assert XYZ preservation
And they assert empty collections
And they assert immutability
And they assert landmark index preservation

Scenario: Missing detections are distinguished from malformed input
Given a category is missing, undefined, null, empty, or contains `[[]]`
When normalization runs
Then that category becomes an empty collection
Given a category contains malformed non-empty landmark data
When normalization runs
Then that category becomes empty
And other valid categories remain preserved

Scenario: Handedness follows the Requirement 3 rules
Given fixed hand detection data
When normalization runs
Then valid Left is assigned to the left collection
And valid Right is assigned to the right collection
And missing, ambiguous, unknown, or low-confidence identity assigns neither collection
And contradictory duplicate assignments are rejected as ambiguous

Scenario: Nested MediaPipe shapes normalize deterministically
Given fixed nested pose, hand, and face detector results
When the platform-neutral adapter normalization runs
Then one TrackingFrame is produced
And no camera or detector runtime is started

Scenario: Geometry uses documented deterministic conventions
Given three known points
When their joint angle is calculated
Then the expected angle in degrees is returned within a tolerance of `1e-9`
Given two known points
When their distance is calculated
Then Euclidean distance in the supplied coordinate space is returned within `1e-9`
And distance is not described as a physical or meter measurement
And an absent z coordinate is treated as zero

Scenario: Deterministic tests isolate hardware and network dependencies
When the deterministic test suite runs
Then it does not require a physical camera
And it does not require `CameraPreview`
And it does not require `navigator.mediaDevices`
And it does not require the native Capacitor runtime
And it does not require robot hardware
And it does not require NASA `clr_ws`
And it does not require robot adapters
And it does not require network access

Scenario: Detector failure can be tested without real model loading
Given a deterministic adapter receives missing or invalid detector output
When normalization runs
Then it produces a safe TrackingFrame with empty affected collections
And no real MediaPipe model-loading failure is required

Scenario: The deterministic test suite passes
When `npm test` runs
Then the command exits with code 0
And no physical camera is required
And no robot hardware is required
And no network access is required
