Feature: Requirement 17 - Stale input and tracking loss

Tracking loss and stale intent fail safely without stopping local tracking recovery.

Scenario: Tracking loss stops executable targets
Given teleoperation is active
When required tracking is lost
Then new executable RobotTargets stop
And tracking continues attempting recovery

Scenario: Stale targets are rejected
Given a RobotTarget exceeds the configured stale-input timeout
When it reaches the adapter
Then the adapter rejects it
And does not extrapolate movement

Scenario: Recovery does not cause a jump
Given tracking was lost
And the operator moved while unavailable
When tracking returns
Then recovery does not create an uncontrolled displacement

Scenario: Safe state is explicit
When extended tracking loss occurs
Then the control system stops issuing new movement commands
And requests controlled motion stop through the adapter
