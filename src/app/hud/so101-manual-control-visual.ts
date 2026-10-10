export type JointName = "shoulder_pan" | "shoulder_lift" | "elbow_flex" | "wrist_flex" | "wrist_roll" | "gripper";
export type ManualView = "setup" | "preview" | "control";
export type JointPositions = Readonly<Record<JointName, number>>;
export type VisualAnimationState = Readonly<{
  readonly current: JointPositions;
  readonly target: JointPositions;
  readonly origin: JointPositions;
  readonly elapsedMs: number;
}>;

const JOINTS: readonly JointName[] = ["shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll", "gripper"];

type GripperJawOffsets = (ratio: number) => readonly [number, number];
export const gripperJawOffsets: GripperJawOffsets = (ratio) => {
  const boundedRatio = Math.min(1, Math.max(-1, ratio));
  const gap = 16 - ((boundedRatio + 1) / 2) * 12;
  return [-gap, gap];
};

type CopyPositions = (positions: JointPositions) => JointPositions;
const copyPositions: CopyPositions = (positions) => ({ ...positions });

type CreateVisualAnimationState = (positions: JointPositions) => VisualAnimationState;
export const createVisualAnimationState: CreateVisualAnimationState = (positions) => {
  const initial = copyPositions(positions);
  return {
    current: initial,
    target: copyPositions(initial),
    origin: copyPositions(initial),
    elapsedMs: 0,
  };
};

type PositionsEqual = (left: JointPositions, right: JointPositions) => boolean;
const positionsEqual: PositionsEqual = (left, right) => JOINTS.every((joint) => left[joint] === right[joint]);

type SetVisualAnimationTarget = (state: VisualAnimationState, positions: JointPositions) => VisualAnimationState;
export const setVisualAnimationTarget: SetVisualAnimationTarget = (state, positions) =>
  positionsEqual(state.target, positions) ? state : {
    current: state.current,
    target: copyPositions(positions),
    origin: copyPositions(state.current),
    elapsedMs: 0,
  };

type ConsumeVisualPositionStream = (
  view: ManualView,
  state: VisualAnimationState,
  positions: JointPositions,
  preserveTarget: boolean,
) => VisualAnimationState;
export const consumeVisualPositionStream: ConsumeVisualPositionStream = (view, state, positions, preserveTarget) =>
  view === "preview" || preserveTarget ? state : setVisualAnimationTarget(state, positions);

type AdvanceVisualAnimation = (
  state: VisualAnimationState,
  elapsedMs: number,
  durationMs: number,
) => VisualAnimationState;
export const advanceVisualAnimation: AdvanceVisualAnimation = (state, elapsedMs, durationMs) => {
  const boundedDurationMs = Math.max(1, durationMs);
  const nextElapsedMs = Math.min(boundedDurationMs, state.elapsedMs + Math.max(0, elapsedMs));
  const progress = nextElapsedMs / boundedDurationMs;
  const next = Object.fromEntries(
    JOINTS.map((joint) => [
      joint,
      state.origin[joint] + (state.target[joint] - state.origin[joint]) * progress,
    ]),
  ) as JointPositions;
  return {
    current: next,
    target: state.target,
    origin: state.origin,
    elapsedMs: nextElapsedMs,
  };
};

type VisualAnimationSettled = (state: VisualAnimationState) => boolean;
export const visualAnimationSettled: VisualAnimationSettled = (state) =>
  JOINTS.every((joint) => Math.abs(state.current[joint] - state.target[joint]) < 0.01);

type VisualAnimationPosition = (state: VisualAnimationState) => JointPositions;
export const visualAnimationPosition: VisualAnimationPosition = (state) => state.current;

type VisualAnimationTarget = (state: VisualAnimationState) => JointPositions;
export const visualAnimationTarget: VisualAnimationTarget = (state) => state.target;
