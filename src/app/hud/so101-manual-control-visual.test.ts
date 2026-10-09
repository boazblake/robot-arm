import { describe, expect, it } from "vitest";
import {
  consumeVisualPositionStream,
  createVisualAnimationState,
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
  it("consumes each control position update as the next animation target", () => {
    let animation = createVisualAnimationState(positions(0));

    animation = consumeVisualPositionStream("control", animation, positions(20));
    expect(joint(visualAnimationTarget(animation), "shoulder_lift")).toBe(20);
    expect(joint(animation.current, "shoulder_lift")).toBe(0);

    animation = consumeVisualPositionStream("control", animation, positions(40));
    expect(joint(visualAnimationTarget(animation), "shoulder_lift")).toBe(40);
    expect(joint(animation.current, "shoulder_lift")).toBe(20);
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
