Feature: Requirement 30 - Split-screen operator interface

The first product demonstration presents the operator and external robot views with minimal operational UI.

Scenario: Operator and robot views are visible
Given teleoperation is running
Then the human camera view is visible
And the NASA simulation view is visible

Scenario: Views may be split screen
Given the NASA simulation is available
When the teleoperation interface is opened
Then the operator and robot views may be displayed together

Scenario: Status remains minimal
When the primary interface is displayed
Then only information required for safe operation is prominent
And experiment analytics do not require charts or large metric panels

Scenario: Front-camera preview and camera-space overlays share one projection
Given the front camera preview is mirrored for selfie-style operation
When human landmarks or calibration markers are drawn over the camera view
Then video, skeleton, landmark markers, and calibration lines use the same mirror transform
And camera-space overlays remain aligned with the tracked person
And anatomical left and right labels remain anatomically named

Scenario: Camera mirroring does not affect workspace coordinates
Given a front-camera preview is mirrored
When a WorkspacePosition or stabilized WorkspacePosition is displayed
Then its normalized x, y, and z values are unchanged
And the workspace visualization remains independent of camera and screen dimensions

Scenario: Camera overlays do not obscure the tracked arms
Given the human camera view is the primary interface
When diagnostic overlays are displayed
Then overlays remain compact
And the operator's shoulders, elbows, wrists, and hand anchors remain visible
And the interface remains usable on mobile

Scenario: Demonstration remains robot-independent in LiftMate
When the complete demonstration is inspected
Then LiftMate produces robot-independent intent
And the external adapter handles NASA translation
And clr_ws remains an external unmodified system
