import type { HumanArmPose } from "../model/human-arm-pose";
import {
  getHandAnchor,
  getLeftElbow,
  getLeftShoulder,
  getLeftWrist,
  getRightElbow,
  getRightShoulder,
  getRightWrist,
} from "../model/human-landmarks";
import type { Landmark, TrackingFrame } from "../model/tracking-frame";

export type TrackingConfidencePolicy = Readonly<{
  readonly minimumVisibility: number;
  readonly missingVisibility: "accept" | "reject";
}>;

export type TrackingConfidencePolicyResult =
  | Readonly<{
      readonly ok: true;
      readonly policy: TrackingConfidencePolicy;
    }>
  | Readonly<{
      readonly ok: false;
      readonly reason: "minimum-visibility-invalid";
    }>;

export type ArmTrackingValidity =
  | Readonly<{ readonly valid: true }>
  | Readonly<{
      readonly valid: false;
      readonly reason:
        | "arm-unavailable"
        | "confidence-unavailable"
        | "confidence-invalid"
        | "confidence-below-threshold";
    }>;

export type TrackingValidity = Readonly<{
  readonly left: ArmTrackingValidity;
  readonly right: ArmTrackingValidity;
}>;

type CreateTrackingConfidencePolicy = (
  minimumVisibility: number,
  missingVisibility: "accept" | "reject",
) => TrackingConfidencePolicyResult;

export const createTrackingConfidencePolicy: CreateTrackingConfidencePolicy = (
  minimumVisibility,
  missingVisibility,
) =>
  Number.isFinite(minimumVisibility) &&
  minimumVisibility >= 0 &&
  minimumVisibility <= 1
    ? Object.freeze({
        ok: true,
        policy: Object.freeze({ minimumVisibility, missingVisibility }),
      })
    : Object.freeze({ ok: false, reason: "minimum-visibility-invalid" });

type RequiredLandmarks = (frame: TrackingFrame, side: "left" | "right") => readonly (Landmark | null)[];

const requiredLandmarks: RequiredLandmarks = (frame, side) =>
  side === "left"
    ? [
        getLeftShoulder(frame),
        getLeftElbow(frame),
        getLeftWrist(frame),
        getHandAnchor(frame, "left"),
      ]
    : [
        getRightShoulder(frame),
        getRightElbow(frame),
        getRightWrist(frame),
        getHandAnchor(frame, "right"),
      ];

type EvaluateArmTrackingValidity = (
  frame: TrackingFrame,
  armAvailable: boolean,
  side: "left" | "right",
  policy: TrackingConfidencePolicy,
) => ArmTrackingValidity;

const evaluateArmTrackingValidity: EvaluateArmTrackingValidity = (
  frame,
  armAvailable,
  side,
  policy,
) => {
  if (!armAvailable) return Object.freeze({ valid: false, reason: "arm-unavailable" });

  const landmarks = requiredLandmarks(frame, side);
  if (landmarks.some((landmark) => landmark === null)) {
    return Object.freeze({ valid: false, reason: "arm-unavailable" });
  }

  for (const landmark of landmarks) {
    if (landmark?.visibility === undefined) {
      if (policy.missingVisibility === "reject") {
        return Object.freeze({ valid: false, reason: "confidence-unavailable" });
      }
      continue;
    }
    if (!Number.isFinite(landmark.visibility) || landmark.visibility < 0 || landmark.visibility > 1) {
      return Object.freeze({ valid: false, reason: "confidence-invalid" });
    }
    if (landmark.visibility < policy.minimumVisibility) {
      return Object.freeze({ valid: false, reason: "confidence-below-threshold" });
    }
  }

  return Object.freeze({ valid: true });
};

type EvaluateTrackingValidity = (
  frame: TrackingFrame,
  pose: HumanArmPose,
  policy: TrackingConfidencePolicy,
) => TrackingValidity;

export const evaluateTrackingValidity: EvaluateTrackingValidity = (frame, pose, policy) =>
  Object.freeze({
    left: evaluateArmTrackingValidity(frame, pose.left !== null, "left", policy),
    right: evaluateArmTrackingValidity(frame, pose.right !== null, "right", policy),
  });
