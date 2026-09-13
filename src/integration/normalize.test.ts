import { describe, expect, it } from "vitest";
import { normalizeTrackingResult } from "./normalize";

const hand = (x: number) => [{ x, y: 0.2, z: 0 }];
const result = (hands: unknown[] = [], handednesses: unknown[] = []) =>
  normalizeTrackingResult({ handLandmarks: hands, handednesses }, 123);

describe("MediaPipe tracking normalization", () => {
  it.each([
    ["left hand only", [hand(0.1)], [[{ categoryName: "Left" }]], 1, 0],
    ["right hand only", [hand(0.9)], [[{ categoryName: "Right" }]], 0, 1],
    ["both hands", [hand(0.1), hand(0.9)], [[{ categoryName: "Left" }], [{ categoryName: "Right" }]], 1, 1],
  ])("handles %s", (_name, hands, handednesses, left, right) => {
    const frame = result(hands, handednesses);
    expect(frame.leftHandLandmarks).toHaveLength(left);
    expect(frame.rightHandLandmarks).toHaveLength(right);
  });

  it("handles no hands without throwing", () => {
    expect(() => result()).not.toThrow();
    expect(result().leftHandLandmarks).toEqual([]);
    expect(result().rightHandLandmarks).toEqual([]);
  });

  it("accepts a nested face landmark collection", () => {
    const frame = normalizeTrackingResult({ faceLandmarks: [[{ x: 0.5, y: 0.5, z: 0 }]] }, 123);
    expect(frame.faceLandmarks).toHaveLength(1);
  });

  it("handles no pose and remains usable for the next frame", () => {
    expect(() => normalizeTrackingResult({ poseLandmarks: [] }, 123)).not.toThrow();
    expect(normalizeTrackingResult({ poseLandmarks: [] }, 123).poseLandmarks).toEqual([]);
    expect(normalizeTrackingResult({ poseLandmarks: [{ x: 0.5, y: 0.5, z: 0 }] }, 124).poseLandmarks).toHaveLength(1);
  });
});
