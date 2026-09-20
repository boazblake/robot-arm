import { describe, expect, it } from "vitest";
import { normalizeTrackingResult } from "./normalize-tracking-result";

const landmark = (x: number, y = 0.5, z = 0): { x: number; y: number; z: number } => ({ x, y, z });
const hand = (x: number) => [landmark(x)];
const pose = (): readonly { x: number; y: number; z: number }[] => {
  const points = Array.from({ length: 17 }, () => landmark(0.5));
  points[15] = landmark(0.25); points[16] = landmark(0.75);
  return points;
};

describe("hand identity assignment", () => {
  it("uses pose-wrist proximity instead of a mislabeled detector category", () => {
    const frame = normalizeTrackingResult({ poseLandmarks: pose(), handLandmarks: [hand(0.25), hand(0.75)], handednesses: [[{ categoryName: "right" }], [{ categoryName: "left" }]] });
    expect(frame.leftHandLandmarks[0]?.x).toBe(0.25);
    expect(frame.rightHandLandmarks[0]?.x).toBe(0.75);
  });

  it("assigns a single hand to the nearest available pose wrist", () => {
    const frame = normalizeTrackingResult({ poseLandmarks: pose(), handLandmarks: [hand(0.75)], handednesses: [[{ categoryName: "left" }]] });
    expect(frame.leftHandLandmarks).toEqual([]);
    expect(frame.rightHandLandmarks[0]?.x).toBe(0.75);
  });
});
