# SO-101 Manual Control Plan

## Scope

Add manual joint control without inverse kinematics. The app will send six calibrated joint targets to a local LeRobot bridge only after explicit enablement.

## Boundary

- Browser: renders six joint controls, validates finite values, and sends typed JSON over localhost WebSocket.
- Bridge: owns the LeRobot serial connection, calibration loading, joint-limit validation, stale-command timeout, and emergency disconnect.
- Robot: receives only complete six-joint position actions after control is explicitly enabled.

## Safety decisions

- No Cartesian-to-joint conversion.
- No inferred workspace or synthetic joint limits; use the saved LeRobot calibration file.
- Control starts disabled.
- Missing, malformed, stale, or partial commands are rejected.
- Emergency stop disconnects the follower and disables further commands until reconnect.
- No hardware command is sent during browser startup or bridge connection.

## Verification gates

1. Unit-test message parsing, complete-joint validation, limit enforcement, stale timeout, and disabled/stop states.
2. Run bridge in dry-run mode and verify commands without a robot connection.
3. Connect to the calibrated follower with control disabled and verify observation only.
4. Enable control only after explicit physical confirmation and test one small joint target.
5. Verify emergency stop and disconnect behavior.

## Not included

- IK, Cartesian targets, workspace claims, autonomous motion, or leader-arm emulation.
