# Architecture

LiftMate is organized by domain ownership. Camera access lives under `src/camera`,
MediaPipe normalization and inference under `src/tracking/adapters/mediapipe`, and
normalized human observations under `src/tracking/model`. Teleoperation policies are
under `src/teleoperation`; robot intent and ports are under `src/robotics`.

Application session orchestration composes these boundaries under `src/app/session`.
Rendering consumes prepared output from `src/rendering`, while diagnostic HUD code
lives under `src/app/hud`. Generic mathematical primitives are isolated under
`src/shared/geometry`.
