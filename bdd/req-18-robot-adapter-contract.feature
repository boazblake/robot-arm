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

Scenario: RobotAdapter.stop is global
Given a connected robot system has one or more controlled arms
When RobotAdapter.stop is requested
Then it requests the connected robot system to stop motion
And it does not require a per-arm stop request

Scenario: RobotAdapter.stop is idempotent
Given RobotAdapter.stop has already been requested
When RobotAdapter.stop is requested again
Then the repeated request is safe
And it does not create an unsafe duplicate motion command
