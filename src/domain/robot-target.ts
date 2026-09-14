export type ArmSide = "left" | "right";

export type RobotPosition = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
}>;

export type RobotOrientation = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}>;

export type GripperIntent = "open" | "close";

export type RobotTarget = Readonly<{
  readonly side: ArmSide;
  readonly position: RobotPosition;
  readonly orientation?: RobotOrientation;
  readonly gripper?: GripperIntent;
  readonly sourceTimestamp: number;
  readonly sequence: number;
}>;

export type RobotTargetInput = Readonly<{
  readonly side: ArmSide;
  readonly position?: Readonly<Partial<RobotPosition>>;
  readonly orientation?: Readonly<Partial<RobotOrientation>>;
  readonly gripper?: string;
  readonly sourceTimestamp: number;
  readonly sequence: number;
}>;

export type RobotTargetResult =
  | Readonly<{
      readonly ok: true;
      readonly target: RobotTarget;
    }>
  | Readonly<{
      readonly ok: false;
      readonly reason:
        | "position-invalid"
        | "orientation-invalid"
        | "timestamp-invalid"
        | "sequence-invalid"
        | "gripper-invalid";
    }>;

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
  isFiniteNumber(value.z)
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
  if (input.gripper !== undefined && !isGripperIntent(input.gripper)) {
    return Object.freeze({ ok: false, reason: "gripper-invalid" });
  }

  return Object.freeze({
    ok: true,
    target: Object.freeze({
      side: input.side,
      position,
      ...(orientation === undefined ? {} : { orientation }),
      ...(input.gripper === undefined ? {} : { gripper: input.gripper }),
      sourceTimestamp: input.sourceTimestamp,
      sequence: input.sequence,
    }),
  });
};
