Feature: Requirement 20 - RobotState and feedback

Robot feedback is represented upstream without exposing implementation-specific types.

Scenario: Adapter exposes robot state
Given an external system provides current robot state
When the adapter receives it
Then it exposes a robot-independent RobotState

Scenario: Requested and actual state differ
Given LiftMate requested a RobotTarget
And the external system reports current state
Then LiftMate does not treat requested state as actual state

Scenario: Feedback contains freshness information
When RobotState is produced
Then its timing is sufficient to evaluate freshness

Scenario: External types stop at the adapter
When RobotState crosses upstream
Then ROS, MoveIt, MuJoCo, and target-specific types do not cross the boundary
