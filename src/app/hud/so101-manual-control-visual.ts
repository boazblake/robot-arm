export type JointName = "shoulder_pan" | "shoulder_lift" | "elbow_flex" | "wrist_flex" | "wrist_roll" | "gripper";
export type ManualView = "setup" | "preview" | "control";
export type JointPositions = Readonly<Record<JointName, number>>;
export type VisualAnimationState = Readonly<{
  readonly current: JointPositions;
  readonly target: JointPositions;
}>;

type CopyPositions = (positions: JointPositions) => JointPositions;
const copyPositions: CopyPositions = (positions) => ({ ...positions });

type CreateVisualAnimationState = (positions: JointPositions) => VisualAnimationState;
export const createVisualAnimationState: CreateVisualAnimationState = (positions) => ({
  current: copyPositions(positions),
  target: copyPositions(positions),
});

type SetVisualAnimationTarget = (state: VisualAnimationState, positions: JointPositions) => VisualAnimationState;
export const setVisualAnimationTarget: SetVisualAnimationTarget = (state, positions) => ({
  current: state.target,
  target: copyPositions(positions),
});

type ConsumeVisualPositionStream = (
  view: ManualView,
  state: VisualAnimationState,
  positions: JointPositions,
) => VisualAnimationState;
export const consumeVisualPositionStream: ConsumeVisualPositionStream = (view, state, positions) =>
  view === "preview" ? state : setVisualAnimationTarget(state, positions);

type VisualAnimationTarget = (state: VisualAnimationState) => JointPositions;
export const visualAnimationTarget: VisualAnimationTarget = (state) => state.target;
