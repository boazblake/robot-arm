Feature: Browser-to-ROS transport
  Requirement 19 provides a semantic-neutral transport port between a future
  ClrRobotAdapter and a rosbridge client. It does not define ROS message types,
  channels, robot mapping, or application behavior.

  Scenario: Transport connects to the configured ROS bridge
    Given RosTransport is disconnected
    When connection is requested
    And the configured ROS bridge client connects successfully
    Then RosTransport reports connected

  Scenario: Connection failure is typed
    Given RosTransport is disconnected
    When connection is requested
    And the ROS bridge client cannot connect
    Then the connection result is a typed failure
    And RosTransport reports disconnected

  Scenario: Disconnect closes the current transport
    Given RosTransport is connected
    When disconnect is requested
    Then the current ROS bridge connection is closed
    And RosTransport reports disconnected

  Scenario: Disconnect is idempotent
    Given RosTransport is disconnected
    When disconnect is requested repeatedly
    Then every request completes deterministically
    And RosTransport remains disconnected

  Scenario: A typed ROS message is published unchanged
    Given RosTransport is connected
    And a typed ROS transport message exists
    When the caller publishes the message to a channel
    Then the ROS bridge client receives that channel
    And the ROS bridge client receives the same message semantics

  Scenario: A disconnected transport refuses publication
    Given RosTransport is disconnected
    When publication is requested
    Then publication returns a typed not-connected failure
    And nothing is published

  Scenario: Valid inbound data reaches the subscriber
    Given RosTransport subscribes to a ROS channel with a runtime validator
    When the ROS bridge delivers a valid runtime payload
    Then the validator accepts the payload
    And the typed payload reaches the subscriber

  Scenario: Invalid inbound data is rejected
    Given RosTransport subscribes to a ROS channel with a runtime validator
    When the ROS bridge delivers an invalid runtime payload
    Then the subscriber is not called
    And an invalid-message transport event is observable

  Scenario: Unexpected connection loss is observable
    Given RosTransport is connected
    When the underlying ROS bridge connection is lost unexpectedly
    Then RosTransport reports disconnected
    And a typed connection-lost event is emitted

  Scenario: Callbacks from an old connection cannot affect a new connection
    Given a previous ROS bridge connection has been invalidated
    And a new connection is active
    When the previous connection emits a late callback
    Then the new connection state is unchanged
    And no application listener receives stale data

  Scenario: A new connection does not replay old commands
    Given an earlier connection published messages
    And that connection was lost
    When a new connection is established
    Then RosTransport publishes no message until a caller explicitly requests publication

  Scenario: Transport remains independent of robot semantics
    Then RosTransport does not depend on RobotTarget
    And RosTransport does not depend on RobotState
    And RosTransport does not depend on tracking
    And RosTransport does not depend on calibration
    And RosTransport does not depend on workspace mapping
    And RosTransport does not depend on stabilization
    And RosTransport does not depend on OInK
