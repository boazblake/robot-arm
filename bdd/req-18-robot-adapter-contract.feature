Feature: Requirement 18 - RobotAdapter contract

Robot adapters consume robot-independent RobotTarget intent without redefining the
teleoperation domain. Runtime validation is required at this boundary because
future targets may arrive serialized through Requirement 19.

The adapter interface is:

  RobotAdapter = {
    connect(): Promise<AdapterConnectionResult>
    disconnect(): Promise<AdapterResult>
    sendTarget(target: RobotTarget): Promise<SendTargetResult>
    stop(): Promise<StopResult>
    status(): AdapterStatus
  }

AdapterStatus has exactly these values:

  disconnected
  connected
  stopped

A new adapter starts disconnected. `sendTarget` is adapter acceptance, not
physical execution. A successful result means the adapter validated the target
and accepted responsibility for sending it to its external interface. It does not
mean that the robot moved, reached the target, or acknowledged completion.
Requirement 20 owns requested versus actual robot state.

SendTargetResult is:

  accepted
  not-connected
  target-invalid
  target-stale
  transport-failed
  timeout
  robot-rejected
  adapter-stopped
  unsupported-intent

The adapter validates side, position, optional orientation, optional gripper,
sourceTimestamp, and sequence at runtime against Requirement 12. Expected
malformed input and adapter failures return typed results and do not throw.
`target-stale` describes a particular RobotTarget. `input-stale` and `input-lost`
remain Requirement 17 human-input freshness results.

The adapter receives an injected TargetFreshnessPolicy. It does not invent its own
elapsed-time timeout or compare RobotTarget epoch timestamps with a monotonic
clock. Requirement 17 supplies the freshness policy. The orchestrator remains the
authoritative freshness boundary; adapter freshness is defense in depth.

Position conversion from normalized Requirement 12 workspace coordinates into a
robot's physical coordinate system belongs inside the concrete adapter. Human
tracking, HumanArmPose, and teleoperation mapping remain outside adapters.

`stop()` is a global stop request, not confirmation that the robot is stationary.
The adapter sets its local status to stopped before awaiting the external request.
While stopped, `sendTarget` returns `adapter-stopped`. A successful stop means the
external interface accepted the global stop request. A failed stop leaves the
adapter locally stopped.

Concurrent stop calls share one in-flight external stop operation. After a
successful stop, later stop calls are safe and return stopped success without
sending duplicate external stop requests. The adapter does not expose resume.

Disconnect sets status to disconnected before transport cleanup completes and
blocks target acceptance immediately. A fresh successful connect starts a new
command session and clears the adapter stop latch. Reconnection is required after
a global stop before new targets can be accepted.

Adapter failures do not stop or corrupt the LiftMate tracking pipeline. The
adapter does not retry movement commands; delivery and retry behavior belong to
Requirement 19.

Adapter observability distinguishes:

  target-received
  target-rejected
  target-accepted
  target-transported
  stop-requested
  stop-accepted
  stop-failed
  connected
  disconnected

Requirement 18 never reports `target-executed`; actual execution requires robot
feedback from Requirement 20.

Scenario: A new adapter starts disconnected
  When a RobotAdapter is constructed
  Then status is "disconnected"

Scenario: Connect establishes a command session
  Given the adapter is "disconnected"
  When connect succeeds
  Then it returns a successful connection result
  And status becomes "connected"
  And the stop latch is clear
  And the event "connected" is observable

Scenario: Disconnect blocks targets before cleanup completes
  Given the adapter is "connected"
  And transport cleanup has not completed
  When disconnect is requested
  Then status becomes "disconnected" immediately
  And new targets are rejected with reason "not-connected"
  And the event "disconnected" is observable

Scenario: An adapter accepts a valid RobotTarget
  Given the adapter is "connected"
  And a valid Requirement 12 RobotTarget is supplied
  When sendTarget is called
  Then it returns { ok: true, status: "accepted" }
  And the event "target-received" is observable
  And the event "target-accepted" is observable
  And physical robot execution is not implied

Scenario: Runtime validation rejects malformed target data
  Given the adapter is "connected"
  When a target has an invalid side, position, orientation, gripper, sourceTimestamp, or sequence
  And sendTarget is called
  Then it returns { ok: false, reason: "target-invalid" }
  And no robot command is sent
  And the event "target-rejected" is observable

Scenario: Adapter rejects targets while disconnected
  Given the adapter is "disconnected"
  When sendTarget is called with a valid target
  Then it returns { ok: false, reason: "not-connected" }
  And no robot command is sent

Scenario: Adapter rejects targets while stopped
  Given the adapter is "stopped"
  When sendTarget is called with a valid target
  Then it returns { ok: false, reason: "adapter-stopped" }
  And no robot command is sent

Scenario: Adapter applies injected freshness defense in depth
  Given the adapter is "connected"
  And the injected TargetFreshnessPolicy returns "stale"
  When sendTarget is called
  Then it returns { ok: false, reason: "target-stale" }
  And no robot command is sent
  And the adapter does not invent another freshness timeout

Scenario: Orchestrator freshness remains authoritative
  Given Requirement 17 has rejected a target as "input-stale" or "input-lost"
  When the target reaches the adapter boundary
  Then the orchestrator has already prevented normal transmission
  And any adapter rejection is defense in depth

Scenario: Stop blocks target acceptance before external stop completes
  Given the adapter is "connected"
  And the external stop request has not completed
  When stop is called
  Then status becomes "stopped" immediately
  And a concurrent sendTarget returns "adapter-stopped"
  And the external stop request is still awaited

Scenario: Successful stop means stop request accepted
  Given the adapter is "connected"
  When the external interface accepts the global stop request
  Then stop returns { ok: true, status: "stop-request-accepted" }
  And status remains "stopped"
  And physical stationary state is not claimed
  And the event "stop-accepted" is observable

Scenario: Failed stop preserves local stopped state
  Given the adapter is "connected"
  And the external stop request fails with transport failure, timeout, or robot rejection
  When stop is called
  Then it returns a typed failure with the corresponding reason
  And status remains "stopped"
  And the event "stop-failed" is observable

Scenario: Concurrent stop calls share one external request
  Given the adapter is "connected"
  And one stop request is in flight
  When another stop request arrives before completion
  Then both calls receive the same semantic result
  And only one external stop request is sent

Scenario: Repeated stopped calls are idempotent
  Given stop has completed successfully
  When stop is called again
  Then it returns successful stopped status
  And no duplicate external stop request is sent

Scenario: Reconnect clears the adapter stop latch
  Given the adapter is "stopped"
  When disconnect completes
  And a fresh connect succeeds
  Then status becomes "connected"
  And a valid target may be accepted
  And no resume operation is required

Scenario: Adapter failure is isolated
  Given LiftMate tracking is operational
  When an adapter operation fails
  Then tracking remains operational
  And no command is reported as executed
  And the failure is returned as typed adapter data

Scenario: Compatible intent means Requirement 12 semantics
  Given another robot supports position, side, sourceTimestamp, and sequence
  When another adapter is implemented
  Then HumanArmPose and TeleopMapper require no robot-specific changes
  And optional orientation and gripper support may differ
  And unsupported supplied optional intent returns "unsupported-intent"

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

Scenario: Adapter does not report execution
  When a target is accepted and transported
  Then it does not emit "target-executed"
  And actual execution is established only by Requirement 20 feedback

Scenario: Adapter does not retry movement commands
  Given sending a target encounters a transport failure or timeout
  When the adapter returns the failure
  Then it does not silently retry the movement command
  And Requirement 19 owns later delivery behavior
