Feature: Requirement 29 - NASA manipulation task

The first integration experiment demonstrates live human teleoperation of NASA CLR.

Scenario: External adapter integration works independently
Given clr_ws is running locally
And the iMETRO adapter is running separately
And LiftMate is not running
When a valid test RobotTarget is submitted
Then the adapter translates it
And the simulated CLR system moves toward the requested target

Scenario: LiftMate reaches CLR through the adapter
Given clr_ws is running locally
And the iMETRO adapter is connected
And LiftMate is running
When LiftMate sends a valid RobotTarget
Then the adapter receives it
And the target reaches the NASA control stack

Scenario: Human hand state completes manipulation
Given live tracking and teleoperation are enabled
And a supported CLR manipulation object is available
When the operator maps hand movement and performs the configured closing action
Then the simulated CLR system receives end-effector and gripper intent
And the object can be manipulated

Scenario: Physical NASA hardware is not used
When the experiment is run
Then it does not connect to NASA networks
And it does not attempt to control NASA physical robots
