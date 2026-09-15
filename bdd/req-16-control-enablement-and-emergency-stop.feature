Feature: Requirement 16 - Control enablement and emergency stop

  Requirement 16 defines permission to transmit RobotTarget intent. It does not
  construct RobotTarget values and it does not perform adapter effects.

  RobotTarget is intent. ControlPolicy is permission to transmit that intent.
  RobotAdapter is the external effect.

  Control state transitions are pure policy decisions. Adapter effects are owned by
  control orchestration, which serializes target submission, control transitions,
  and adapter effects through one ordered control boundary. A check-then-send
  sequence is not sufficient: no target whose transmission point occurs after the
  emergency-stop transition may reach RobotAdapter.sendTarget.

  ControlMode has exactly three values:

    disabled - normal safe state; transmission is blocked
    enabled  - targets for that arm may pass the transmission gate
    stopped  - emergency stop is latched; transmission is blocked

  ControlState contains independent per-arm modes:

    left: ControlMode
    right: ControlMode

  A new session and a normal session reset start with both arms disabled. Control
  state is immutable and owned by session orchestration. The policy functions are
  pure and do not contain hidden mutable state.

  ControlReadiness for an arm contains:

    trackingValid: boolean
    inputFresh: boolean
    calibrated: boolean

  Requirement 11 supplies tracking validity. Requirement 17 supplies freshness.
  Requirement 10 supplies calibration state. ControlPolicy consumes the current
  evaluated readiness snapshot; session orchestration rejects obsolete tracking
  events before applying them. Requirement 16 does not duplicate timestamp or
  event-ordering policy.

  Readiness failures are deterministic and have this precedence:

    tracking-invalid, then input-stale, then not-calibrated

  ControlTransition and ControlTransitionResult provide immutable transition
  data for orchestration and telemetry. Logging is not performed by policy.

  The global policy operations are:

    emergencyStop(state): ControlState
    clearEmergencyStop(state): ControlTransitionResult
    applyReadiness(state, side, readiness): ControlTransitionResult
    canTransmitTarget(state, side): boolean

  Except for emergencyStop, policy transitions return a ControlTransitionResult
  containing previous and next ControlState, an event of "enable", "disable",
  "readiness-lost", or "emergency-stop-cleared", and an optional side and
  reason. emergencyStop returns the stopped ControlState directly. Orchestration
  wraps that state change in an immutable ControlTransition event with event
  "emergency-stop". Orchestration adds timestamps and sequence values when
  recording transition events.

  The transition matrix is exhaustive: disabled may enable when ready, remain
  disabled on disable, or become stopped on emergency stop; enabled may enable
  when ready, disable, become disabled on readiness loss, or become stopped on
  emergency stop; stopped rejects enable and disable, remains stopped on
  emergency stop or readiness changes, and can become disabled only through the
  global clearEmergencyStop operation.

  ControlTransitionResult is a typed result. Expected invalid transitions do not
  throw. Transition functions return new deeply readonly state values.

  Scenario: A new session starts disabled for both arms
    When a new teleoperation session starts
    Then left control mode is "disabled"
    And right control mode is "disabled"

  Scenario: A normal session reset disables both arms
    Given left control mode is "enabled"
    And right control mode is "enabled"
    When the control state is reset normally
    Then left control mode is "disabled"
    And right control mode is "disabled"

  Scenario: A normal reset cannot clear a latched emergency stop
    Given both control modes are "stopped"
    When the control state is reset normally
    Then both control modes remain "stopped"
    And clearEmergencyStop is required before either arm can be enabled

  Scenario: Valid readiness enables the selected left arm
    Given left control mode is "disabled"
    And left readiness has trackingValid true, inputFresh true, and calibrated true
    When enableControl is requested for the left arm
    Then it succeeds
    And left control mode becomes "enabled"
    And right control mode is unchanged

  Scenario: Valid readiness enables the selected right arm
    Given right control mode is "disabled"
    And right readiness has trackingValid true, inputFresh true, and calibrated true
    When enableControl is requested for the right arm
    Then it succeeds
    And right control mode becomes "enabled"
    And left control mode is unchanged

  Scenario Outline: Enablement rejects invalid readiness
    Given the selected arm is disabled
    And readiness has <field> false
    When enableControl is requested for the selected arm
    Then it returns a failed result with reason "<reason>"
    And the selected arm remains "disabled"

    Examples:
      | field         | reason             |
      | trackingValid | tracking-invalid   |
      | inputFresh    | input-stale        |
      | calibrated    | not-calibrated     |

  Scenario: Enabling one arm does not enable the other arm
    Given left control mode is "disabled"
    And right control mode is "disabled"
    And left readiness is valid
    When left control is enabled
    Then left control mode is "enabled"
    And right control mode is "disabled"

  Scenario: Disabling one arm preserves the other arm
    Given left control mode is "enabled"
    And right control mode is "enabled"
    When left control is disabled
    Then left control mode is "disabled"
    And right control mode remains "enabled"

  Scenario: Disabling an already disabled arm is idempotent
    Given left control mode is "disabled"
    When left control is disabled
    Then the transition succeeds
    And left control mode remains "disabled"

  Scenario: Enabling an already enabled arm is idempotent with valid readiness
    Given left control mode is "enabled"
    And left readiness is valid
    When left control is enabled
    Then the transition succeeds
    And left control mode remains "enabled"

  Scenario: Tracking invalidity disables only the affected enabled arm
    Given left control mode is "enabled"
    And right control mode is "enabled"
    When Requirement 11 reports invalid tracking for the left arm
    Then left control mode becomes "disabled"
    And right control mode remains "enabled"
    And this is not an emergency-stop transition

  Scenario: Stale input disables only the affected enabled arm
    Given left control mode is "enabled"
    And right control mode is "enabled"
    When Requirement 17 reports stale input for the left arm
    Then left control mode becomes "disabled"
    And right control mode remains "enabled"
    And this is not an emergency-stop transition

  Scenario: Tracking recovery does not automatically re-enable an arm
    Given left control mode became "disabled" because tracking was invalid
    When tracking becomes valid and fresh again
    Then left control mode remains "disabled"
    And explicit enableControl is required

  Scenario: Fresh input does not automatically re-enable an arm
    Given left control mode became "disabled" because input was stale
    When input becomes fresh again
    Then left control mode remains "disabled"
    And explicit enableControl is required

  Scenario: Enabling an already enabled arm with invalid readiness fails unchanged
    Given left control mode is "enabled"
    And left readiness has trackingValid false, inputFresh true, and calibrated true
    When enableControl is requested for the left arm
    Then it returns a failed result with reason "tracking-invalid"
    And left control mode remains "enabled"

  Scenario: Emergency stop from disabled stops both arms
    Given left control mode is "disabled"
    And right control mode is "enabled"
    When emergencyStop is requested
    Then the transition succeeds
    And left control mode becomes "stopped"
    And right control mode becomes "stopped"

  Scenario: Emergency stop from enabled stops both arms
    Given left control mode is "enabled"
    And right control mode is "enabled"
    When emergencyStop is requested
    Then the transition succeeds
    And left control mode becomes "stopped"
    And right control mode becomes "stopped"

  Scenario: Emergency stop is idempotent
    Given both control modes are "stopped"
    When emergencyStop is requested again
    Then the transition succeeds
    And both control modes remain "stopped"

  Scenario: Disable from enabled succeeds
    Given left control mode is "enabled"
    When left control is disabled
    Then the transition succeeds
    And left control mode becomes "disabled"

  Scenario: Enable from stopped fails without readiness evaluation
    Given left control mode is "stopped"
    And left readiness is valid
    When enableControl is requested for the left arm
    Then it returns a failed result with reason "emergency-stop-latched"
    And left control mode remains "stopped"

  Scenario: Tracking recovery does not clear emergency stop
    Given both control modes are "stopped"
    When tracking becomes valid and fresh again
    Then both control modes remain "stopped"
    And no arm is automatically enabled

  Scenario: Enablement cannot bypass a latched emergency stop
    Given the selected arm is "stopped"
    And readiness for the selected arm is valid
    When enableControl is requested
    Then it returns a failed result with reason "emergency-stop-latched"
    And the selected arm remains "stopped"

  Scenario: Clearing emergency stop is global and does not require readiness
    Given both control modes are "stopped"
    And readiness is invalid for both arms
    When clearEmergencyStop is requested
    Then it succeeds
    And left control mode becomes "disabled"
    And right control mode becomes "disabled"
    And explicit enableControl is still required

  Scenario: Only clearEmergencyStop can leave stopped
    Given left control mode is "stopped"
    And right control mode is "stopped"
    When left control is disabled
    Then it returns a failed result with reason "emergency-stop-latched"
    And both control modes remain "stopped"
    When clearEmergencyStop is requested
    Then both control modes become "disabled"

  Scenario: Explicit enable is required after clearing emergency stop
    Given both control modes are "disabled" after clearEmergencyStop
    And readiness for the left arm is valid
    When no enableControl action occurs
    Then left control mode remains "disabled"
    When enableControl is requested for the left arm
    Then left control mode becomes "enabled"

  Scenario: RobotTarget intent can exist while control is disabled
    Given left control mode is "disabled"
    When a valid left RobotTarget is constructed
    Then construction succeeds
    And the target remains intent data
    And no adapter transmission occurs

  Scenario: Disabled control blocks target transmission
    Given left control mode is "disabled"
    And a valid left RobotTarget exists
    When the target is submitted for transmission
    Then the transmission gate returns false
    And RobotAdapter.sendTarget is not called

  Scenario: Stopped control blocks target transmission
    Given left control mode is "stopped"
    And a valid left RobotTarget exists
    When the target is submitted for transmission
    Then the transmission gate returns false
    And RobotAdapter.sendTarget is not called

  Scenario: Enabled control permits target transmission
    Given left control mode is "enabled"
    And a valid left RobotTarget exists
    When the target is submitted for transmission
    Then the transmission gate returns true
    And the adapter may receive the target

  Scenario: Transmission gate checks only the target side mode
    Given left control mode is "disabled"
    And right control mode is "enabled"
    When a right RobotTarget is checked for transmission
    Then the transmission gate returns true
    When a left RobotTarget is checked for transmission
    Then the transmission gate returns false

  Scenario: Emergency stop changes state before awaiting adapter stop
    Given one or both control modes are "enabled"
    And RobotAdapter.stop has not completed
    When emergencyStop is requested through the control orchestrator
    Then both control modes become "stopped" before RobotAdapter.stop is awaited
    And the adapter stop operation is requested

  Scenario: Serialized orchestration prevents a post-stop target send
    Given target A is submitted before emergency stop
    And emergencyStop is submitted after target A
    And target B is submitted after emergency stop
    When the control command queue executes in order
    Then target A may reach RobotAdapter.sendTarget before the stop transition
    And both control modes become "stopped" before target B is processed
    And target B is blocked
    And target B does not reach RobotAdapter.sendTarget

  Scenario: A check-then-send race is not permitted
    Given a target has passed canTransmitTarget while the arm is enabled
    When emergencyStop linearizes before the target transmission point
    Then the target does not reach RobotAdapter.sendTarget
    And adapter stop is requested

  Scenario: Adapter stop failure preserves local emergency stop
    Given one or both control modes are "enabled"
    And RobotAdapter.stop fails
    When emergencyStop is requested through the control orchestrator
    Then both control modes remain "stopped"
    And the effect result fails with reason "adapter-stop-failed"
    And control is not restored

  Scenario: RobotAdapter stop is global and idempotent
    Given RobotAdapter.stop has already been requested
    When emergencyStop is requested again
    Then the adapter stop request remains safe
    And both control modes remain "stopped"

  Scenario: Emergency stop does not promise cancellation of an already transmitted target
    Given a target was transmitted before emergency stop
    When emergencyStop is requested
    Then no newly submitted target reaches RobotAdapter.sendTarget after the stopped transition
    And adapter stop handles the external system according to its own contract
    And no generic cancellation guarantee is assumed

  Scenario: Control policy owns no adapter effect
    When control policy functions are inspected
    Then state transitions and transmission permission are pure decisions
    And they do not call RobotAdapter.sendTarget
    And they do not call RobotAdapter.stop
    And adapter orchestration owns those effects

  Scenario: Readiness precedence is deterministic
    Given the selected arm has trackingValid false, inputFresh false, and calibrated false
    When enableControl is requested
    Then it returns a failed result with reason "tracking-invalid"
    Given the selected arm has trackingValid true, inputFresh false, and calibrated false
    When enableControl is requested
    Then it returns a failed result with reason "input-stale"
    Given the selected arm has trackingValid true, inputFresh true, and calibrated false
    When enableControl is requested
    Then it returns a failed result with reason "not-calibrated"

  Scenario: Readiness loss disables only an enabled arm
    Given left control mode is "enabled"
    And right control mode is "enabled"
    When applyReadiness is given left readiness with trackingValid false
    Then left control mode becomes "disabled"
    And right control mode remains "enabled"
    And the transition event is "readiness-lost"

  Scenario: Readiness remains enabled only while readiness is valid
    Given left control mode is "enabled"
    When applyReadiness is given valid left readiness
    Then left control mode remains "enabled"

  Scenario: Readiness recovery does not enable a disabled arm
    Given left control mode is "disabled"
    When applyReadiness is given valid left readiness
    Then left control mode remains "disabled"

  Scenario: Readiness changes do not leave a stopped arm
    Given left control mode is "stopped"
    When applyReadiness is given valid left readiness
    Then left control mode remains "stopped"

  Scenario: Disable cannot clear a stopped arm
    Given left control mode is "stopped"
    When left control is disabled
    Then it returns a failed result with reason "emergency-stop-latched"
    And left control mode remains "stopped"

  Scenario: Control state and transition results are deeply readonly
    When a control state or transition result is created
    Then the state and nested values are deeply frozen

  Scenario: Control transitions are deterministic
    Given the same ControlState, selected side, event, and readiness
    When a transition runs twice
    Then both results are exactly equal
    And caller-owned state is not mutated

  Scenario: Control policy has no UI or concrete robot dependency
    When control policy dependencies are inspected
    Then they do not include UI, DOM, screen, camera, render, or platform modules
    And they do not include NASA, iMETRO, CLR, UR10e, Hand-E, SO-101, ROS, MoveIt, MuJoCo, clr_ws, or servo protocols
