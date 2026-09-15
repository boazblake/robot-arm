Feature: Requirement 18 - RobotAdapter contract

Requirement 18 converts trusted, robot-independent RobotTarget intent into a
robot-specific command and hands it to a transport boundary safely.

  unknown network payload (BDD19 boundary)
        -> canonical RobotTarget validation (BDD12)
        -> RobotTarget
        -> RobotAdapter
        -> robot-specific translation
        -> RobotTransport (BDD19)
        -> external robot
        -> actual feedback (BDD20)

BDD18 owns adapter lifecycle, capabilities, defensive validation, translation,
typed failures, stop adaptation, operation serialization, adapter events, and
freshness defense in depth. It does not own human tracking, calibration, control
permission, primary freshness, network delivery semantics, actual robot state,
or durable event recording.

The internal port remains strongly typed:

  RobotAdapter = {
    connect(): Promise<ConnectResult>
    disconnect(): Promise<DisconnectResult>
    sendTarget(target: RobotTarget): Promise<SendTargetResult>
    stop(): Promise<StopResult>
    status(): AdapterStatus
    capabilities(): RobotAdapterCapabilities
  }

BDD19 owns the serialized `unknown` boundary. BDD18 deliberately keeps
`sendTarget(target: RobotTarget)`. Defensive malformed-input scenarios cross the
TypeScript boundary with forged runtime values (for example
`as unknown as RobotTarget`) to protect the concrete adapter boundary.

AdapterStatus has exactly these values:

  disconnected
  connecting
  connected
  disconnecting

A new adapter starts disconnected. Status changes when a serialized operation
begins execution, not when it enters the queue:

  connect queued       -> disconnected
  connect begins       -> connecting
  connect succeeds     -> connected
  disconnect begins    -> disconnecting
  disconnect completes -> disconnected

Lifecycle and target operations share one ordered operation boundary. This
serializes connect, disconnect, sendTarget, and stop, including lifecycle races.

ConnectResult is:

  { ok: true, status: "connected" }
  { ok: false, reason: "transport-failed" | "timeout" }

DisconnectResult is:

  { ok: true, status: "disconnected" }
  { ok: false, reason: "transport-failed" | "timeout" }

StopResult is:

  { ok: true, status: "stop-request-accepted" }
  { ok: false, reason: "not-connected" | "transport-failed" | "timeout" | "robot-rejected" }

Connect and disconnect are idempotent. A lifecycle operation already in flight
is shared by concurrent callers. Failed connect returns to disconnected. A
 disconnect changes status to disconnecting before cleanup; cleanup failure leaves
status disconnected. A fresh successful connect starts a new command session.

RobotAdapter has no persistent stopped latch. BDD16 owns disabled, enabled, and
stopped control state. stop() requests a physical global stop and does not change
adapter status or control state. Stop failure likewise leaves control ownership
with BDD16 or BDD17.

SendTargetResult is:

  accepted
  not-connected
  target-invalid
  target-stale
  transport-failed
  timeout
  robot-rejected
  unsupported-intent
  translation-failed

`accepted` means the adapter validated and translated the target and
`RobotTransport.send` accepted the translated command. It does not mean remote
receipt, acknowledgement, execution, or reaching the requested position. BDD20
owns actual robot state. BDD18 never retries movement commands; BDD19 owns
transport delivery and retry semantics.

The adapter defensively invokes the canonical Requirement 12 validator for side,
normalized position, optional orientation, optional gripper, sourceTimestamp,
and sequence. Position components are finite and in normalized [-1, 1]. Concrete
adapters do not redefine these bounds. A supported intent that cannot produce a
valid robot command returns `translation-failed`; an external robot rejection
returns `robot-rejected`.

Target freshness comes only from an injected policy supplied by the adapter
factory:

  TargetFreshnessPolicy = (target: RobotTarget) => "fresh" | "stale"

The adapter does not compare timestamps with a monotonic clock and does not use
sequence ordering to determine staleness. BDD17 remains authoritative. Duplicate,
out-of-order, and retry behavior belongs to BDD19.

Capabilities are explicit adapter metadata:

  RobotAdapterCapabilities = {
    position: true
    orientation: boolean
    gripper: boolean
  }

Supplied orientation or gripper intent is rejected as `unsupported-intent` before
transport when unsupported. Optional intent is never silently dropped.

BDD18 calls a transport port rather than defining WebSocket, HTTP, ROS, or vendor
SDK behavior:

  RobotTransport = {
    connect(): Promise<...>
    disconnect(): Promise<...>
    send(command: unknown): Promise<...>
    stop(): Promise<...>
  }

Implementation-specific failures are translated at the adapter boundary:

  send while disconnected       -> not-connected
  stop while disconnected       -> not-connected
  connect transport failure     -> transport-failed
  connect deadline exceeded     -> timeout
  disconnect cleanup failure    -> transport-failed
  send write failure            -> transport-failed
  send deadline exceeded        -> timeout
  external command rejection    -> robot-rejected
  supported translation failure -> translation-failed

Events use an optional injected observer, not subscription state on the adapter:

  RobotAdapterObserver = (event: RobotAdapterEvent) => void
  createRobotAdapter({ transport, freshnessPolicy, observer })

Event delivery is synchronous, follows serialized operation order, is not
replayed or persisted, and is best effort. Observer exceptions are isolated and
never alter adapter operation results.

The event contract is:

  { type: "connected" | "disconnected" }
  { type: "target-accepted", sequence: number }
  { type: "target-rejected", sequence?: number, reason: SendTargetFailure }
  { type: "stop-requested" | "stop-accepted" }
  { type: "stop-failed", reason: StopFailure }

Every rejected sendTarget emits exactly one target-rejected event. A submitted
target produces either target-accepted or target-rejected, never both. A rejected
event includes sequence only when validation established a valid sequence. Events
do not contain complete RobotTargets, timestamps, or correlation IDs.

Scenario: A new adapter starts disconnected
  When a RobotAdapter is constructed
  Then status is "disconnected"

Scenario: Connect is serialized and status changes when execution begins
  Given the adapter is "disconnected"
  When connect is queued
  Then status remains "disconnected"
  When connect begins
  Then status becomes "connecting"
  And a successful result makes status "connected"
  And the event "connected" is observable

Scenario: Connect is idempotent and concurrent calls share one result
  Given the adapter is "connected" or connecting
  When connect is requested again
  Then it succeeds without a second transport connection

Scenario: Failed connect returns to disconnected
  Given the adapter is "disconnected"
  When connect fails
  Then status becomes "disconnected"
  And the typed connection failure is returned

Scenario: Disconnect changes status before cleanup
  Given the adapter is "connected"
  When disconnect begins
  Then status becomes "disconnecting"
  And new targets return "not-connected"
  When cleanup completes
  Then status becomes "disconnected"
  And the event "disconnected" is observable

Scenario: Disconnect is idempotent and concurrent calls share one result
  Given the adapter is "disconnected" or disconnecting
  When disconnect is requested again
  Then it succeeds without a second cleanup operation

Scenario: Failed disconnect remains disconnected
  Given the adapter is "connected"
  When cleanup fails
  Then status remains "disconnected"
  And the typed lifecycle failure is returned

Scenario: Valid target is accepted exactly once
  Given the adapter is "connected"
  And the target is valid
  When sendTarget is called
  Then it returns { ok: true, status: "accepted" }
  And transport receives the translated command
  And the event "target-accepted" is observable
  And no execution is implied

Scenario: Defensive validation rejects forged malformed input
  Given the adapter is "connected"
  When a forged value is passed as a RobotTarget with invalid side, position, orientation, gripper, sourceTimestamp, or sequence
  Then sendTarget returns "target-invalid"
  And no transport command is sent
  And exactly one "target-rejected" event is observable

Scenario: Disconnected and disconnecting targets are rejected
  Given the adapter is "disconnected" or "disconnecting"
  When sendTarget is called with a valid target
  Then it returns "not-connected"
  And it emits "target-rejected"
  And no transport command is sent

Scenario: Freshness defense uses only the injected policy
  Given the adapter is "connected"
  And the injected policy returns "stale"
  When sendTarget is called
  Then it returns "target-stale"
  And it emits "target-rejected"
  And no timestamp or sequence freshness rule is applied

Scenario: Unsupported intent is rejected before transport
  Given the adapter is "connected"
  And orientation or gripper capability is false
  When a target supplies that intent
  Then it returns "unsupported-intent"
  And it emits "target-rejected"
  And no transport command is sent

Scenario: Supported intent translation can fail
  Given the adapter is "connected"
  When supported intent cannot produce a safe robot command
  Then it returns "translation-failed"
  And it emits "target-rejected"
  And no transport command is sent

Scenario: Send and stop remain serialized
  Given the adapter is "connected"
  When send A, stop, and send B are requested in that order
  Then the adapter operation order is send A, stop, send B
  And BDD16 or BDD17 determines whether B reaches the adapter

Scenario: Connected stop requests a physical global stop
  Given the adapter is "connected"
  When stop begins
  Then "stop-requested" is observed before transport.stop
  When transport accepts the request
  Then stop returns "stop-request-accepted"
  And status remains "connected"
  And "stop-accepted" is observed

Scenario: Disconnected stop returns not-connected
  Given the adapter is "disconnected"
  When stop is called
  Then it returns "not-connected"
  And no transport stop is sent

Scenario: Connecting stop waits for connect
  Given connect is in progress
  When stop is called
  Then connect completes first
  And stop evaluates the resulting connection state

Scenario: Disconnecting stop waits for disconnect
  Given disconnect is in progress
  When stop is called
  Then disconnect completes first
  And stop returns "not-connected"

Scenario: Concurrent stops coalesce only while in flight
  Given one stop request is in flight
  When another stop request arrives
  Then only one transport stop is sent
  And both callers receive the same result

Scenario: A later stop may issue a new request
  Given a previous stop request has completed
  When stop is called again
  Then another transport stop may be issued

@integration
Scenario: Controlled tracking-loss stop does not create an adapter safety latch
  Given BDD17 has disabled both controls after input loss
  And the adapter remains "connected"
  When fresh input returns and BDD16 explicitly enables the right arm
  Then a right target may be accepted without reconnecting
  And the adapter has no second stopped state

@integration
Scenario: Emergency stop remains owned by BDD16
  Given BDD16 has set both controls to "stopped"
  When the adapter stop request completes
  Then targets remain blocked until BDD16 explicitly clears the emergency stop

Scenario: Adapter failures are isolated and typed
  Given LiftMate tracking is operational
  When an adapter operation fails
  Then tracking remains operational
  And no command is reported as executed
  And implementation-specific exceptions do not escape the adapter boundary

Scenario: Adapter does not emit transport or execution events
  When a target is accepted
  Then it emits neither "target-transported" nor "target-executed"
  And BDD19 and BDD20 own those later concerns

Scenario: Adapter does not retry movement commands
  Given sending a target encounters a transport failure or timeout
  When the adapter returns the failure
  Then it does not silently retry
  And BDD19 owns later delivery behavior
