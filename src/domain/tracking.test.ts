import { describe, expect, it } from "vitest";
import { angle, distance } from "./geometry";
import { normalizeTrackingResult } from "../integration/normalize";

describe("tracking foundations", () => {
  it("normalizes missing detections to empty collections", () => {
    expect(normalizeTrackingResult({})).toEqual({ timestamp: expect.any(Number), poseLandmarks: [], faceLandmarks: [], leftHandLandmarks: [], rightHandLandmarks: [] });
  });
  it("normalizes landmarks and handedness", () => {
    const result = normalizeTrackingResult({ poseLandmarks: [{ x: 1, y: 2, z: 3 }], handLandmarks: [[{ x: 0, y: 0, z: 0 }]], handednesses: [[{ categoryName: "Left" }]] }, 10);
    expect(result.timestamp).toBe(10); expect(result.poseLandmarks[0].z).toBe(3); expect(result.leftHandLandmarks).toHaveLength(1);
  });
  it("calculates geometry", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(angle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBe(90);
  });
});
