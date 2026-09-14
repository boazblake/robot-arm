Feature: Requirement 13 - HumanArmPose to RobotTarget mapping

TeleopMapper converts HumanArmPose into robot-independent RobotTarget intent.

Scenario: TeleopMapper produces RobotTarget
Given a valid HumanArmPose exists
When TeleopMapper processes the pose
Then it produces RobotTarget

Scenario: Mapping is not direct joint substitution
Given a valid HumanArmPose exists
When TeleopMapper produces RobotTarget
Then human joint angles do not directly become named robot joint angles

Scenario: Mapping knows no target implementation
When TeleopMapper dependencies are inspected
Then it does not depend on NASA, ROS 2, MoveIt, MuJoCo, or clr_ws

Scenario: Invalid HumanArmPose is rejected
Given HumanArmPose is invalid
When TeleopMapper processes it
Then it does not produce valid executable intent
