Feature: Requirement 19 - Browser to adapter transport

LiftMate communicates with an external adapter through bidirectional WebSocket transport.

Scenario: Browser sends RobotTarget
Given LiftMate is running in a browser
And the adapter is reachable
When RobotTarget is produced
Then LiftMate can send it over WebSocket

Scenario: Adapter sends RobotState
Given the adapter has robot state
When the state is available
Then the adapter can send RobotState over WebSocket

Scenario: Transport preserves semantics
Given RobotTarget crosses the transport boundary
When the adapter receives it
Then its intent remains equivalent

Scenario: Mobile uses the same contract
Given LiftMate runs on desktop or mobile
Then both platforms use the same RobotTarget transport contract
And neither requires local ROS 2

# Final contract clarifications

The browser transport is an ephemeral live stream. RobotTarget and RobotState are
never replayed, retried, queued for reconnect, or acknowledged. Only control-enable,
stop, and disconnect use request-response control operations.

BDD18 owns RobotCommand construction and robot-specific translation. BDD19 only
validates the canonical RobotTarget at its boundary, serializes the resulting
RobotCommand, and transports it. The shared BDD18 port is:

  RobotCommand = RobotTarget
  RobotTransport.send(command: RobotCommand): TransportTargetResult
  RobotTransport.stop(): Promise<TransportStopResult>

Scenario: A stale control-enable policy result cannot activate a connection
  Given control-enable policy evaluation is in progress
  When the connection is closed, revoked, or its generation changes
  And the policy later allows control
  Then the server does not set controlState to "active"
  And it does not send a successful control-enable result

Scenario: A stale stop completion cannot affect a replacement connection
  Given RobotAdapter.stop is in progress for a connection
  When that connection is invalidated
  Then the server does not send its stop result to a replacement connection
  And the completion is diagnostic only
  And it cannot change the replacement connection control state

Scenario: Disconnect cancels queued controls before closing the socket
  Given control-enable or stop is queued but WebSocket.send has not started
  When disconnect begins
  Then the queued operation resolves "not-connected"
  And the transport enters "closing"
  And no queued control message is sent
  When disconnect completes
  Then the transport is "disconnected"

Scenario: Disconnect makes transmitted controls uncertain
  Given control-enable or stop was transmitted and its result is outstanding
  When disconnect begins or the socket is lost
  Then the operation resolves "delivery-unknown"
  And its correlation is removed
  And a late result cannot resolve it again

Scenario: Server receive processing awaits each adapter operation
  Given a connection receives target A, stop, and target B in that order
  When RobotAdapter.sendTarget for target A is asynchronous
  Then the receive queue awaits target A processing before processing stop
  And stop sets controlState to "stopped" before awaiting RobotAdapter.stop
  And target B is processed only after stop processing completes
  And target B does not reach RobotAdapter.sendTarget

Scenario: Connection invalidation wins over an asynchronous target completion
  Given RobotAdapter.sendTarget has started for a connection
  When that connection is invalidated before the adapter operation completes
  Then the adapter completion cannot send adapter-error to the client
  And it cannot change any replacement connection
  And any diagnostic is scoped to the invalidated connection only

Scenario: BDD18 owns robot command translation
  Given BDD18 supplies a RobotCommand to BDD19
  When BDD19 sends the command
  Then BDD19 does not select robot-specific mappings
  And BDD19 does not import concrete robot protocols
  And BDD19 transports the command without changing its intent

Scenario: Control-enable is idempotent while active
  Given the connection controlState is "active"
  When sendControlEnable is requested again
  Then it returns an acknowledged result
  And it does not send a second control-enable message

Scenario: Control-enable is required while stopped
  Given the connection controlState is "stopped"
  When sendControlEnable is requested
  Then the request is sent through the control scheduler
  And controlState becomes "active" only after the policy allows it
  And a new connection requires a new control-enable request

Scenario: Repeated control-enable calls share one request
  Given control-enable is transmitted and awaiting its result
  When another control-enable request arrives
  Then only one request is sent
  And both callers receive the same result

Scenario: Client-side target validation uses the canonical validator
  Given a forged RobotTarget crosses the BDD19 client boundary
  When canonical BDD12 validation rejects it
  Then sendTarget returns "target-invalid"
  And no JSON is serialized
  And no sequence is consumed
  And WebSocket.send is not called

Scenario: BDD19 public result and event unions are closed
  Then TransportTargetResult reasons are "not-connected", "target-invalid",
    "message-too-large", "backpressure", "serialization-failed", or "transport-failed"
  And TransportControlEnableResult reasons are "not-connected", "closing",
    "control-superseded", "transport-failed", "timeout", "remote-rejected", or "delivery-unknown"
  And TransportStopResult reasons are "not-connected", "closing", "transport-failed",
    "timeout", "remote-rejected", or "delivery-unknown"
  And no public transport event uses reason type "string"

The public client port is:

  RobotTransportClient = {
    connect(): Promise<TransportConnectResult>
    disconnect(): Promise<TransportDisconnectResult>
    sendTarget(target: RobotTarget): TransportTargetResult
    sendControlEnable(): Promise<TransportControlEnableResult>
    sendStop(): Promise<TransportStopResult>
    onRobotState(listener: (event: RobotStateEvent) => void): Unsubscribe
    onAdapterError(listener: (event: AdapterErrorEvent) => void): Unsubscribe
    onEvent(listener: (event: TransportEvent) => void): Unsubscribe
    status(): TransportStatus
  }

The live-stream wire envelopes are:

  RobotTargetMessage = {
    version: 1
    type: "robot-target"
    sequence: number
    payload: RobotTarget
  }

  RobotStateMessage = {
    version: 1
    type: "robot-state"
    sequence: number
    payload: RobotState
  }

  ControlEnableMessage = {
    version: 1
    type: "control-enable"
    requestId: string
  }

  StopMessage = {
    version: 1
    type: "stop"
    requestId: string
  }

  ControlEnableResultMessage = {
    version: 1
    type: "control-enable-result"
    requestId: string
    result: { ok: true } | { ok: false; reason: "forbidden" | "remote-rejected" }
  }

  StopResultMessage = {
    version: 1
    type: "stop-result"
    requestId: string
    result: { ok: true } | { ok: false; reason: "remote-rejected" }
  }

All received frames enter one FIFO per connection. The server likewise owns one
FIFO receive boundary and one prioritized outbound boundary. Server control
responses are sent before unsent telemetry; telemetry has at most one unsent
RobotState and one unsent AdapterError per connection and is disposable.

The public client event contract is:

  TransportEvent =
    connection-lost(reason: "network" | "server" | "authentication-expired" |
      "authorization-revoked" | "protocol-error")
    disconnected
    stale-control-result
    target-dropped(sequence: number, reason: "duplicate-or-old")
    invalid-robot-state

  AdapterErrorEvent =
    stream: "adapter-error"
    sequence: number
    targetSequence: number
    reason: "target-invalid" | "target-stale" | "unsupported-intent" |
      "translation-failed" | "robot-rejected"

  RobotStateEvent =
    stream: "robot-state"
    sequence: number
    state: RobotState

The public server event contract is:

  ServerTransportEvent =
    target-rejected(sequence: number, reason: "control-stopped" | "unauthorized" |
      "duplicate-or-old" | "target-invalid")
    connection-lost(connectionId: string)

Scenario: Server emits a typed rejection after stop
  Given the connection controlState is "active"
  When stop is processed before target 42
  Then controlState becomes "stopped" before RobotAdapter.stop is awaited
  When target 42 is processed
  Then the server emits target-rejected with reason "control-stopped"
  And RobotAdapter.sendTarget is not called

Scenario: Stale asynchronous completions are isolated by connection generation
  Given a connection callback captures generation A
  When the transport invalidates generation A and creates generation B
  Then callbacks from generation A are ignored
  And they cannot resolve generation B controls
  And they cannot publish generation B RobotState or adapter errors
