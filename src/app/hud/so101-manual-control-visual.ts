export type JointName = "shoulder_pan" | "shoulder_lift" | "elbow_flex" | "wrist_flex" | "wrist_roll" | "gripper";
export type ManualView = "setup" | "preview" | "control";
export type JointPositions = Readonly<Record<JointName, number>>;
export type VisualAnimationState = Readonly<{
  readonly current: JointPositions;
  readonly target: JointPositions;
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
export const createVisualAnimationState: CreateVisualAnimationState = (positions) => ({
  current: copyPositions(positions),
  target: copyPositions(positions),
});

type SetVisualAnimationTarget = (state: VisualAnimationState, positions: JointPositions) => VisualAnimationState;
export const setVisualAnimationTarget: SetVisualAnimationTarget = (state, positions) => ({
  current: state.current,
  target: copyPositions(positions),
});

type ConsumeVisualPositionStream = (
  view: ManualView,
  state: VisualAnimationState,
  positions: JointPositions,
) => VisualAnimationState;
export const consumeVisualPositionStream: ConsumeVisualPositionStream = (view, state, positions) =>
  view === "preview" ? state : setVisualAnimationTarget(state, positions);

type AdvanceVisualAnimation = (state: VisualAnimationState, progress: number) => VisualAnimationState;
export const advanceVisualAnimation: AdvanceVisualAnimation = (state, progress) => {
  const boundedProgress = Math.min(1, Math.max(0, progress));
  const next = Object.fromEntries(
    JOINTS.map((joint) => {
      const current = state.current[joint];
      const target = state.target[joint];
      const value = Math.abs(target - current) < 0.01
        ? target
        : current + (target - current) * boundedProgress;
      return [joint, value];
    }),
  ) as JointPositions;
  return { current: next, target: state.target };
};

type VisualAnimationSettled = (state: VisualAnimationState) => boolean;
export const visualAnimationSettled: VisualAnimationSettled = (state) =>
  JOINTS.every((joint) => Math.abs(state.current[joint] - state.target[joint]) < 0.01);

type VisualAnimationPosition = (state: VisualAnimationState) => JointPositions;
export const visualAnimationPosition: VisualAnimationPosition = (state) => state.current;

type VisualAnimationTarget = (state: VisualAnimationState) => JointPositions;
export const visualAnimationTarget: VisualAnimationTarget = (state) => state.target;
