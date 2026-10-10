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

    animation = consumeVisualPositionStream("control", animation, positions(20), false);
    expect(joint(visualAnimationTarget(animation), "shoulder_lift")).toBe(20);
    expect(joint(visualAnimationPosition(animation), "shoulder_lift")).toBe(0);

    animation = advanceVisualAnimation(animation, 90, 180);
    expect(joint(visualAnimationPosition(animation), "shoulder_lift")).toBe(10);

    animation = consumeVisualPositionStream("control", animation, positions(40), false);
    expect(joint(visualAnimationTarget(animation), "shoulder_lift")).toBe(40);
    expect(joint(visualAnimationPosition(animation), "shoulder_lift")).toBe(10);
  });

  it("keeps advancing toward a held nonzero target without new pointer events", () => {
    let animation = consumeVisualPositionStream(
      "control",
      createVisualAnimationState(positions(0)),
      positions(80),
      false,
    );

    animation = advanceVisualAnimation(animation, 90, 180);
    expect(joint(visualAnimationPosition(animation), "elbow_flex")).toBe(40);
    animation = advanceVisualAnimation(animation, 90, 180);
    expect(joint(visualAnimationPosition(animation), "elbow_flex")).toBe(80);
  });

  it("keeps the reviewed preview target when the bridge streams positions", () => {
    const preview = createVisualAnimationState(positions(10));
    const next = consumeVisualPositionStream("preview", preview, positions(80), false);

    expect(next).toBe(preview);
    expect(joint(visualAnimationTarget(next), "elbow_flex")).toBe(10);
  });

  it("preserves the held joystick target while feedback positions stream", () => {
    const animation = createVisualAnimationState(positions(10));
    const next = consumeVisualPositionStream("control", animation, positions(80), true);

    expect(next).toBe(animation);
    expect(joint(visualAnimationTarget(next), "elbow_flex")).toBe(10);
  });

  it("does not restart elapsed animation when feedback repeats its target", () => {
    let animation = consumeVisualPositionStream(
      "control",
      createVisualAnimationState(positions(0)),
      positions(80),
      false,
    );
    animation = advanceVisualAnimation(animation, 90, 180);
    const repeated = consumeVisualPositionStream("control", animation, positions(80), false);

    expect(repeated).toBe(animation);
    animation = advanceVisualAnimation(repeated, 90, 180);
    expect(joint(visualAnimationPosition(animation), "elbow_flex")).toBe(80);
  });

  it("does not mutate the command target while consuming visual stream updates", () => {
    const commandTarget = positions(5);
    const animation = consumeVisualPositionStream(
      "control",
      createVisualAnimationState(commandTarget),
      positions(30),
      false,
    );

    expect(joint(commandTarget, "shoulder_pan")).toBe(5);
    expect(joint(visualAnimationTarget(animation), "shoulder_pan")).toBe(30);
  });
});
