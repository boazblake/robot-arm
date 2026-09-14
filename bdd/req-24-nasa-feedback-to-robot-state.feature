Feature: Requirement 24 - NASA feedback to RobotState

NASA-specific feedback is translated into RobotState by the adapter.

Scenario: NASA state becomes RobotState
Given clr_ws provides current robot state
When the adapter receives it
Then it exposes a robot-independent RobotState

Scenario: NASA types remain downstream
When feedback is translated
Then ROS and NASA-specific message types stop at the adapter

Scenario: Feedback reports rejection
Given NASA rejects a target
When the adapter receives the rejection
Then rejection is observable as RobotState or adapter status

Scenario: Feedback does not redefine intent
Given a requested target and actual NASA state differ
Then RobotState preserves that distinction
