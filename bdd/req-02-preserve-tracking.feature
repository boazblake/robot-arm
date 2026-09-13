Feature: Requirement 2 - Preserve the useful tracking application

The cleanup must retain the working computer-vision foundation.

Scenario: Camera input remains available
Given the application is running on a supported platform
When the user starts tracking
Then the application can request camera access
And camera frames can enter the tracking pipeline

Scenario: Pose tracking remains available
Given camera input is active
When MediaPipe detects a person
Then pose landmarks are available to application code

Scenario: Hand tracking remains available
Given camera input is active
When MediaPipe detects a hand
Then hand landmarks are available to application code

Scenario: Two hands can remain distinct
Given MediaPipe detects two hands
When tracking results are processed
Then the application can distinguish the two detected hands

Scenario: Missing hands do not cause failure
Given MediaPipe detects no hands
When a frame is processed
Then processing completes without an exception
And the hand collections are empty

Scenario: Missing pose does not cause failure
Given MediaPipe detects no pose
When a frame is processed
Then processing completes without an exception
And the pose collection is empty

Scenario: Development landmark rendering remains available
Given tracking results exist
When the tracking view is active
Then detected landmarks can be drawn over the camera image

---
