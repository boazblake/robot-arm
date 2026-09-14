Feature: Requirement 28 - Teleoperation measurements

The integration provides measurements for evaluating teleoperation.

Scenario: Task time is measurable
Given a defined manipulation task begins
When its completion condition is reached
Then elapsed task time is recorded

Scenario: Corrections are measurable
Given a manipulation task is active
Then data exists to calculate operator corrections

Scenario: Rejections are measurable
Given a RobotTarget cannot be executed
Then that rejection is recorded

Scenario: Pipeline latency is measurable
Given tracking produces robot intent
When it reaches the adapter
Then elapsed pipeline time can be measured

Scenario: Measurements remain outside primary UI
When experiment metrics are collected
Then they do not require a dashboard in the primary teleoperation view
