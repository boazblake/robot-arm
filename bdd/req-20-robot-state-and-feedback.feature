@v1
Feature: Robot-independent observed robot state
  Requirement 20 defines the robot-independent destination contract for observed
  robot state. It does not translate CLR or ROS feedback.

  Scenario: RobotState represents observed state
    Given a valid robot-independent observation
    When a RobotState is created
    Then it represents observed robot state
    And it does not represent requested RobotTarget intent

  Scenario: RobotState uses robot-independent Cartesian coordinates
    Given an observed Cartesian position
    When it is represented as RobotState
    Then the position has finite x, y, and z components
    And the position values are preserved exactly
    And no CLR unit or coordinate frame is exposed
    And no workspace normalization or bounds are applied

  Scenario: RobotState preserves source observation time
    Given a valid observation with source time in epoch milliseconds
    When a RobotState is created
    Then observedAt preserves the source observation time
    And observedAt is not replaced with receipt time
    And observedAt is not used as a freshness frequency policy

  Scenario: Left and right observations are independently nullable
    Given either arm observation is unavailable
    When RobotState is created
    Then that arm is represented by null
    And the other arm remains independently representable

  Scenario: Optional observations preserve absence
    Given orientation is unavailable
    When RobotState is created
    Then orientation remains absent
    And no orientation value is invented

  Scenario: Observed orientation uses the established quaternion convention
    Given an observed non-zero finite quaternion
    When RobotState is created
    Then orientation is normalized
    And no Euler-angle representation is introduced

  Scenario Outline: Non-finite numeric state is rejected
    Given observed state contains <value>
    When RobotState validation runs
    Then the state is rejected with a typed validation failure

    Examples:
      | value     |
      | NaN       |
      | Infinity  |
      | -Infinity |

  Scenario: Malformed required state is rejected without throwing
    Given observed state is missing required arm or position structure
    When RobotState validation runs
    Then the state is rejected with a typed validation failure
    And validation does not throw

  Scenario: Invalid orientation is rejected
    Given an observed orientation is malformed or zero-length
    When RobotState validation runs
    Then the state is rejected with a typed validation failure

  Scenario: RobotState preserves requested-versus-observed distinction
    Given a RobotTarget contains a requested position
    And RobotState contains a reported observed position
    When both cross the application boundary
    Then RobotState does not contain RobotTarget or requested-position fields
    And the observed position is not rewritten to match the request

  Scenario: RobotState does not expose robot-specific joint state
    When the RobotState contract is inspected
    Then it does not contain anonymous joint-position arrays
    And it does not contain CLR joint names or servo identifiers

  Scenario: RobotState does not contain transport or control state
    When the RobotState contract is inspected
    Then it does not contain connection state
    And it does not contain ControlPolicy state
    And it does not contain session identity
    And it does not contain generic error strings

  Scenario: RobotState is deeply readonly
    Given a valid RobotState is created
    When the state is inspected
    Then the state and nested values cannot be mutated

  Scenario: RobotState round trips without changing optional-field absence
    Given a valid RobotState
    When it is serialized to JSON and parsed
    Then structural state data is preserved
    And absent orientation properties remain absent

  Scenario: Feedback observers receive validated observed state
    Given a validated RobotState is published
    When a RobotState observer is registered
    Then the observer receives the same observed state
    And no requested execution is implied

  Scenario: Feedback observers are isolated
    Given one RobotState observer throws
    When feedback is published
    Then other observers still receive the state
    And the feedback boundary does not throw

  Scenario: RobotState remains independent of external integration
    Then RobotState has no dependency on ROS
    And RobotState has no dependency on rosbridge
    And RobotState has no dependency on roslibjs
    And RobotState has no dependency on clr_ws
    And RobotState has no dependency on OInK
    And RobotState has no dependency on JointTrajectory
    And RobotState has no dependency on ClrRobotAdapter

  Scenario: Feedback translation remains deferred
    Given typed CLR or ROS feedback exists
    When Requirement 20 is implemented
    Then no CLR-to-RobotState conversion is performed
    And no /joint_states parser is introduced
    And the translation remains owned by a later requirement
