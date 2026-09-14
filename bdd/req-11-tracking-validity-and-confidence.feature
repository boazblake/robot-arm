Feature: Requirement 11 - Tracking validity and confidence

Tracking validity evaluates the structural and visibility quality of each current
tracking snapshot without modifying the anatomical HumanArmPose contract.

Scenario: Both structurally usable arms can be valid
Given both arms are present in HumanArmPose
And all required landmarks have valid visibility
When tracking validity is evaluated
Then both arm results are valid

Scenario: Arm validity is independent
Given the left arm is structurally usable and meets the confidence policy
And the right arm is structurally usable but does not meet the confidence policy
When tracking validity is evaluated
Then the left arm is valid
And the right arm is invalid with reason "confidence-below-threshold"

Scenario: The opposite arm remains usable
Given the right arm is structurally usable and meets the confidence policy
And the left arm is structurally unusable
When tracking validity is evaluated
Then the right arm is valid
And the left arm is invalid with reason "arm-unavailable"

Scenario: Both unavailable arms are invalid
Given neither arm is structurally usable
When tracking validity is evaluated
Then both arm results are invalid with reason "arm-unavailable"

Scenario: Visibility above the threshold passes
Given all required landmark visibility values are above the configured threshold
When tracking validity is evaluated
Then the arm is valid

Scenario: Visibility exactly at the threshold passes
Given all required landmark visibility values equal the configured threshold
When tracking validity is evaluated
Then the arm is valid

Scenario: Visibility below the threshold fails
Given a required landmark visibility value is below the configured threshold
When tracking validity is evaluated
Then the arm is invalid with reason "confidence-below-threshold"

Scenario: Missing visibility can be accepted
Given a required landmark has no visibility value
And the policy uses missingVisibility "accept"
When tracking validity is evaluated
Then the arm is valid if all other required evidence passes

Scenario: Missing visibility can be rejected
Given a required landmark has no visibility value
And the policy uses missingVisibility "reject"
When tracking validity is evaluated
Then the arm is invalid with reason "confidence-unavailable"

Scenario Outline: Invalid visibility fails
Given a required landmark has visibility <value>
When tracking validity is evaluated
Then the arm is invalid with reason "confidence-invalid"

Examples:
  | value     |
  | NaN       |
  | Infinity  |
  | -0.1      |
  | 1.1       |

Scenario: Missing required landmark invalidates only that arm
Given a required landmark for the left arm is unavailable
And all required evidence for the right arm passes
When tracking validity is evaluated
Then the left arm is invalid with reason "arm-unavailable"
And the right arm is valid

Scenario: Pose and frame evidence are checked independently
Given HumanArmPose says an arm exists
But the corresponding required landmark is unavailable in TrackingFrame
When tracking validity is evaluated
Then that arm is invalid with reason "arm-unavailable"

Scenario: Invalid confidence policy is rejected at construction
Given minimumVisibility is not finite or is outside the inclusive range 0 through 1
When a TrackingConfidencePolicy is constructed
Then policy construction fails with reason "minimum-visibility-invalid"

Scenario: Validity is snapshot-scoped
Given a current TrackingFrame and HumanArmPose
When tracking validity is evaluated
Then no staleness or elapsed-time policy is applied
And Requirement 17 owns stale-input behavior

Scenario: Validity is separate from HumanArmPose
When tracking validity is evaluated
Then it produces a separate TrackingValidity result
And it does not add confidence or visibility fields to HumanArmPose
And an invalid arm is not available for downstream motion interpretation

Scenario: Validity results are deeply readonly
When tracking validity results and policies are created
Then their result objects are deeply readonly

Scenario: Tracking validity is robot-independent
When tracking validity logic is inspected
Then it depends only on TrackingFrame, HumanArmPose, landmark accessors, and generic tracking types
And it does not depend on RobotTarget, TeleopMapper, RobotAdapter, NASA, iMETRO, SO-101, ROS, MoveIt, or robot-control modules
