# Robot Arm architecture

Camera input is handled by `src/features/tracking/camera.service.ts`. Platform-specific MediaPipe inference lives in `src/features/tracking/holistic.service.ts` and the native plugin adapter lives beside it. Results cross into application code only through `src/integration/normalize.ts` as `TrackingFrame` from `src/domain/tracking.ts`.

Rendering is isolated in `src/features/tracking/render.service.ts`. Deterministic geometry is in `src/domain/geometry.ts`; it has no camera, UI, or platform dependencies.

Future stages—`HumanArmPose`, `RobotMapper`, `RobotTarget`, and simulator/physical robot—are intentionally not implemented.
