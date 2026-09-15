import type { HumanArm, HumanArmPose } from "../../tracking/model/human-arm-pose";

export type ArmSide = "left" | "right";

export type ArmCalibration = Readonly<{
  readonly side: ArmSide;
  readonly timestamp: number;
  readonly reference: HumanArm;
}>;

export type CalibrationResult =
  | Readonly<{
      readonly ok: true;
      readonly calibration: ArmCalibration;
    }>
  | Readonly<{
      readonly ok: false;
      readonly reason: "arm-unavailable" | "control-active";
    }>;

export type ArmDisplacement = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
}>;

export type DisplacementResult =
  | Readonly<{
      readonly available: true;
      readonly displacement: ArmDisplacement;
    }>
  | Readonly<{
      readonly available: false;
      readonly reason: "not-calibrated" | "arm-unavailable";
    }>;

export type CalibrationState = Readonly<{
  readonly left: ArmCalibration | null;
  readonly right: ArmCalibration | null;
}>;

export type CalibrationStateResult =
  | Readonly<{
      readonly ok: true;
      readonly state: CalibrationState;
    }>
  | Readonly<{
      readonly ok: false;
      readonly reason: "control-active";
    }>;

const copyArm = (arm: HumanArm): HumanArm =>
  Object.freeze({
    shoulder: Object.freeze({ ...arm.shoulder }),
    elbow: Object.freeze({ ...arm.elbow }),
    wrist: Object.freeze({ ...arm.wrist }),
    handAnchor: Object.freeze({ ...arm.handAnchor }),
  });

type ReadArm = (pose: HumanArmPose, side: ArmSide) => HumanArm | null;

const readArm: ReadArm = (pose, side) =>
  side === "left" ? pose.left : pose.right;

type CalibrateArm = (
  pose: HumanArmPose,
  side: ArmSide,
  controlActive: boolean,
) => CalibrationResult;

export const calibrateArm: CalibrateArm = (pose, side, controlActive) => {
  if (controlActive) return Object.freeze({ ok: false, reason: "control-active" });
  const arm = readArm(pose, side);
  if (arm === null) return Object.freeze({ ok: false, reason: "arm-unavailable" });

  return Object.freeze({
    ok: true,
    calibration: Object.freeze({
      side,
      timestamp: pose.timestamp,
      reference: copyArm(arm),
    }),
  });
};

type SetCalibration = (
  state: CalibrationState,
  result: CalibrationResult,
) => CalibrationState;

export const setCalibration: SetCalibration = (state, result) =>
  result.ok
    ? Object.freeze({ ...state, [result.calibration.side]: result.calibration })
    : state;

type CalculateArmDisplacement = (
  calibration: ArmCalibration | null,
  current: HumanArm | null,
) => DisplacementResult;

export const calculateArmDisplacement: CalculateArmDisplacement = (
  calibration,
  current,
) => {
  if (calibration === null) {
    return Object.freeze({ available: false, reason: "not-calibrated" });
  }
  if (current === null) {
    return Object.freeze({ available: false, reason: "arm-unavailable" });
  }

  return Object.freeze({
    available: true,
    displacement: Object.freeze({
      x: current.handAnchor.x - calibration.reference.handAnchor.x,
      y: current.handAnchor.y - calibration.reference.handAnchor.y,
      z: current.handAnchor.z - calibration.reference.handAnchor.z,
    }),
  });
};

type ResetCalibration = (
  state: CalibrationState,
  side: ArmSide,
  controlActive: boolean,
) => CalibrationStateResult;

export const resetCalibration: ResetCalibration = (
  state,
  side,
  controlActive,
) =>
  controlActive
    ? Object.freeze({ ok: false, reason: "control-active" })
    : Object.freeze({ ok: true, state: Object.freeze({ ...state, [side]: null }) });
