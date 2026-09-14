Feature: Requirement 25 - CLR manipulation and gripper

The CLR demonstration supports mapped end-effector and gripper intent without changing NASA source.

Scenario: CLR target is the complete system
When the NASA target is configured
Then it identifies ChonkUR L. Rail-E, or CLR
And its components include the linear rail, vertical lift, UR10e, and Hand-E gripper

Scenario: Gripper intent is robot-independent upstream
Given RobotTarget contains gripper intent
Then it contains no Hand-E motor commands

Scenario: Adapter translates gripper intent
Given a valid gripper intent reaches iMETRO
When it is translated
Then the configured CLR gripper receives the corresponding request

Scenario: NASA source remains unmodified
When CLR manipulation is demonstrated
Then no clr_ws source patch is required
