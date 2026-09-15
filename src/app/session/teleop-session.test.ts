import { describe, expect, it } from "vitest";
import { calculateArmDisplacement } from "../../teleoperation/calibration/arm-calibration";
import { createHumanArmPose } from "../../tracking/model/human-arm-pose";
import type { Landmark, TrackingFrame } from "../../tracking/model/tracking-frame";
import {
  calibrateTrackingArm,
  pipeline,
  processTrackingFrame,
  resetTrackingPipeline,
} from "./teleop-session";

const landmark = (x: number, y: number, z: number): Landmark => ({
  x, y, z, visibility: 1,
});

const frame = (offset = 0): TrackingFrame => {
  const poseLandmarks = Array.from({ length: 17 }, () => landmark(0, 0, 0));
  poseLandmarks[11] = landmark(0, 0, 0);
  poseLandmarks[13] = landmark(0.1, 0, 0);
  poseLandmarks[15] = landmark(0.1, 0.1, 0);
  poseLandmarks[12] = landmark(0, 0, 0);
  poseLandmarks[14] = landmark(-0.1, 0, 0);
  poseLandmarks[16] = landmark(-0.1, 0.1, 0);
  return {
    timestamp: 100 + offset,
    poseLandmarks,
    leftHandLandmarks: [landmark(0.1 + offset, 0.1, 0)],
    rightHandLandmarks: [landmark(-0.1, 0.1, 0)],
    faceLandmarks: [],
  };
};

describe("tracking pipeline presentation snapshot", () => {
  it("exposes domain displacement and mapping outputs without HUD calculations", () => {
    resetTrackingPipeline();
    const first = frame();
    processTrackingFrame(first);
    calibrateTrackingArm("left");
    const second = frame(0.1);
    const snapshot = processTrackingFrame(second);
    const pose = createHumanArmPose(second);
    const expected = calculateArmDisplacement(snapshot.calibration.left, pose.left);

    expect(snapshot.arms.left.displacement).toEqual(expected);
    expect(snapshot.arms.left.mapped).toEqual({ x: 0.2, y: 0, z: 0 });
    expect(snapshot.arms.left.stabilized).not.toBeNull();
    expect(snapshot.arms.left.target?.sourceTimestamp).toBe(second.timestamp);
  });

  it("clears current arm diagnostics when an arm becomes unavailable", () => {
    resetTrackingPipeline();
    processTrackingFrame(frame());
    calibrateTrackingArm("left");
    const unavailable = processTrackingFrame({ ...frame(1), leftHandLandmarks: [] });

    expect(unavailable.arms.left.pose).toBeNull();
    expect(unavailable.arms.left.elbowAngle).toBeNull();
    expect(unavailable.arms.left.shoulderAngle).toBeNull();
    expect(unavailable.arms.left.target).toBeNull();
    expect(pipeline().arms.left.validity).toEqual({ valid: false, reason: "arm-unavailable" });
  });
});
