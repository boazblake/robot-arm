Feature: Requirement 17 - Freshness and tracking-loss policy

Requirement 17 owns per-arm freshness timing and tracking-loss policy. Requirement
11 evaluates whether the current snapshot is valid. Requirement 17 evaluates how
long valid evidence has been absent. It does not use RobotTarget source timestamps
for elapsed-time decisions and it does not stop local tracking recovery.

The freshness policy uses monotonic milliseconds. `now` and `lastValidInputAt`
are values from the same monotonic clock; `Date.now()` and epoch timestamps are
not used for elapsed-time safety decisions.

The policy has two configurable thresholds:

  staleInputTimeout defaults to 250 ms
  stopTimeout defaults to 1000 ms

Both thresholds are finite and must satisfy:

  0 < staleInputTimeout < stopTimeout

Input freshness is independent per arm:

  fresh - age <= staleInputTimeout
  stale - age > staleInputTimeout and age <= stopTimeout
  lost  - age > stopTimeout

Requirement 17 consumes current evaluated `TrackingValidity` evidence and tracks
absence of valid evidence per arm. It does not duplicate Requirement 11 confidence
policy or event-ordering/timestamp validation.

When an enabled arm becomes stale, the control orchestrator applies the BDD16
readiness/control transition `enabled -> disabled`. No new target reaches the
adapter and no physical adapter stop is requested yet.

When an arm becomes lost, the orchestrator disables control for both arms and
requests a controlled global `RobotAdapter.stop`. This keeps local state aligned
with the physical global stop. This is not BDD16 emergency stop: `ControlState`
does not become `stopped`.

Tracking recovery after stale or lost input keeps the arm disabled, resets that
arm's stabilization state, rebases that arm's calibration reference to the
current HumanArm, marks input fresh, and requires explicit operator enablement.
Rebasing is orchestration of the Requirement 10 and Requirement 15 domain outputs;
Requirement 17 does not call adapters or perform logging.

Intentional pause is separate from accidental tracking loss. Pause disables both
arms, resets stabilization for both arms, stops producing tracking input, and does
not advance freshness timers. Resume waits for valid input, performs recovery
rebase, and remains disabled until explicit enablement.

Freshness transitions and target transmission share the serialized BDD16 control
boundary. The orchestrator is authoritative for stale-target rejection before the
adapter. The adapter may perform a second defense-in-depth stale check under
Requirement 18. Already transmitted targets are not cancelled or undone.

A typed transmission rejection is one of:

  control-disabled
  input-stale
  input-lost

Policy events are typed and returned for orchestration:

  tracking-loss-started
  input-became-stale
  input-became-lost
  adapter-stop-requested
  tracking-recovered
  calibration-rebased
  stabilization-reset
  target-suppressed

The orchestration layer adds timestamps and records events. Pure policy functions
perform no logging and no adapter effects.

Scenario: A valid input starts fresh for each arm
  Given the left arm has valid tracking evidence at monotonic time 1000
  And the right arm has valid tracking evidence at monotonic time 1000
  When freshness is evaluated at monotonic time 1000
  Then left freshness is "fresh"
  And right freshness is "fresh"

Scenario: Freshness uses monotonic elapsed time
  Given the left arm last had valid input at monotonic time 1000
  When freshness is evaluated at monotonic time 1250
  Then left freshness is "fresh"
  When freshness is evaluated at monotonic time 1251
  Then left freshness is "stale"

Scenario: Stop timeout boundary remains stale
  Given the left arm last had valid input at monotonic time 1000
  When freshness is evaluated at monotonic time 2000
  Then left freshness is "stale"
  When freshness is evaluated at monotonic time 2001
  Then left freshness is "lost"

Scenario: Invalid freshness configuration is rejected
  Given staleInputTimeout is zero, negative, non-finite, or not less than stopTimeout
  When freshness configuration is constructed
  Then construction fails with a typed invalid-timeout reason

Scenario: Freshness is independent per arm
  Given left valid input was last received at monotonic time 1000
  And right valid input was last received at monotonic time 1200
  When freshness is evaluated at monotonic time 1300
  Then left freshness is "stale"
  And right freshness is "fresh"

Scenario: Requirement 11 validity controls valid-input recording
  Given a current snapshot has invalid left tracking validity
  When the snapshot is processed at monotonic time 1000
  Then left lastValidInputAt is not updated
  And the invalid evidence does not make left input fresh

Scenario: Stale enabled input disables only the affected arm
  Given left control mode is "enabled"
  And right control mode is "enabled"
  And left freshness becomes "stale"
  When the freshness transition is applied through the BDD16 control boundary
  Then left control mode becomes "disabled"
  And right control mode remains "enabled"
  And no RobotAdapter.stop request is made
  And new left targets are rejected with reason "input-stale"

Scenario: Lost enabled input disables both arms and requests controlled stop
  Given left control mode is "enabled"
  And right control mode is "enabled"
  And left freshness becomes "lost"
  When the freshness transition is applied through the serialized control boundary
  Then left control mode becomes "disabled"
  And right control mode becomes "disabled"
  And a global RobotAdapter.stop request is made
  And ControlState does not become "stopped"
  And the event "input-became-lost" is returned

Scenario: Lost input does not become emergency stop
  Given both control modes are "enabled"
  When an arm reaches freshness "lost"
  Then the local control state is not BDD16 emergency-stop state
  And clearEmergencyStop is not required for tracking recovery
  And explicit enablement is still required after recovery

Scenario: Freshness and transmission are serialized
  Given a target has passed a freshness check while the arm is fresh
  When the stale transition linearizes before the target transmission point
  Then the target does not reach RobotAdapter.sendTarget
  And the target is rejected with reason "input-stale" or "input-lost"

Scenario: Already transmitted targets are not cancelled
  Given a target reached RobotAdapter.sendTarget before freshness became stale
  When the arm becomes stale or lost
  Then Requirement 17 does not cancel or undo that target
  And a controlled adapter stop is requested only when the arm becomes lost

Scenario: Recovery after stale input rebases the affected arm
  Given left freshness was "stale" or "lost"
  And left control mode is "disabled"
  When valid left tracking returns
  Then left freshness becomes "fresh"
  And left stabilization state is reset
  And left calibration is rebased to the current HumanArm
  And the events "tracking-recovered", "calibration-rebased", and "stabilization-reset" are returned
  And left control mode remains "disabled"
  And explicit enableControl is required

Scenario: Recovery prevents a displacement jump
  Given left tracking was unavailable while the operator moved
  When valid left tracking returns and recovery rebase completes
  Then the recovered left displacement is zero at the new calibration reference
  And no uncontrolled displacement is generated

Scenario: Recovery preserves independent freshness but not global stop state
  Given left input is lost and right input remains fresh
  When valid left tracking returns
  Then left recovery is rebased and remains disabled
  And right freshness remains "fresh"
  And right control mode remains "disabled"

Scenario: The unaffected arm can be explicitly re-enabled after controlled stop
  Given left input caused a global controlled stop
  And right freshness and calibration remain valid
  And right control mode is "disabled"
  When right control is explicitly enabled
  Then right control mode becomes "enabled"
  And no emergency-stop clearing is required

Scenario: Intentional pause is not accidental tracking loss
  Given one or both arms are enabled
  When tracking is paused intentionally
  Then both control modes become "disabled"
  And both stabilization states are reset
  And tracking input production stops
  And stale and lost timers do not advance
  And no tracking-loss event is emitted

Scenario: Resume requires valid input and explicit enablement
  Given tracking was intentionally paused
  When tracking resumes
  Then no arm is enabled automatically
  And recovery waits for valid tracking input
  And calibration and stabilization are rebased before control can be enabled

Scenario: Stale target rejection is a normal typed result
  Given a target is submitted while the arm input is stale or lost
  When the serialized control orchestrator evaluates transmission
  Then it returns a failed typed result with reason "input-stale" or "input-lost"
  And it does not throw
  And RobotAdapter.sendTarget is not called

Scenario: Adapter stale rejection is defense in depth
  Given the orchestrator has allowed a target through the current freshness boundary
  When the adapter independently determines that the target is stale
  Then the adapter may reject it
  And no extrapolation is performed
  And the orchestrator remains authoritative for pre-adapter freshness decisions

Scenario: Freshness policy does not compare clock domains
  Given RobotTarget.sourceTimestamp is an epoch-millisecond timestamp
  And freshness uses monotonic milliseconds
  When freshness is evaluated
  Then sourceTimestamp is not compared directly with now or lastValidInputAt

Scenario: Freshness events are observable without policy logging
  When a freshness transition or target suppression occurs
  Then the policy returns the corresponding typed event
  And orchestration may add monotonic observation time and sequence
  And the policy performs no logging and no adapter effect

Scenario: Freshness policy is robot-independent
  When freshness and tracking-loss policy dependencies are inspected
  Then they depend on current TrackingValidity, monotonic time, freshness state, and generic control types
  And they do not depend on NASA, iMETRO, CLR, UR10e, Hand-E, SO-101, ROS, MoveIt, MuJoCo, or servo protocols
