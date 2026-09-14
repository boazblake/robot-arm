import { describe, expect, it } from "vitest";
import { createHumanArmPose } from "./human-arm-pose";
import type { Landmark, TrackingFrame } from "./tracking";

const landmark = (value: number): Landmark => ({
  x: value,
  y: value + 0.1,
  z: value + 0.2,
});

const frameWithArms = (left = true, right = true): TrackingFrame => {
  const poseLandmarks = Array.from({ length: 17 }, (_, index) => landmark(index));
  return {
    timestamp: 1234,
    poseLandmarks,
    leftHandLandmarks: left ? [landmark(100)] : [],
    rightHandLandmarks: right ? [landmark(200)] : [],
    faceLandmarks: [],
  };
};

describe("HumanArmPose", () => {
  it.each([
    ["both arms", true, true, true, true],
    ["left only", true, false, true, false],
    ["right only", false, true, false, true],
    ["neither arm", false, false, false, false],
  ])("creates a snapshot with %s", (_name, left, right, expectedLeft, expectedRight) => {
    const pose = createHumanArmPose(frameWithArms(left, right));
    expect(pose.left !== null).toBe(expectedLeft);
    expect(pose.right !== null).toBe(expectedRight);
  });

  it.each([
    ["left", "shoulder", 11],
    ["left", "elbow", 13],
    ["left", "pose wrist", 15],
    ["right", "shoulder", 12],
    ["right", "elbow", 14],
    ["right", "pose wrist", 16],
  ])("rejects a %s arm with a missing %s", (side, _name, index) => {
    const frame = frameWithArms();
    const poseLandmarks = [...frame.poseLandmarks];
    delete poseLandmarks[index];
    const pose = createHumanArmPose({ ...frame, poseLandmarks });
    const affectedArm = side === "left" ? pose.left : pose.right;
    const unaffectedArm = side === "left" ? pose.right : pose.left;
    expect(affectedArm).toBeNull();
    expect(unaffectedArm).not.toBeNull();
  });

  it("rejects an arm with a missing hand wrist anchor", () => {
    const frame = frameWithArms();
    const pose = createHumanArmPose({ ...frame, leftHandLandmarks: [] });
    expect(pose.left).toBeNull();
    expect(pose.right).not.toBeNull();
  });

  it("preserves coordinates, timestamp, and the documented index mapping", () => {
    const frame = frameWithArms();
    const pose = createHumanArmPose(frame);
    expect(pose.timestamp).toBe(frame.timestamp);
    expect(pose.left).toEqual({
      shoulder: { x: 11, y: 11.1, z: 11.2 },
      elbow: { x: 13, y: 13.1, z: 13.2 },
      wrist: { x: 15, y: 15.1, z: 15.2 },
      handAnchor: { x: 100, y: 100.1, z: 100.2 },
    });
    expect(pose.right?.handAnchor.x).toBe(200);
  });

  it("rejects non-finite required coordinates without throwing", () => {
    const frame = frameWithArms();
    const pose = createHumanArmPose({
      ...frame,
      poseLandmarks: frame.poseLandmarks.map((point, index) =>
        index === 13 ? { ...point, x: Number.NaN } : point,
      ),
    });
    expect(pose.left).toBeNull();
    expect(pose.right).not.toBeNull();
  });

  it("freezes the pose and its nested values", () => {
    const pose = createHumanArmPose(frameWithArms());
    expect(Object.isFrozen(pose)).toBe(true);
    expect(Object.isFrozen(pose.left)).toBe(true);
    expect(Object.isFrozen(pose.left?.shoulder)).toBe(true);
  });
});
