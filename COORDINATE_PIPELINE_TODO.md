# Tracking-to-robot architecture TODO

Progress markers: `[_____]` not started, `[###__]` in progress, `[#####]` complete.

## Shape and boundary redesign

- [#####] Inventory existing tracking, rendering, calibration, mapping, diagnostics, and adapter contracts.
- [#####] Define model-specific detector observations (`PoseObservation`, `HandObservation`, `FaceObservation`).
- [#####] Define distinct image points, canonical points, vectors, and workspace positions.
- [#####] Define one authoritative `HumanFrame` shape.
- [###__] Remove parallel legacy/new representations from the active pipeline.

## Canonical human frame

- [#####] Implement deterministic torso basis and documented fallback.
- [#####] Convert body, face, arm, wrist, and hand data into canonical geometry.
- [#####] Separate `VisualHandMesh` from `HandControlPoint`.
- [#####] Convert hand-local offsets using measured palm/shoulder scale.
- [#####] Add stable hand identity assignment and regression tests.

## Rendering and UI frame

- [_____] Define explicit camera registration for rendering without breaking the existing projection.
- [###__] Implement one shared UI yaw/reflection transform for vectors and render-relative points.
- [_____] Restore and verify face/body/hand visual alignment at 0°, 60°, and 90°.
- [#####] Preserve the known-good CSS mirror behavior in the active renderer.

## Control pipeline

- [#####] Store canonical neutral control points only.
- [#####] Preserve calibration across tracking loss and recovery.
- [#####] Apply UI transform exactly once to displacement.
- [#####] Declare robot workspace signs in one mapping boundary.
- [#####] Preserve `RobotTarget` and adapter contracts.
- [#####] Add compact stage-complete diagnostics.

## Verification

- [#####] Add focused shape and transform tests, including branded-space compilation boundaries.
- [#####] Add calibrated target-direction tests at 0°, 60°, and 90°.
- [#####] Run typecheck, lint, focused tests, full tests, and build.
- [#####] Verify no accidental changes to pre-existing user work.
- [_____] Mark this work complete only after visual alignment and target-direction evidence pass.
