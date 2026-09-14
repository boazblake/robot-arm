Feature: Requirement 11 - Tracking validity and confidence

Human tracking validity is evaluated before downstream motion interpretation.

Scenario: Required landmarks determine validity
Given required HumanArmPose landmarks are present
When tracking validity is evaluated
Then the input can be accepted as valid

Scenario: Missing required landmarks invalidate input
Given one or more required landmarks are unavailable
When tracking validity is evaluated
Then the input is invalid

Scenario: Confidence remains explicit
Given landmark confidence information exists
When tracking validity is evaluated
Then the configured confidence policy is applied

Scenario: Invalid tracking does not create robot input
Given tracking is invalid
When the frame is processed
Then no valid downstream control input is produced
