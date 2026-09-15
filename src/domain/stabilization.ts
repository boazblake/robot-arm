import type { ArmSide } from "./arm-calibration";
import type { WorkspacePosition } from "./workspace-mapping";

export type DeadZone = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
}>;

export type StabilizationConfig = Readonly<{
  readonly alpha: number;
  readonly deadZone: DeadZone;
}>;

export type StabilizationConfigInput = Readonly<{
  readonly alpha: number;
  readonly deadZone: Readonly<Partial<DeadZone>>;
}>;

export type StabilizationConfigResult =
  | Readonly<{ readonly ok: true; readonly config: StabilizationConfig }>
  | Readonly<{
      readonly ok: false;
      readonly reason: "alpha-invalid" | "dead-zone-invalid";
    }>;

export type StabilizationState = Readonly<{
  readonly left: WorkspacePosition | null;
  readonly right: WorkspacePosition | null;
}>;

export type StabilizationResult =
  | Readonly<{
      readonly ok: true;
      readonly position: WorkspacePosition;
      readonly state: StabilizationState;
    }>
  | Readonly<{
      readonly ok: false;
      readonly reason: "input-invalid" | "state-invalid";
      readonly state: StabilizationState;
    }>;

type IsFiniteNumber = (value: unknown) => value is number;
const isFiniteNumber: IsFiniteNumber = (value): value is number =>
  typeof value === "number" && Number.isFinite(value);

type IsValidPosition = (value: WorkspacePosition | null) => boolean;
const isValidPosition: IsValidPosition = (value) =>
  value !== null &&
  isFiniteNumber(value.x) &&
  value.x >= -1 &&
  value.x <= 1 &&
  isFiniteNumber(value.y) &&
  value.y >= -1 &&
  value.y <= 1 &&
  isFiniteNumber(value.z) &&
  value.z >= -1 &&
  value.z <= 1;

type ReadSidePosition = (
  state: StabilizationState,
  side: ArmSide
) => WorkspacePosition | null;
const readSidePosition: ReadSidePosition = (state, side) =>
  side === "left" ? state.left : state.right;

type ReplaceSidePosition = (
  state: StabilizationState,
  side: ArmSide,
  position: WorkspacePosition | null
) => StabilizationState;
const replaceSidePosition: ReplaceSidePosition = (state, side, position) =>
  Object.freeze(
    side === "left"
      ? { left: position, right: state.right }
      : { left: state.left, right: position }
  );

type FilterAxis = (value: number, threshold: number) => number;
const filterAxis: FilterAxis = (value, threshold) =>
  Math.abs(value) <= threshold ? 0 : value;

type SmoothAxis = (
  previous: number | null,
  current: number,
  alpha: number
) => number;
const smoothAxis: SmoothAxis = (previous, current, alpha) =>
  previous === null ? current : alpha * current + (1 - alpha) * previous;

type FilterPosition = (
  position: WorkspacePosition,
  deadZone: DeadZone
) => WorkspacePosition;
const filterPosition: FilterPosition = (position, deadZone) =>
  Object.freeze({
    x: filterAxis(position.x, deadZone.x),
    y: filterAxis(position.y, deadZone.y),
    z: filterAxis(position.z, deadZone.z),
  });

type SmoothPosition = (
  previous: WorkspacePosition | null,
  current: WorkspacePosition,
  alpha: number
) => WorkspacePosition;
const smoothPosition: SmoothPosition = (previous, current, alpha) =>
  Object.freeze({
    x: smoothAxis(previous?.x ?? null, current.x, alpha),
    y: smoothAxis(previous?.y ?? null, current.y, alpha),
    z: smoothAxis(previous?.z ?? null, current.z, alpha),
  });

type CreateStabilizationConfig = (
  input: StabilizationConfigInput
) => StabilizationConfigResult;

export const createStabilizationConfig: CreateStabilizationConfig = (input) => {
  if (!isFiniteNumber(input.alpha) || input.alpha <= 0 || input.alpha > 1) {
    return Object.freeze({ ok: false, reason: "alpha-invalid" });
  }
  const { x, y, z } = input.deadZone;
  if (
    !isFiniteNumber(x) ||
    x < 0 ||
    x > 1 ||
    !isFiniteNumber(y) ||
    y < 0 ||
    y > 1 ||
    !isFiniteNumber(z) ||
    z < 0 ||
    z > 1
  ) {
    return Object.freeze({ ok: false, reason: "dead-zone-invalid" });
  }
  return Object.freeze({
    ok: true,
    config: Object.freeze({
      alpha: input.alpha,
      deadZone: Object.freeze({ x, y, z }),
    }),
  });
};

type CreateStabilizationState = () => StabilizationState;
export const createStabilizationState: CreateStabilizationState = () =>
  Object.freeze({ left: null, right: null });

type ResetStabilizationState = (
  state: StabilizationState,
  side: ArmSide
) => StabilizationState;
export const resetStabilizationState: ResetStabilizationState = (state, side) =>
  replaceSidePosition(state, side, null);

type StabilizeWorkspacePosition = (
  state: StabilizationState,
  side: ArmSide,
  position: WorkspacePosition,
  config: StabilizationConfig
) => StabilizationResult;

export const stabilizeWorkspacePosition: StabilizeWorkspacePosition = (
  state,
  side,
  position,
  config
) => {
  const previous = readSidePosition(state, side);
  if (previous !== null && !isValidPosition(previous)) {
    return Object.freeze({ ok: false, reason: "state-invalid", state });
  }
  if (!isValidPosition(position)) {
    return Object.freeze({ ok: false, reason: "input-invalid", state });
  }
  const filtered = filterPosition(position, config.deadZone);
  const output = smoothPosition(previous, filtered, config.alpha);
  const nextState = replaceSidePosition(state, side, output);
  return Object.freeze({ ok: true, position: output, state: nextState });
};
