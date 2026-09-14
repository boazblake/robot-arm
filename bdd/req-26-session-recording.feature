Feature: Requirement 26 - Session recording

Teleoperation sessions can record correlated human input, targets, and feedback.

Scenario: Human input is recorded
Given teleoperation is active
When recording is enabled
Then relevant tracking state is recorded with timing information

Scenario: Robot targets are recorded
Given RobotTargets are produced
When recording is enabled
Then targets are recorded with timing information

Scenario: Robot feedback is recorded
Given RobotState is received
When recording is enabled
Then feedback is recorded with timing information

Scenario: Recorded streams are correlatable
Given a session is complete
Then human input, robot intent, and robot response can be correlated by time
