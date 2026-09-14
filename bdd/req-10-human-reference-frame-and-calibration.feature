Feature: Requirement 10 - Human reference frame and calibration

A teleoperation reference is established from human tracking without depending on a robot implementation.

Scenario: Calibration establishes a human reference
Given valid HumanArmPose input exists
When calibration completes
Then a human control reference is established

Scenario: Calibration is explicit
Given tracking is active
When calibration has not been completed
Then the system does not treat movement as calibrated control input

Scenario: Movement is relative to the reference
Given calibration is complete
When the human arm moves from its reference position
Then the resulting movement is represented as displacement from that reference

Scenario: Calibration is robot-independent
When calibration logic is inspected
Then it does not require NASA, ROS 2, MoveIt, MuJoCo, or a specific robot
