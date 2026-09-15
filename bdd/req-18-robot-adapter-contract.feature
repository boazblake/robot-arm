Feature: Requirement 18 - RobotAdapter contract

Robot adapters consume robot-independent RobotTarget intent without redefining the
teleoperation domain. BDD19 owns the untrusted serialized boundary:

  unknown network payload
        -> canonical runtime RobotTarget validation
        -> RobotTarget
        -> RobotAdapter.sendTarget()

The internal adapter port remains strongly typed:

  RobotAdapter = {
    connect(): Promise<ConnectResult>
    disconnect(): Promise<DisconnectResult>
    sendTarget(target: RobotTarget): Promise<SendTargetResult>
    stop(): Promise<StopResult>
    status(): AdapterStatus
    capabilities(): RobotAdapterCapabilities
  }

AdapterStatus has exactly these values:

  disconnected
  connecting
  connected
  disconnecting

A new adapter starts disconnected. Lifecycle and target operations share one
ordered operation boundary. This serializes connect, disconnect, sendTarget, and
stop, including send-versus-stop and send-versus-disconnect races.

ConnectResult is:

  { ok: true, status: "connected" }
  { ok: false, reason: "transport-failed" | "timeout" }

DisconnectResult is:

  { ok: true, status: "disconnected" }
  { ok: false, reason: "transport-failed" | "timeout" | "robot-rejected" }

StopResult is:

  { ok: true, status: "stop-request-accepted" }
  { ok: false, reason: "transport-failed" | "timeout" | "robot-rejected" }

RobotAdapter does not contain a persistent stopped latch. BDD16 owns disabled,
enabled, and stopped control state. stop() requests a physical global stop and
does not change adapter status or control state. Stop failure likewise leaves
control ownership with BDD16 or BDD17.

Connect and disconnect are idempotent. A connect or disconnect already in flight
is shared by concurrent callers. A connected adapter does not open a second
connection; a disconnected adapter disconnects successfully without transport
work. A new connection starts a new command session.

SendTargetResult is:

  accepted
  not-connected
  target-invalid
  target-stale
  transport-failed
  timeout
  robot-rejected
  unsupported-intent

`accepted` means the concrete adapter validated, translated, and handed the
command to its transport boundary. It does not mean that the remote robot
received, acknowledged, executed, or reached the command. BDD20 owns actual robot
state and feedback. The adapter does not retry movement commands; BDD19 owns
transport delivery and retry semantics.

The adapter defensively validates the target against the canonical Requirement 12
validator. The validator owns side, normalized position, optional orientation,
optional gripper, sourceTimestamp, and sequence. Position components are finite
and in normalized [-1, 1] coordinates. Adapters do not redefine these bounds.
Concrete adapters may reject a target when robot-specific physical translation
cannot represent it safely.

Target freshness comes only from an injected policy:

  TargetFreshnessPolicy = (target: RobotTarget) => "fresh" | "stale"

The adapter does not compare timestamps with a monotonic clock and does not use
sequence ordering to determine staleness. BDD17 remains authoritative; adapter
freshness is defense in depth. Sequence ordering, duplicate handling, and
out-of-order delivery belong to BDD19.

Capabilities are explicit:

  RobotAdapterCapabilities = {
    position: true
    orientation: boolean
    gripper: boolean
  }

An adapter rejects supplied orientation or gripper intent with
`unsupported-intent` before transport when the corresponding capability is false.
Optional intent is never silently discarded.

Concrete adapters translate normalized positions into physical robot coordinates
inside their own boundary. Human tracking, HumanArmPose, teleoperation mapping,
MediaPipe, UI, and BDD16/17 control decisions remain outside adapters.

Concrete adapter failures are translated into stable results. Vendor SDK,
WebSocket, ROS, HTTP, and other implementation-specific errors do not escape the
RobotAdapter boundary:

  connection unavailable       -> not-connected
  canonical validation failure -> target-invalid
  freshness policy rejection   -> target-stale
  unsupported optional field   -> unsupported-intent
  transport/write failure      -> transport-failed
  configured deadline exceeded -> timeout
  explicit external rejection -> robot-rejected

Adapter observability uses only these events:

  connected
  disconnected
  target-accepted
  target-rejected
  stop-requested
  stop-accepted
  stop-failed

The event contract is:

  RobotAdapterEvent =
    { type: "connected" | "disconnected" }
    { type: "target-accepted", sequence: number }
    { type: "target-rejected", sequence?: number, reason: SendTargetFailure }
    { type: "stop-requested" | "stop-accepted" }
    { type: "stop-failed", reason: AdapterStopFailure }

Events do not contain complete RobotTargets, timestamps, or correlation IDs.
BDD19 may add transport correlation events and BDD20 may add execution events.
Requirement 18 never reports `target-transported` or `target-executed`.

Scenario: A new adapter starts disconnected
  When a RobotAdapter is constructed
  Then status is "disconnected"

Scenario: Connect establishes a command session
  Given the adapter is "disconnected"
  When connect succeeds
  Then it returns a successful connection result
  And status becomes "connected"
  And the event "connected" is observable

Scenario: Connect is idempotent and concurrent connects share one result
  Given the adapter is "connected" or a connection is already in progress
  When connect is requested again
  Then it succeeds without a second connection operation

Scenario: Disconnect blocks targets before cleanup completes
  Given the adapter is "connected"
  And transport cleanup has not completed
  When disconnect is requested
  Then status becomes "disconnecting" immediately
  And new targets are rejected with reason "not-connected"
  And the event "disconnected" is observable when cleanup completes

Scenario: Disconnect is idempotent and concurrent disconnects share one result
  Given the adapter is "disconnected" or a disconnect is already running
  When disconnect is requested again
  Then it succeeds without a second cleanup operation

Scenario: An adapter accepts a valid RobotTarget
  Given the adapter is "connected"
  And a valid Requirement 12 RobotTarget is supplied
  When sendTarget is called
  Then it returns { ok: true, status: "accepted" }
  And the event "target-accepted" is observable
  And physical robot execution is not implied

Scenario: Runtime validation rejects malformed target data
  Given the adapter is "connected"
  When a target has an invalid side, normalized position, orientation, gripper, sourceTimestamp, or sequence
  And sendTarget is called
  Then it returns { ok: false, reason: "target-invalid" }
  And no robot command is sent
  And the event "target-rejected" is observable

Scenario: Adapter rejects targets while disconnected or disconnecting
  Given the adapter is "disconnected" or "disconnecting"
  When sendTarget is called with a valid target
  Then it returns { ok: false, reason: "not-connected" }
  And no robot command is sent

Scenario: Adapter applies injected freshness defense in depth
  Given the adapter is "connected"
  And the injected TargetFreshnessPolicy returns "stale"
  When sendTarget is called
  Then it returns { ok: false, reason: "target-stale" }
  And no robot command is sent
  And the adapter does not invent another freshness or sequence rule

Scenario: Unsupported optional intent is rejected before transport
  Given the adapter is "connected"
  And orientation or gripper capability is false
  When a target supplies that unsupported intent
  Then it returns { ok: false, reason: "unsupported-intent" }
  And no robot command is sent

Scenario: Send and stop remain serialized
  Given the adapter is "connected"
  When send A, stop, and send B are requested in that order
  Then the adapter operation order remains send A, stop, send B
  And BDD16 or BDD17 determines whether B is permitted

Scenario: Stop requests a physical global stop without changing adapter state
  Given the adapter is "connected"
  When stop is called
  Then the event "stop-requested" is observable before the external request
  And status remains "connected"
  And a successful result is { ok: true, status: "stop-request-accepted" }
  And the event "stop-accepted" is observable

Scenario: Failed stop leaves control ownership with BDD16 or BDD17
  Given the adapter is "connected"
  When the external stop request fails
  Then it returns a typed stop failure
  And status remains "connected"
  And the event "stop-failed" is observable
  And the adapter does not change control state

Scenario: Concurrent stop calls share one external request
  Given the adapter is "connected"
  And one stop request is in flight
  When another stop request arrives before completion
  Then both calls receive the same result
  And only one external stop request is sent

Scenario: A later stop may issue a new physical stop request
  Given a previous stop request has completed
  When stop is called again
  Then a new physical stop request may be issued
  And no persistent adapter stop latch is required

Scenario: Tracking loss does not require adapter reconnection
  Given BDD17 has disabled both controls after input loss
  And the adapter remains "connected"
  When fresh input returns and the right arm is explicitly enabled
  Then right target transmission may resume without reconnecting

Scenario: Emergency stop remains owned by BDD16
  Given BDD16 has set both controls to "stopped"
  When the adapter stop request completes
  Then targets remain blocked until BDD16 explicitly clears the emergency stop
  And the adapter does not provide a second stopped state

Scenario: Adapter failure is isolated
  Given LiftMate tracking is operational
  When an adapter operation fails
  Then tracking remains operational
  And no command is reported as executed
  And the failure is returned as typed adapter data

Scenario: Adapter translates normalized position internally
  Given a valid RobotTarget position is within normalized [-1, 1] workspace coordinates
  When a concrete adapter accepts it
  Then that adapter converts it to its robot-specific physical coordinate system
  And the browser tracking and mapping domains remain unchanged

Scenario: Adapter does not perform human tracking
  When an adapter is inspected
  Then it does not use MediaPipe
  And it does not process camera frames
  And it does not calculate HumanArmPose
  And it does not import UI or tracking modules

Scenario: Adapter does not report execution or transport events
  When a target is accepted
  Then it does not emit "target-transported"
  And it does not emit "target-executed"
  And actual execution is established only by Requirement 20 feedback

Scenario: Adapter does not retry movement commands
  Given sending a target encounters a transport failure or timeout
  When the adapter returns the failure
  Then it does not silently retry the movement command
  And Requirement 19 owns later delivery behavior
