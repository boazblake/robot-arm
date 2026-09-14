Feature: Requirement 21 - iMETRO adapter

The iMETRO adapter translates RobotTarget for NASA CLR without importing NASA implementation into LiftMate domain code.

Scenario: iMETRO consumes RobotTarget
Given the iMETRO adapter is connected
When it receives a valid RobotTarget
Then it translates that target for the CLR interface

Scenario: NASA communication stays in the adapter
When NASA-specific communication is required
Then it remains inside the iMETRO adapter

Scenario: iMETRO is a separate process or package
When the repository is inspected
Then the adapter is isolated from browser application code
And ROS dependencies are not required by the browser application

Scenario: iMETRO does not reinterpret anatomy
When RobotTarget reaches the adapter
Then the adapter does not require shoulder, elbow, or wrist landmarks
