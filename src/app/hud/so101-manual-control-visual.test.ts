import { describe, expect, it } from "vitest";
import {
  advanceVisualAnimation,
  consumeVisualPositionStream,
  createVisualAnimationState,
  gripperJawOffsets,
  visualAnimationPosition,
  visualAnimationTarget,
  type JointName,
  type JointPositions,
} from "./so101-manual-control-visual";

const positions = (value: number): JointPositions => ({
  shoulder_pan: value,
  shoulder_lift: value,
  elbow_flex: value,
  wrist_flex: value,
  wrist_roll: value,
  gripper: value,
});

const joint = (state: JointPositions, name: JointName): number => state[name];

describe("SO-101 visual animation state", () => {
  it("moves both gripper jaws symmetrically as the gripper target changes", () => {
    expect(gripperJawOffsets(-1)).toEqual([-16, 16]);
    expect(gripperJawOffsets(1)).toEqual([-4, 4]);
  });

  it("consumes each control position update as the next animation target", () => {
    let animation = createVisualAnimationState(positions(0));

    animation = consumeVisualPositionStream("control", animation, positions(20));
    expect(joint(visualAnimationTarget(animation), "shoulder_lift")).toBe(20);
    expect(joint(visualAnimationPosition(animation), "shoulder_lift")).toBe(0);

    animation = advanceVisualAnimation(animation, 0.5);
    expect(joint(visualAnimationPosition(animation), "shoulder_lift")).toBe(10);

    animation = consumeVisualPositionStream("control", animation, positions(40));
    expect(joint(visualAnimationTarget(animation), "shoulder_lift")).toBe(40);
    expect(joint(visualAnimationPosition(animation), "shoulder_lift")).toBe(10);
  });

  it("keeps advancing toward a held nonzero target without new pointer events", () => {
    let animation = consumeVisualPositionStream(
      "control",
      createVisualAnimationState(positions(0)),
      positions(80),
    );

    animation = advanceVisualAnimation(animation, 0.5);
    expect(joint(visualAnimationPosition(animation), "elbow_flex")).toBe(40);
    animation = advanceVisualAnimation(animation, 0.5);
    expect(joint(visualAnimationPosition(animation), "elbow_flex")).toBe(60);
  });

  it("keeps the reviewed preview target when the bridge streams positions", () => {
    const preview = createVisualAnimationState(positions(10));
    const next = consumeVisualPositionStream("preview", preview, positions(80));

    expect(next).toBe(preview);
    expect(joint(visualAnimationTarget(next), "elbow_flex")).toBe(10);
  });

  it("does not mutate the command target while consuming visual stream updates", () => {
    const commandTarget = positions(5);
    const animation = consumeVisualPositionStream(
      "control",
      createVisualAnimationState(commandTarget),
      positions(30),
    );

    expect(joint(commandTarget, "shoulder_pan")).toBe(5);
    expect(joint(visualAnimationTarget(animation), "shoulder_pan")).toBe(30);
  });
});
