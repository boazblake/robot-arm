Feature: Requirement 19 - Browser to adapter transport

LiftMate communicates with an external adapter through bidirectional WebSocket transport.

Scenario: Browser sends RobotTarget
Given LiftMate is running in a browser
And the adapter is reachable
When RobotTarget is produced
Then LiftMate can send it over WebSocket

Scenario: Adapter sends RobotState
Given the adapter has robot state
When the state is available
Then the adapter can send RobotState over WebSocket

Scenario: Transport preserves semantics
Given RobotTarget crosses the transport boundary
When the adapter receives it
Then its intent remains equivalent

Scenario: Mobile uses the same contract
Given LiftMate runs on desktop or mobile
Then both platforms use the same RobotTarget transport contract
And neither requires local ROS 2
