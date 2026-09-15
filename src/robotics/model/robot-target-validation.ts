import type { GripperIntent, RobotOrientation, RobotPosition, RobotTargetInput, RobotTargetResult } from "./robot-target";

type IsFiniteNumber = (value: unknown) => value is number;

const isFiniteNumber: IsFiniteNumber = (value): value is number =>
  typeof value === "number" && Number.isFinite(value);

type IsGripperIntent = (value: string) => value is GripperIntent;

const isGripperIntent: IsGripperIntent = (value): value is GripperIntent =>
  value === "open" || value === "close";

type ReadPosition = (value: RobotTargetInput["position"]) => RobotPosition | null;

const readPosition: ReadPosition = (value) =>
  value !== undefined &&
  isFiniteNumber(value.x) &&
  isFiniteNumber(value.y) &&
  isFiniteNumber(value.z) &&
  value.x >= -1 && value.x <= 1 &&
  value.y >= -1 && value.y <= 1 &&
  value.z >= -1 && value.z <= 1
    ? Object.freeze({ x: value.x, y: value.y, z: value.z })
    : null;

type ReadOrientation = (
  value: RobotTargetInput["orientation"],
) => RobotOrientation | null;

const readOrientation: ReadOrientation = (value) => {
  if (
    value === undefined ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.z) ||
    !isFiniteNumber(value.w)
  ) {
    return null;
  }
  const magnitude = Math.hypot(value.x, value.y, value.z, value.w);
  return magnitude === 0
    ? null
    : Object.freeze({
        x: value.x / magnitude,
        y: value.y / magnitude,
        z: value.z / magnitude,
        w: value.w / magnitude,
      });
};

type CreateRobotTarget = (input: RobotTargetInput) => RobotTargetResult;

export const createRobotTarget: CreateRobotTarget = (input) => {
  if (input.side !== "left" && input.side !== "right") {
    return Object.freeze({ ok: false, reason: "side-invalid" });
  }
  const position = readPosition(input.position);
  if (position === null) return Object.freeze({ ok: false, reason: "position-invalid" });
  let orientation: RobotOrientation | undefined;
  if (input.orientation !== undefined) {
    const parsedOrientation = readOrientation(input.orientation);
    if (parsedOrientation === null) {
      return Object.freeze({ ok: false, reason: "orientation-invalid" });
    }
    orientation = parsedOrientation;
  }
  if (!isFiniteNumber(input.sourceTimestamp) || input.sourceTimestamp < 0) {
    return Object.freeze({ ok: false, reason: "timestamp-invalid" });
  }
  if (!Number.isInteger(input.sequence) || input.sequence < 0) {
    return Object.freeze({ ok: false, reason: "sequence-invalid" });
  }
  let gripper: GripperIntent | undefined;
  if (input.gripper !== undefined) {
    if (!isGripperIntent(input.gripper)) {
      return Object.freeze({ ok: false, reason: "gripper-invalid" });
    }
    gripper = input.gripper;
  }

  return Object.freeze({
    ok: true,
    target: Object.freeze({
      side: input.side,
      position,
      ...(orientation === undefined ? {} : { orientation }),
      ...(gripper === undefined ? {} : { gripper }),
      sourceTimestamp: input.sourceTimestamp,
      sequence: input.sequence,
    }),
  });
};
