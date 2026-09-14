Feature: Requirement 16 - Control enablement and emergency stop

Robot command transmission requires explicit operator control.

Scenario: Tracking does not enable control
Given LiftMate is tracking
And teleoperation is disabled
When the operator moves
Then no executable target is sent

Scenario: Teleoperation requires explicit activation
Given valid tracking exists
When the operator enables teleoperation
Then valid movement may produce external commands

Scenario: Emergency stop disables transmission
Given teleoperation is active
When emergency stop is requested
Then new movement commands stop immediately
And the control state becomes stopped

Scenario: Recovery requires explicit re-enable
Given emergency stop occurred
When tracking becomes valid again
Then teleoperation remains stopped until explicitly re-enabled
