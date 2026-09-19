Feature: Requirement 20 - RobotState and feedback

Robot feedback is represented upstream without exposing implementation-specific types.

Scenario: Adapter exposes robot state
Given an external system provides current robot state
When the adapter receives it
Then it exposes a robot-independent RobotState

Scenario: Requested and actual state differ
Given LiftMate requested a RobotTarget
And the external system reports current state
Then LiftMate does not treat requested state as actual state

Scenario: Feedback contains freshness information
When RobotState is produced
Then its timing is sufficient to evaluate freshness

Scenario: External types stop at the adapter
When RobotState crosses upstream
Then ROS, MoveIt, MuJoCo, and target-specific types do not cross the boundary

# Canonical RobotState contract

RobotState represents observed robot reality, not requested intent. It contains
an epoch-millisecond observation time and independently observable left and right
arm state. An unavailable arm is represented by null. Position uses the external
robot's canonical units and is not constrained to the normalized RobotTarget
range. Optional orientation is a normalized quaternion and optional gripper intent
is either open or close. Optional properties remain absent rather than null.

  RobotState = {
    observedAt: number
    arms: {
      left: RobotArmState | null
      right: RobotArmState | null
    }
  }

  RobotArmState = {
    position: { x: number, y: number, z: number }
    orientation?: { x: number, y: number, z: number, w: number }
    gripper?: "open" | "close"
  }

Scenario: RobotState validates timing and actual arm data
  Given external feedback is untrusted
  When RobotState is constructed
  Then observedAt is finite and non-negative
  And each present arm has finite position components
  And an invalid quaternion or gripper is rejected
  And validation does not throw

Scenario: RobotState preserves requested-versus-actual distinction
  Given a RobotTarget contains a requested position
  And RobotState contains the reported actual position
  When both cross the application boundary
  Then RobotState does not contain RobotTarget or requested-position fields
  And the reported position is not rewritten to match the request

Scenario: RobotState round trips without changing optional-field absence
  Given a valid RobotState
  When it is serialized to JSON and parsed
  Then structural state data is preserved
  And absent orientation and gripper properties remain absent

RobotState feedback is exposed through a robot-independent observer port:

  RobotStateObserver = (state: RobotState) => void
  RobotStateFeedback = {
    onState(observer: RobotStateObserver): Unsubscribe
    publish(state: RobotState): void
  }

BDD20 owns canonical validation and feedback publication. BDD19 owns transport
serialization and delivery. BDD17 may evaluate freshness from observedAt, but
BDD20 does not decide control permission or stop state.

Scenario: Feedback observers are isolated
  Given one RobotState observer throws
  When feedback is published
  Then other observers still receive the state
  And the feedback boundary does not throw

Scenario: Transport carries RobotState without claiming execution
  Given a validated RobotState is published
  When BDD19 transports it to the browser
  Then the browser receives actual observed state
  And the transport does not infer that a requested target was executed
