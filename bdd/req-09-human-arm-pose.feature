Feature: Requirement 9 - HumanArmPose

HumanArmPose is a robot-independent anatomical interpretation of one tracking snapshot.
It identifies the person's left and right arms without deciding whether tracking is
reliable enough for control.

Scenario: HumanArmPose represents both arms
When the HumanArmPose contract is inspected
Then it contains the source timestamp
And it contains a nullable left arm
And it contains a nullable right arm
And each arm contains shoulder, elbow, wrist, and handAnchor points
And it contains no hand classification or gripper state

Scenario: Named landmark accessors define the anatomical mapping
When human landmark accessors are inspected
Then left shoulder maps to pose landmark index 11
And right shoulder maps to pose landmark index 12
And left elbow maps to pose landmark index 13
And right elbow maps to pose landmark index 14
And left wrist maps to pose landmark index 15
And right wrist maps to pose landmark index 16
And each handAnchor maps to hand landmark index 0
And HumanArmPose construction uses named accessors rather than numeric indices

Scenario: Both valid arms produce one HumanArmPose
Given a TrackingFrame contains finite left shoulder, elbow, pose wrist, and hand wrist landmarks
And a TrackingFrame contains finite right shoulder, elbow, pose wrist, and hand wrist landmarks
When the frame is processed
Then one HumanArmPose is produced
And both left and right arms are present
And each point preserves its TrackingFrame coordinates exactly

Scenario: One unavailable side does not invalidate the other
Given the left arm has valid required landmarks
And the right arm has one or more missing or invalid required landmarks
When the frame is processed
Then the left arm is present
And the right arm is null
Given the right arm has valid required landmarks
And the left arm has one or more missing or invalid required landmarks
When the frame is processed
Then the left arm is null
And the right arm is present

Scenario: No usable arms produce a valid empty snapshot
Given neither arm has all required landmarks
When the frame is processed
Then a HumanArmPose is produced
And its left arm is null
And its right arm is null
And no exception is thrown for expected tracking loss

Scenario: Structural validity is evaluated without confidence policy
Given a required shoulder, elbow, pose wrist, or hand wrist landmark is missing
Or a required landmark index does not exist
Or a required landmark contains a non-finite XYZ value
When the frame is processed
Then that arm is null
And the other arm remains independently evaluated
And no confidence or visibility threshold is applied

Scenario: Timestamp is preserved
Given a TrackingFrame has timestamp T
When the frame is processed
Then `HumanArmPose.timestamp` equals T
And no new timestamp is created

Scenario: HumanArmPose is deeply readonly and robot-independent
When the HumanArmPose contract and dependencies are inspected
Then its points and arm values are readonly
And it depends only on TrackingFrame, Landmark, generic geometry, and human landmark accessors
And it does not depend on RobotTarget, TeleopMapper, RobotAdapter, NASA, iMETRO, SO-101, ROS, or robot-control modules

Scenario: Deterministic HumanArmPose tests pass
When HumanArmPose tests run
Then they cover both arms valid
And they cover left-only, right-only, and neither arm
And they cover each missing required landmark
And they cover finite coordinate preservation
And they cover timestamp preservation
And they cover immutability
And they cover the documented MediaPipe index mapping
