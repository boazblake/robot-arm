# Canonical tracking-to-robot pipeline review

## Decision

Use direct reuse of the validated MediaPipe landmarks, translated once into a typed canonical human scene. Reconstructing independent pose/face/hand coordinate systems was rejected: it duplicates detector conventions and cannot preserve hand attachment. The renderer and teleoperation consume the same `buildCanonicalHumanScene` output and the same `uiTransform`.

## Pipeline

```text
raw MediaPipe
 -> normalizeTrackingResult (validated DetectorLandmarkSpace)
 -> buildCanonicalHumanScene (CanonicalHumanSpace)
 -> explicit neutral calibration
 -> calibratedDisplacement = current - neutral
 -> uiTransform: Tsoding Y yaw, then front-camera X reflection
 -> declared workspace mapping signs
 -> stabilization
 -> RobotTarget
```

Rendering uses `CanonicalHumanSpace -> uiTransform -> projectTsoding -> canvas`. Vectors are transformed without translation or projection. Rotation is applied once.

## Shapes, spaces, and conventions

The active boundary shapes are model-specific and do not expose a generic `x/y/z` object:

- `PoseObservation`: image x/y plus `poseDepth`.
- `HandObservation`: image x/y plus `wristRelativeDepth`.
- `FaceObservation`: image x/y plus `faceDepth`.
- `HumanFrame`: the one canonical representation shared by rendering, calibration, and control. Its canonical geometry is normalized by measured shoulder width; rendering carries that scale and torso image registration explicitly.
- `CanonicalPoint`/`CanonicalVector`: relative human-frame geometry.
- `CalibratedDisplacement`: a vector, never a point.
- `RobotWorkspacePosition`: the adapter-facing mapped position.

- `DetectorLandmarkSpace`: normalized detector x/right, y/down, model-specific z. Hand z is wrist-relative and is never added to pose z.
- `CanonicalHumanSpace`: origin is the midpoint of shoulder midpoint and hip midpoint. +x is left shoulder to right shoulder, +y is torso-up, and +z is `+x × +y`. If either complete shoulder/hip pair is missing, the deterministic fallback is image-right/image-up/camera-depth.
- `CalibratedDisplacementSpace`: canonical control point minus the stored canonical neutral point.
- `UiFrameSpace`: `x' = x cos θ - z sin θ`, `z' = x sin θ + z cos θ`, `y' = y`, followed by `x' = -x'` for the front camera. Rear camera has no reflection.
- `RobotWorkspaceSpace`: explicit workspace mapping signs in `teleop-session.ts`; no correction is hidden in calibration, rendering, or adapters. Existing RobotTarget and adapter contracts remain unchanged.

The torso frame converts body and face points directly. A hand wrist is attached to the canonical pose wrist. Hand-local x/y/z offsets are scaled by `shoulderWidth / palmWidth`; this is the only hand-depth conversion. `VisualHandMesh` preserves internal geometry, while `HandControlPoint` is the palm center used for control.

## Calibration and identity

Calibration captures canonical neutral points only. Tracking loss and recovery preserve them; only explicit side reset or session reset clears them. Hand assignment uses pose-wrist proximity and minimum-cost one-to-one assignment before detector labels, so a temporary label swap does not change side identity.

## Diagnostics and acceptance tests

The HUD snapshot emits rounded `rotationDegrees`, camera, calibration, validity, raw wrist/palm anchors, canonical control/neutral points, canonical displacement, UI-frame displacement, mapped, stabilized, and target values. The focused tests cover zero neutral displacement, axis movement, yaw at 0/60/90 degrees, reflection, rear camera, hand-local scale/depth, wrist attachment, identity assignment, loss/recovery, shared rendering/control rotation, distance preservation, and target/diagnostic consistency. The final calibrated 0° and 60°/90° direction checks must be run against captured frames before release.

## Rejected alternative

A raw-coordinate reconstruction would keep pose, hand, face, rendering, and robot signs in separate adapters. It was rejected because MediaPipe hand z is wrist-relative and because separate pivots/sign corrections caused the previous mirrored behavior.
