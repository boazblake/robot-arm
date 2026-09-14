import { describe, expect, it } from "vitest";
import { createHumanArmPose } from "./human-arm-pose";
import {
  createTrackingConfidencePolicy,
  evaluateTrackingValidity,
} from "./tracking-validity";
import type { Landmark, TrackingFrame } from "./tracking";

const landmark = (value: number, visibility?: number): Landmark => ({
  x: value,
  y: value + 1,
  z: value + 2,
  ...(visibility === undefined ? {} : { visibility }),
});

const frame = (
  left: Landmark | null = landmark(1, 0.8),
  right: Landmark | null = landmark(2, 0.8),
): TrackingFrame => ({
  timestamp: 10,
  poseLandmarks: [
    ...Array.from({ length: 17 }, (_, index) => landmark(index, 0.8)),
  ].map((item, index) =>
    index === 11 || index === 13 || index === 15 ? left ?? item :
    index === 12 || index === 14 || index === 16 ? right ?? item : item,
  ),
  leftHandLandmarks: left === null ? [] : [left],
  rightHandLandmarks: right === null ? [] : [right],
  faceLandmarks: [],
});

const policy = (minimumVisibility = 0.5, missingVisibility: "accept" | "reject" = "reject") => {
  const result = createTrackingConfidencePolicy(minimumVisibility, missingVisibility);
  if (!result.ok) throw new Error("expected valid policy");
  return result.policy;
};

const validity = (input: TrackingFrame, minimum = 0.5, missing: "accept" | "reject" = "reject") => {
  const snapshot = createHumanArmPose(input);
  return evaluateTrackingValidity(input, snapshot, policy(minimum, missing));
};

describe("tracking validity", () => {
  it("evaluates both arms independently", () => {
    expect(validity(frame())).toEqual({ left: { valid: true }, right: { valid: true } });
    expect(validity(frame(landmark(1, 0.8), landmark(2, 0.2))).right).toEqual({
      valid: false,
      reason: "confidence-below-threshold",
    });
    expect(validity(frame(null, landmark(2, 0.8)))).toEqual({
      left: { valid: false, reason: "arm-unavailable" },
      right: { valid: true },
    });
  });

  it.each([
    [0.8, true],
    [0.5, true],
    [0.2, false],
  ])("applies an inclusive visibility threshold (%s)", (visibility, valid) => {
    expect(validity(frame(landmark(1, visibility), landmark(2, visibility))).left).toEqual(
      valid ? { valid: true } : { valid: false, reason: "confidence-below-threshold" },
    );
  });

  it("handles missing visibility according to policy", () => {
    const missingFrame = frame(landmark(1), landmark(2));
    expect(validity(missingFrame, 0.5, "accept").left).toEqual({ valid: true });
    expect(validity(missingFrame, 0.5, "reject").left).toEqual({
      valid: false,
      reason: "confidence-unavailable",
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -0.1, 1.1])(
    "rejects invalid visibility %s",
    (visibility) => {
      expect(validity(frame(landmark(1, visibility), landmark(2, 0.8))).left).toEqual({
        valid: false,
        reason: "confidence-invalid",
      });
    },
  );

  it("reports both unavailable arms", () => {
    expect(validity(frame(null, null))).toEqual({
      left: { valid: false, reason: "arm-unavailable" },
      right: { valid: false, reason: "arm-unavailable" },
    });
  });

  it("does not trust pose data without corresponding frame evidence", () => {
    const input = frame();
    const pose = createHumanArmPose(input);
    const missingEvidence = { ...input, leftHandLandmarks: [] };
    expect(evaluateTrackingValidity(missingEvidence, pose, policy()).left).toEqual({
      valid: false,
      reason: "arm-unavailable",
    });
  });

  it("rejects invalid policy thresholds", () => {
    for (const threshold of [Number.NaN, Number.POSITIVE_INFINITY, -0.1, 1.1]) {
      expect(createTrackingConfidencePolicy(threshold, "reject")).toEqual({
        ok: false,
        reason: "minimum-visibility-invalid",
      });
    }
  });

  it("freezes validity results and policy values", () => {
    const result = validity(frame());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.left)).toBe(true);
    const created = createTrackingConfidencePolicy(0.5, "reject");
    expect(created.ok && Object.isFrozen(created.policy)).toBe(true);
  });
});
