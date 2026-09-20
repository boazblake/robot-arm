export type RobotStatePosition = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
}>;

export type RobotStateOrientation = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}>;

export type RobotArmState = Readonly<{
  readonly position: RobotStatePosition;
  readonly orientation?: RobotStateOrientation;
}>;

export type RobotState = Readonly<{
  readonly observedAt: number;
  readonly arms: Readonly<{
    readonly left: RobotArmState | null;
    readonly right: RobotArmState | null;
  }>;
}>;

export type RobotStateValidationFailure =
  | "timestamp-invalid"
  | "arms-invalid"
  | "position-invalid"
  | "orientation-invalid";

export type RobotStateResult =
  | Readonly<{ readonly ok: true; readonly state: RobotState }>
  | Readonly<{ readonly ok: false; readonly reason: RobotStateValidationFailure }>;

type FiniteNumber = (value: unknown) => value is number;

const finite: FiniteNumber = (value): value is number =>
  typeof value === "number" && Number.isFinite(value);

type RecordValue = (value: unknown) => value is Record<string, unknown>;

const record: RecordValue = (value): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

type ReadOrientation = (value: unknown) => RobotStateOrientation | null;

const readOrientation: ReadOrientation = (value) => {
  if (
    !record(value) ||
    !finite(value.x) ||
    !finite(value.y) ||
    !finite(value.z) ||
    !finite(value.w)
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

type ReadArm =
  (value: unknown) =>
    | Readonly<{ ok: true; arm: RobotArmState }>
    | Readonly<{ ok: false; reason: "position-invalid" | "orientation-invalid" }>;

const readArm: ReadArm = (value) => {
  if (!record(value) || !record(value.position)) {
    return Object.freeze({ ok: false, reason: "position-invalid" });
  }
  if (
    !finite(value.position.x) ||
    !finite(value.position.y) ||
    !finite(value.position.z)
  ) {
    return Object.freeze({ ok: false, reason: "position-invalid" });
  }
  const orientation: RobotStateOrientation | undefined =
    value.orientation === undefined ? undefined : readOrientation(value.orientation) ?? undefined;
  if (value.orientation !== undefined && orientation === undefined) {
    return Object.freeze({ ok: false, reason: "orientation-invalid" });
  }
  return Object.freeze({
    ok: true,
    arm: Object.freeze({
      position: Object.freeze({
        x: value.position.x,
        y: value.position.y,
        z: value.position.z,
      }),
      ...(orientation === undefined ? {} : { orientation }),
    }),
  });
};

type CreateRobotState = (input: unknown) => RobotStateResult;

export const createRobotState: CreateRobotState = (input) => {
  if (!record(input) || !finite(input.observedAt) || input.observedAt < 0) {
    return Object.freeze({ ok: false, reason: "timestamp-invalid" });
  }
  if (!record(input.arms)) {
    return Object.freeze({ ok: false, reason: "arms-invalid" });
  }
  const readSide = (
    value: unknown,
  ): Readonly<{ ok: true; arm: RobotArmState | null }> | Readonly<{
    ok: false;
    reason: RobotStateValidationFailure;
  }> => {
    if (value === null) return Object.freeze({ ok: true, arm: null });
    const result = readArm(value);
    return result.ok
      ? Object.freeze({ ok: true, arm: result.arm })
      : Object.freeze({ ok: false, reason: result.reason });
  };
  const left = readSide(input.arms.left);
  if (!left.ok) return left;
  const right = readSide(input.arms.right);
  if (!right.ok) return right;
  return Object.freeze({
    ok: true,
    state: Object.freeze({
      observedAt: input.observedAt,
      arms: Object.freeze({ left: left.arm, right: right.arm }),
    }),
  });
};
