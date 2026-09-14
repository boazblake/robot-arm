Feature: Requirement 14 - Workspace mapping and normalization

Human movement is transformed into robot-independent workspace intent.

Scenario: MediaPipe coordinates are transformed
Given MediaPipe reports a human hand position
When workspace mapping runs
Then the coordinates are transformed before RobotTarget is produced

Scenario: Mapping axes are explicit
When workspace mapping is inspected
Then each human control axis has a defined target axis

Scenario: Mapping scale is configurable
Given human displacement produces target displacement
Then the scale relationship is configurable
And it does not depend on screen dimensions

Scenario: Human proportions remain independent
Given operators have different arm lengths
When equivalent normalized movement is produced
Then mapping does not require matching robot dimensions
