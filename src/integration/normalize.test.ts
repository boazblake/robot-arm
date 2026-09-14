import { describe, expect, it } from "vitest";
import {
  normalizeTrackingResult,
  normalizeWebTrackingResults,
} from "./normalize";

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

  it.each([undefined, null, [], [[]]])(
    "treats %s as no detection",
    (absence) => {
      const frame = normalizeTrackingResult(
        { poseLandmarks: absence, faceLandmarks: absence, handLandmarks: absence },
        123
      );
      expect(frame.poseLandmarks).toEqual([]);
      expect(frame.faceLandmarks).toEqual([]);
      expect(frame.leftHandLandmarks).toEqual([]);
      expect(frame.rightHandLandmarks).toEqual([]);
    }
  );

  it("accepts a nested face landmark collection", () => {
    const frame = normalizeTrackingResult({ faceLandmarks: [[{ x: 0.5, y: 0.5, z: 0 }]] }, 123);
    expect(frame.faceLandmarks).toHaveLength(1);
  });

  it("handles no pose and remains usable for the next frame", () => {
    expect(() => normalizeTrackingResult({ poseLandmarks: [] }, 123)).not.toThrow();
    expect(normalizeTrackingResult({ poseLandmarks: [] }, 123).poseLandmarks).toEqual([]);
    expect(normalizeTrackingResult({ poseLandmarks: [{ x: 0.5, y: 0.5, z: 0 }] }, 124).poseLandmarks).toHaveLength(1);
  });

  it.each([
    ["missing x", { y: 0, z: 0 }],
    ["NaN y", { x: 0, y: Number.NaN, z: 0 }],
    ["infinite z", { x: 0, y: 0, z: Number.POSITIVE_INFINITY }],
  ])("rejects a malformed landmark category (%s)", (_name, landmark) => {
    expect(normalizeTrackingResult({ poseLandmarks: [landmark, { x: 1, y: 1, z: 1 }] }, 123).poseLandmarks).toEqual([]);
  });

  it("preserves landmark indices when all landmarks are valid", () => {
    const frame = normalizeTrackingResult({ poseLandmarks: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }] }, 123);
    expect(frame.poseLandmarks[1]).toEqual({ x: 1, y: 1, z: 1 });
  });

  it("rejects only the malformed category and preserves valid categories", () => {
    const frame = normalizeTrackingResult({
      poseLandmarks: [{ x: 0, y: Number.NaN, z: 0 }],
      faceLandmarks: [{ x: 0, y: 0, z: 0 }],
    }, 123);
    expect(frame.poseLandmarks).toEqual([]);
    expect(frame.faceLandmarks).toHaveLength(1);
  });

  it("uses a finite boundary timestamp for malformed timestamps", () => {
    expect(normalizeTrackingResult({ timestamp: Number.NaN }, 123).timestamp).toBe(123);
    expect(normalizeTrackingResult({}, Number.POSITIVE_INFINITY).timestamp).toBeGreaterThan(0);
    expect(Number.isFinite(normalizeTrackingResult({ timestamp: undefined }).timestamp)).toBe(true);
  });

  it("does not guess ambiguous handedness", () => {
    const frame = normalizeTrackingResult({
      handLandmarks: [hand(0.5)],
      handednesses: [[{ categoryName: "Unknown" }]],
    }, 123);
    expect(frame.leftHandLandmarks).toEqual([]);
    expect(frame.rightHandLandmarks).toEqual([]);
  });

  it("preserves XYZ values through deterministic web normalization", () => {
    const frame = normalizeWebTrackingResults(
      {
        pose: { landmarks: [[{ x: 0.1, y: 0.2, z: -0.3 }]] },
        hands: {},
        face: {},
      },
      123
    );
    expect(frame.poseLandmarks[0]).toEqual({ x: 0.1, y: 0.2, z: -0.3 });
  });

  it("normalizes invalid detector output without starting a runtime", () => {
    const frame = normalizeWebTrackingResults(
      { pose: null, hands: undefined, face: "invalid" },
      123
    );
    expect(frame).toEqual({
      timestamp: 123,
      poseLandmarks: [],
      leftHandLandmarks: [],
      rightHandLandmarks: [],
      faceLandmarks: [],
    });
  });

  it("normalizes deterministic web detector results into one TrackingFrame", () => {
    const frame = normalizeWebTrackingResults(
      {
        pose: { landmarks: [[{ x: 0.1, y: 0.2, z: 0 }]] },
        hands: {
          landmarks: [[hand(0.1)]],
          handednesses: [[{ categoryName: "Left" }]],
        },
        face: { faceLandmarks: [{ x: 0.2, y: 0.2, z: 0 }] },
      },
      123
    );
    expect(frame.timestamp).toBe(123);
    expect(frame.poseLandmarks).toHaveLength(1);
    expect(frame.leftHandLandmarks).toHaveLength(1);
    expect(frame.faceLandmarks).toHaveLength(1);
  });

  it("accepts the multiHandLandmarks shape", () => {
    const frame = normalizeTrackingResult({
      multiHandLandmarks: [hand(0.1)],
      handednesses: [[{ categoryName: "Left", score: 0.8 }]],
    }, 123);
    expect(frame.leftHandLandmarks).toHaveLength(1);
  });

  it("does not assign a hand with low-confidence handedness", () => {
    const frame = normalizeTrackingResult({
      handLandmarks: [hand(0.1)],
      handednesses: [[{ categoryName: "Left", score: 0.49 }]],
    }, 123);
    expect(frame.leftHandLandmarks).toEqual([]);
    expect(frame.rightHandLandmarks).toEqual([]);
  });

  it("does not replace explicit hands with malformed indexed results", () => {
    const frame = normalizeTrackingResult({
      leftHandLandmarks: hand(0.1),
      handLandmarks: [[]],
      handednesses: [[{ categoryName: "Left" }]],
    }, 123);
    expect(frame.leftHandLandmarks).toHaveLength(1);
  });

  it("does not choose between duplicate handedness assignments", () => {
    const frame = normalizeTrackingResult({
      handLandmarks: [hand(0.1), hand(0.2)],
      handednesses: [[{ categoryName: "Left" }], [{ categoryName: "Left" }]],
    }, 123);
    expect(frame.leftHandLandmarks).toEqual([]);
    expect(frame.rightHandLandmarks).toEqual([]);
  });

  it("does not choose between contradictory handedness labels", () => {
    const frame = normalizeTrackingResult({
      handLandmarks: [hand(0.1)],
      handednesses: [[{ categoryName: "Left" }, { categoryName: "Right" }]],
    }, 123);
    expect(frame.leftHandLandmarks).toEqual([]);
    expect(frame.rightHandLandmarks).toEqual([]);
  });

  it("returns immutable tracking data", () => {
    const frame = normalizeTrackingResult({ poseLandmarks: [{ x: 0, y: 0, z: 0 }] }, 123);
    expect(Object.isFrozen(frame)).toBe(true);
    expect(Object.isFrozen(frame.poseLandmarks)).toBe(true);
    expect(Object.isFrozen(frame.poseLandmarks[0])).toBe(true);
  });
});
