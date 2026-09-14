Feature: Requirement 12 - RobotTarget contract

RobotTarget is robot-independent manipulation intent for one controlled arm/end effector.
Its position is absolute within the normalized robot-independent control
workspace; workspace frame and units are defined by Requirement 14.

Scenario: RobotTarget represents one controlled arm
Given a valid absolute workspace position exists
When a RobotTarget is produced for the left arm
Then it contains side "left"
And it contains a deeply readonly XYZ position
And the position is not a movement delta

Scenario: Right arm targets are independent
Given a valid absolute workspace position exists
When a RobotTarget is produced for the right arm
Then it contains side "right"
And it represents only the right controlled arm

Scenario: Position values must be finite
Given a position is missing or contains a non-finite XYZ value
When RobotTarget construction is attempted
Then construction fails with reason "position-invalid"

Scenario: Orientation is optional
Given no orientation information is available
When RobotTarget is produced
Then the orientation property is omitted

Scenario: Orientation uses a normalized quaternion
Given orientation information is available
When RobotTarget is produced
Then orientation contains finite x, y, z, and w quaternion components
And the quaternion is non-zero
And the quaternion is normalized during construction

Scenario: Invalid orientation is rejected
Given an orientation has a non-finite component or is a zero quaternion
When RobotTarget construction is attempted
Then construction fails with reason "orientation-invalid"

Scenario: Gripper intent is optional and semantic
Given no gripper intent is available
When RobotTarget is produced
Then the gripper property is omitted
Given gripper intent is available
When RobotTarget is produced
Then gripper is either "open" or "close"
And it is not a normalized numeric amount

Scenario: Invalid gripper intent is rejected
Given gripper intent is not "open" or "close"
When RobotTarget construction is attempted
Then construction fails with reason "gripper-invalid"

Scenario: Source timestamp is preserved
Given a source TrackingFrame timestamp in epoch milliseconds
When RobotTarget is produced
Then sourceTimestamp equals the originating timestamp
And target-generation time is not substituted

Scenario: Timestamp must be valid
Given sourceTimestamp is non-finite or negative
When RobotTarget construction is attempted
Then construction fails with reason "timestamp-invalid"

Scenario: Sequence carries session-local ordering
Given sequence is a non-negative integer
When RobotTarget is produced
Then it preserves the supplied sequence
And the producer owns incrementing it within the control session
And RobotTarget does not add a session identifier

Scenario: Invalid sequence is rejected
Given sequence is negative or non-integral
When RobotTarget construction is attempted
Then construction fails with reason "sequence-invalid"

Scenario: Control and freshness policy remain outside RobotTarget
When RobotTarget is inspected
Then it contains no enabled, emergencyStop, or controlActive fields
And it contains no stale timeout or clock-comparison policy
And Requirement 16 owns control enablement
And Requirement 17 owns stale-input policy

Scenario: RobotTarget is JSON-compatible
Given a valid RobotTarget exists
When it is serialized and parsed as JSON
Then its target data is preserved
And byte-identical serialization is not required across implementations

Scenario: RobotTarget is deeply readonly
When a RobotTarget is produced
Then the target, position, orientation, and result objects are deeply readonly

Scenario: RobotTarget exposes no implementation details
When RobotTarget is inspected
Then it contains no ROS, MoveIt, MuJoCo, NASA, iMETRO, CLR, UR10e, Hand-E, SO-101, servo protocol, RobotAdapter, or robot-specific control types
