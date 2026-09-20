# Live rotation investigation

## Scope

This is an investigation only. No coordinate-frame correction is applied here. The committed face-mesh change is `19146b30`.

## Finding

The current live renderer does apply the selected viewer rotation to every newly received frame. The failure is not a cached-frame or cumulative-rotation bug.

The inconsistency is that the live renderer, teleoperation pipeline, and frozen pose-world diagnostic use different 3D representations:

- live preview pose: normalized `poseLandmarks` plus detector `z`
- live preview hands: normalized hand landmarks, with hand `z` manually offset by the pose wrist
- live preview face: normalized face landmarks rotated around a face-local centroid
- teleoperation: canonical torso-relative coordinates from `buildCanonicalHumanScene`
- frozen diagnostic: `poseWorldLandmarks` in meters, hip-centered, orthographic

The selected viewer rotation is not one transformation applied to one common live model.

## Current live data path

### Web acquisition

`src/tracking/adapters/mediapipe/holistic-service.ts`

1. `HolisticLandmarker.detectForVideo(video, timestamp)` returns the current frame.
2. `normalizeTrackingResult(...)` stores:
   - `poseLandmarks`
   - optional `poseWorldLandmarks`
   - `leftHandLandmarks`
   - `rightHandLandmarks`
   - `faceLandmarks`
3. `tracking.frame(frame)` stores the frame.
4. `processTrackingFrame(frame)` separately builds the canonical/control pipeline.

The live renderer does not consume `poseWorldLandmarks`.

### Pose overlay

`src/rendering/render-service.ts`

```text
tracking.frame()
  -> alignHandDepthToPose()
  -> drawPreviewFrame()
  -> drawPose()
  -> previewMapper()
  -> rotatePreviewPoint()
  -> rotateIntoPreviewFrame()
  -> perspective unprojection/reprojection
  -> videoRenderRect()
  -> canvas pixels
```

`rotatePreviewPoint()` is called by `previewMapper()` for every pose point on every render frame. It is not using a frozen or cached pose.

### Hands

```text
tracking.frame()
  -> alignHandDepthToPose()
  -> drawPreviewFrame()
  -> previewMapper()
  -> rotatePreviewPoint()
  -> canvas pixels
```

`alignHandDepthToPose()` adds the pose wrist `z` to hand `z`. This is an adapter between two detector conventions, not a validated common metric model.

### Face

```text
tracking.frame()
  -> drawPreviewFrame()
  -> rotatePreviewMesh()
  -> face-centroid local rotation
  -> video render rectangle
  -> canvas pixels
```

Face rotation is therefore different from pose/hand rotation. It uses a face-local centroid and direct normalized coordinates; pose and hands use `rotatePreviewPoint()` with camera-distance unprojection/reprojection.

### Teleoperation/control

`src/app/session/teleop-session.ts`

```text
TrackingFrame
  -> buildCanonicalHumanScene()
  -> canonical hand control point
  -> calibratedDisplacement()
  -> coordinateRotation()
  -> rotateIntoPreviewFrame()
  -> workspace mapping
```

This is a separate path from the canvas renderer. It rotates calibrated displacement, not the complete rendered pose/face/hand model.

## Viewer rotation state

`src/app/session/store.ts`

- State: `previewRotationDegrees`
- Units: degrees
- Mutation: `rotatePreview(direction)` in 10-degree steps
- Range: `-360` to `+360`
- Render consumption: `previewMapper()` and `rotatePreviewMesh()`
- Control consumption: `coordinateRotation()` in `teleop-session.ts`
- Frozen diagnostic consumption: `diagnosticPoseWorldAngle()` through `rotatePoseWorld()`

The rotation is applied on every live render frame. There is no evidence of cumulative `P1 = rotate(P0)` behavior.

## Actual order versus desired order

The frozen diagnostic follows the desired isolated order:

```text
poseWorldLandmarks
  -> frozen source
  -> hip-centered pure rotation
  -> orthographic projection
  -> canvas
```

The live renderer currently follows multiple different orders:

```text
normalized detector landmarks
  -> per-group depth adaptation
  -> group-specific rotation/unprojection
  -> projection/framing
  -> canvas
```

and independently:

```text
normalized detector landmarks
  -> canonical torso frame
  -> calibration/displacement
  -> viewer rotation on displacement only
  -> workspace mapping
```

There is no single `common 3D model -> viewer rotation -> projection` pipeline for all live groups.

## Why the 90-degree movement appears camera-relative

The current code does not fail because it forgets to apply the angle to new frames. It fails conceptually because the live points are not a single metric model:

1. The live pose renderer rotates normalized image landmarks, not pose-world landmarks.
2. MediaPipe hand `z` is wrist-relative and is patched with pose wrist `z`.
3. Face `z` has a separate face-local interpretation and a separate rotation origin.
4. The control path uses a canonical torso basis that is not the same representation as the renderer.
5. The camera video remains the original camera projection while the overlay is transformed into a virtual view.

Consequently, rotating the displayed geometry does not establish a rotated body coordinate frame for all subsequent live measurements. Each frame is transformed, but each group is transformed under a different coordinate contract.

## Runtime delta evidence still required

The repository does not contain a captured 30-frame 0-degree/90-degree wrist series, so numeric raw/transformed delta results cannot be honestly supplied yet.

The correct measurement point is before canvas projection:

- raw: `frame.poseLandmarks[15]`
- transformed 3D: the output of a pure common-space rotation
- projected: output of the projection stage

Current `rotatePreviewPoint()` returns a projected point (`x`, `y`) rather than exposing the rotated 3D point separately. Therefore canvas deltas cannot prove the rotation matrix because perspective projection is already mixed into them.

## Classification

- Source mutation: not found.
- Cumulative rotation: not found.
- Rotation omitted from new live frames: disproven for the canvas preview.
- Rotation after canvas projection: disproven for the main preview path; rotation occurs inside `previewMapper()` before canvas conversion.
- Mixed coordinate spaces: confirmed.
- Common live 3D model: absent.
- Face/pose/hand transformation parity: absent.

## Smallest evidence-based correction direction

Do not change the rotation formula yet. First expose and compare the pure rotated 3D point before projection for one pose-world landmark. Then decide whether the live renderer should consume the same frozen/validated pose-world model or remain a camera-overlay path. Any fix should be made only after the 0-degree and 90-degree raw/rotated delta logs are captured.
