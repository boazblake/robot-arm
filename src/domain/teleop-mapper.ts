import {
  calculateArmDisplacement,
  type ArmCalibration,
  type ArmDisplacement,
  type ArmSide,
} from "./arm-calibration";
import type { HumanArmPose } from "./human-arm-pose";
import {
  createRobotTarget,
  type RobotTarget,
} from "./robot-target";
import type { ArmTrackingValidity } from "./tracking-validity";
import type { WorkspaceMapping } from "./workspace-mapping";

export type TeleopMappingInput = Readonly<{
  readonly side: ArmSide;
  readonly pose: HumanArmPose;
  readonly calibration: ArmCalibration | null;
  readonly validity: ArmTrackingValidity;
  readonly workspace: WorkspaceMapping;
  readonly sequence: number;
}>;

export type TeleopMappingFailureReason =
  | "arm-unavailable"
  | "tracking-invalid"
  | "not-calibrated"
  | "workspace-invalid"
  | "mapping-invalid";

export type TeleopMappingResult =
  | Readonly<{
      readonly ok: true;
      readonly target: RobotTarget;
    }>
  | Readonly<{
      readonly ok: false;
      readonly reason: TeleopMappingFailureReason;
    }>;

type IsFiniteNumber = (value: unknown) => value is number;

const isFiniteNumber: IsFiniteNumber = (value): value is number =>
  typeof value === "number" && Number.isFinite(value);

type IsFiniteDisplacement = (value: ArmDisplacement) => boolean;

const isFiniteDisplacement: IsFiniteDisplacement = (value) =>
  isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.z);

type CreateMappingFailure = (
  reason: TeleopMappingFailureReason,
) => TeleopMappingResult;

const createMappingFailure: CreateMappingFailure = (reason) =>
  Object.freeze({ ok: false, reason });

type MapTeleopInput = (input: TeleopMappingInput) => TeleopMappingResult;

export const mapTeleopInput: MapTeleopInput = (input) => {
  const currentArm = input.side === "left" ? input.pose.left : input.pose.right;
  if (currentArm === null) return createMappingFailure("arm-unavailable");
  if (!input.validity.valid) return createMappingFailure("tracking-invalid");
  if (input.calibration === null || input.calibration.side !== input.side) {
    return createMappingFailure("not-calibrated");
  }

  const displacementResult = calculateArmDisplacement(input.calibration, currentArm);
  if (!displacementResult.available) {
    return createMappingFailure(
      displacementResult.reason === "arm-unavailable"
        ? "arm-unavailable"
        : "not-calibrated",
    );
  }
  if (!isFiniteDisplacement(displacementResult.displacement)) {
    return createMappingFailure("mapping-invalid");
  }

  const workspaceResult = input.workspace.mapDisplacement(
    input.side,
    displacementResult.displacement,
  );
  if (!workspaceResult.ok) return createMappingFailure("workspace-invalid");
  if (
    !isFiniteNumber(workspaceResult.position.x) ||
    !isFiniteNumber(workspaceResult.position.y) ||
    !isFiniteNumber(workspaceResult.position.z)
  ) {
    return createMappingFailure("mapping-invalid");
  }

  const targetResult = createRobotTarget({
    side: input.side,
    position: workspaceResult.position,
    sourceTimestamp: input.pose.timestamp,
    sequence: input.sequence,
  });
  return targetResult.ok
    ? Object.freeze({ ok: true, target: targetResult.target })
    : createMappingFailure("mapping-invalid");
};
