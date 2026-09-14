Feature: Requirement 12 - RobotTarget contract

RobotTarget is the robot-independent contract for desired manipulation intent.

Scenario: RobotTarget represents desired position
Given a valid mapped manipulation intent exists
When RobotTarget is produced
Then it contains a desired end-effector position

Scenario: RobotTarget may represent orientation
Given sufficient orientation information exists
When RobotTarget is produced
Then it may contain desired orientation

Scenario: RobotTarget may represent gripper intent
Given valid hand-state information exists
When RobotTarget is produced
Then it may contain robot-independent gripper intent

Scenario: RobotTarget contains freshness information
When RobotTarget is produced from live input
Then it contains timing information sufficient to detect stale intent

Scenario: RobotTarget exposes no implementation details
When RobotTarget is inspected
Then it contains no ROS, MoveIt, MuJoCo, NASA, CLR, UR10e, or SO-101 types
