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

Scenario: Demonstration remains robot-independent in LiftMate
When the complete demonstration is inspected
Then LiftMate produces robot-independent intent
And the external adapter handles NASA translation
And clr_ws remains an external unmodified system
