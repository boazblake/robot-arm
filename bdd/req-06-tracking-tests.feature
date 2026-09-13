Feature: Requirement 6 - Establish deterministic geometry and normalization tests

Core tracking transformations must be testable without a camera.

Scenario: Test framework exists
When repository scripts are inspected
Then a unit-test command exists
And the command runs without physical hardware

Scenario: Landmark normalization is tested
Given fixed MediaPipe-like input
When normalization runs
Then the expected TrackingFrame is produced

Scenario: Missing detections are tested
Given MediaPipe-like input contains no detection
When normalization runs
Then the corresponding TrackingFrame collection is empty

Scenario: Handedness is tested
Given fixed left-hand and right-hand detection data
When normalization runs
Then each hand is assigned to the expected collection

Scenario: Angle calculation is tested
Given three known points
When their joint angle is calculated
Then the expected angle is returned within a documented numeric tolerance

Scenario: Distance calculation is tested
Given two known points
When their distance is calculated
Then the expected distance is returned within a documented numeric tolerance

Scenario: Tests need no camera
When the complete unit-test suite runs
Then no physical camera is required

Scenario: Tests need no robot
When the complete unit-test suite runs
Then no robot hardware is required

---
