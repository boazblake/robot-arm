Feature: Requirement 18 - RobotAdapter contract

Robot adapters consume RobotTarget without redefining the teleoperation domain.

Scenario: An adapter consumes RobotTarget
Given an external robot adapter is connected
When it receives a valid RobotTarget
Then it translates that target for its robot interface

Scenario: Adapter boundaries are replaceable
Given another robot supports compatible intent
When another adapter is implemented
Then HumanArmPose and TeleopMapper require no robot-specific changes

Scenario: Adapter does not perform human tracking
When an adapter is inspected
Then it does not use MediaPipe
And it does not process camera frames
And it does not calculate HumanArmPose

Scenario: Adapter failure is isolated
Given LiftMate tracking is operational
When an adapter fails
Then tracking remains operational
And no command is reported as executed
