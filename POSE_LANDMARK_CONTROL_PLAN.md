# Pose-landmark teleoperation transition plan

## Decision

Move whole-arm teleoperation from the merged shoulder/elbow joystick to tracked human-arm pose landmarks. Keep manual controls available as a fallback until landmark control passes the safety gate.

## Why

A phone/keyboard control surface can expose independent axes, but a single 2D joystick cannot independently encode shoulder pan, shoulder flex/extension, and elbow flex/extension. Pose landmarks provide those relationships directly and avoid mode toggles or overloaded spatial zones.

## Existing evidence to reuse

- `src/tracking/model/human-arm-pose.ts` — tracked arm domain model.
- `src/tracking/model/human-frame.ts` — human reference-frame model.
- `src/teleoperation/calibration/arm-calibration.ts` — calibration boundary.
- `src/teleoperation/mapping/pose-joint-mapping.ts` — existing mapping work to audit and extend.
- `src/teleoperation/control/control-policy.ts` — enablement, stale-input, and safety policy.
- `src/robotics/model/robot-target.ts` — target validation and cap boundary.
- `src/teleoperation/freshness/input-freshness.ts` — stale tracking behavior.

## Proposed control pipeline

1. Detect and validate human shoulder, elbow, wrist, and hand landmarks.
2. Transform landmarks into a calibrated human arm frame.
3. Derive shoulder pan, shoulder flex/extension, elbow flex/extension, wrist rotation, and gripper intent as named pure measurements.
4. Apply workspace mapping, dead zones, smoothing, rate limits, and robot caps.
5. Reject stale, low-confidence, discontinuous, or out-of-workspace inputs.
6. Send only validated robot targets through the existing adapter boundary.

## Transition phases

1. **Observe:** render landmark-derived joint estimates beside the manual controls without commanding the robot.
2. **Replay:** feed recorded landmark frames through the mapping and compare expected target trajectories.
3. **Dry-run:** enable landmark commands only against the dry-run bridge.
4. **Safety gate:** require calibration, confidence, freshness, explicit enablement, and emergency stop before live commands.
5. **Live pilot:** enable live control behind an explicit mode selection and retain manual stop/fallback.
6. **Retire merged joystick:** remove the ambiguous shoulder/elbow joystick only after landmark acceptance tests pass.

## Acceptance criteria

- Shoulder and elbow can move independently and simultaneously.
- Flexion, extension, pan, wrist rotation, and gripper intent have explicit signs and calibration.
- Low confidence, tracking loss, stale frames, jumps, and workspace violations stop or hold safely.
- Smoothing and rate limits are deterministic and tested.
- Manual controls remain available during the transition.
- No live control is enabled implicitly.

## Verification

- Unit tests for landmark-to-joint measurement signs and ranges.
- Boundary tests for confidence, freshness, caps, and workspace limits.
- Replay tests for continuous trajectories and discontinuities.
- `npm run test`
- `npm run typecheck`
- `npm run build`
