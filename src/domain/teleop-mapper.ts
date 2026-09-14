import {
  calculateArmDisplacement,
  type ArmCalibration,
  type ArmDisplacement,
  type ArmSide,
} from "./arm-calibration";
import type { HumanArmPose } from "./human-arm-pose";
import type { ArmTrackingValidity } from "./tracking-validity";
import type {
  WorkspaceMapping,
  WorkspacePosition,
} from "./workspace-mapping";

export type TeleopPositionInput = Readonly<{
  readonly side: ArmSide;
  readonly pose: HumanArmPose;
  readonly calibration: ArmCalibration | null;
  readonly validity: ArmTrackingValidity;
  readonly workspace: WorkspaceMapping;
}>;

export type TeleopPositionFailureReason =
  | "arm-unavailable"
  | "tracking-invalid"
  | "not-calibrated"
  | "workspace-invalid"
  | "mapping-invalid";

export type TeleopPositionResult =
  | Readonly<{
      readonly ok: true;
      readonly position: WorkspacePosition;
    }>
  | Readonly<{
      readonly ok: false;
      readonly reason: TeleopPositionFailureReason;
    }>;

type IsFiniteNumber = (value: unknown) => value is number;

const isFiniteNumber: IsFiniteNumber = (value): value is number =>
  typeof value === "number" && Number.isFinite(value);

type IsFiniteDisplacement = (value: ArmDisplacement) => boolean;

const isFiniteDisplacement: IsFiniteDisplacement = (value) =>
  isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.z);

type IsFinitePosition = (value: WorkspacePosition) => boolean;

const isFinitePosition: IsFinitePosition = (value) =>
  isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.z);

type CreatePositionFailure = (
  reason: TeleopPositionFailureReason,
) => TeleopPositionResult;

const createPositionFailure: CreatePositionFailure = (reason) =>
  Object.freeze({ ok: false, reason });

type MapTeleopPosition = (input: TeleopPositionInput) => TeleopPositionResult;

export const mapTeleopPosition: MapTeleopPosition = (input) => {
  const currentArm = input.side === "left" ? input.pose.left : input.pose.right;
  if (currentArm === null) return createPositionFailure("arm-unavailable");
  if (!input.validity.valid) return createPositionFailure("tracking-invalid");
  if (input.calibration === null || input.calibration.side !== input.side) {
    return createPositionFailure("not-calibrated");
  }

  const displacementResult = calculateArmDisplacement(input.calibration, currentArm);
  if (!displacementResult.available) {
    return createPositionFailure(
      displacementResult.reason === "arm-unavailable"
        ? "arm-unavailable"
        : "not-calibrated",
    );
  }
  if (!isFiniteDisplacement(displacementResult.displacement)) {
    return createPositionFailure("mapping-invalid");
  }

  const workspaceResult = input.workspace.mapDisplacement(
    input.side,
    displacementResult.displacement,
  );
  if (!workspaceResult.ok) return createPositionFailure("workspace-invalid");
  if (!isFinitePosition(workspaceResult.position)) {
    return createPositionFailure("mapping-invalid");
  }

  return Object.freeze({ ok: true, position: workspaceResult.position });
};
