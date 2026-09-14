Feature: Requirement 23 - RobotTarget to NASA control

The iMETRO adapter translates RobotTarget into NASA CLR control requests.

Scenario: Valid target reaches CLR
Given clr_ws is running
And the iMETRO adapter is connected
When a valid RobotTarget is submitted
Then the adapter translates it for the CLR control interface

Scenario: LiftMate does not solve NASA geometry
When LiftMate source is inspected
Then it contains no UR10e link geometry
And no CLR rail, lift, or Hand-E geometry

Scenario: Robot solving remains downstream
Given RobotTarget specifies desired end-effector intent
When it reaches the NASA stack
Then NASA control facilities perform robot-specific solving
And LiftMate does not calculate UR10e motor angles

Scenario: Unreachable targets fail observably
Given a target is unreachable
When NASA control evaluates it
Then arbitrary replacement motion is not generated
And failure is observable upstream
