# Architecture

LiftMate is organized by domain ownership. Camera access lives under `src/camera`,
MediaPipe normalization and inference under `src/tracking/adapters/mediapipe`, and
normalized human observations under `src/tracking/model`. Teleoperation policies are
under `src/teleoperation`; robot intent and ports are under `src/robotics`.

## Requirement 19 transport boundary

The frozen transport path is:

```text
ClrRobotAdapter
    ↓
RosTransport
    ↓
rosbridge / roslibjs client boundary
    ↓
WebSocket
    ↓
rosbridge_suite
    ↓
ROS 2
```

The reverse path is the same boundary in the opposite direction. `RosTransport` is
semantic-neutral: it publishes caller-provided messages to caller-provided channels
and validates inbound payloads without converting them into robot domain types.
`clr_ws` remains external. `RobotState` is Requirement 20, CLR mapping is later,
and ROS integration and OInK are later responsibilities. Requirement 19 does not
create a `ClrRobotAdapter`, select ROS message schemas, or define ROS channel names.

Application session orchestration composes these boundaries under
`src/app/session`. Rendering consumes prepared output from `src/rendering`, while
diagnostic HUD code lives under `src/app/hud`. Generic mathematical primitives are
isolated under `src/shared/geometry`.
