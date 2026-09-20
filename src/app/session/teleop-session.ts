import Stream from "mithril/stream";
import { angle } from "../../shared/geometry/geometry";
import { rotateIntoPreviewFrame } from "../../shared/geometry/rotation";
import {
  buildCanonicalHumanScene,
  calibratedDisplacement,
  type CanonicalHumanScene,
  type CanonicalHumanSpace,
} from "../../tracking/model/canonical-coordinate-pipeline";
import {
  calibrateArm,
  type ArmCalibration,
  type ArmSide,
  type CalibrationState,
  type DisplacementResult,
} from "../../teleoperation/calibration/arm-calibration";
import { createHumanArmPose, type HumanArm, type HumanArmPose } from "../../tracking/model/human-arm-pose";
import { getHandAnchor } from "../../tracking/model/human-landmarks";
import {
  createFreshnessConfig,
  createInputFreshnessState,
  updateInputFreshness,
  type InputFreshnessState,
} from "../../teleoperation/freshness/input-freshness";
import { createRobotTarget, type RobotTarget } from "../../robotics/model/robot-target";
import {
  createStabilizationConfig,
  createStabilizationState,
  stabilizeWorkspacePosition,
  type StabilizationConfig,
  type StabilizationState,
} from "../../teleoperation/stabilization/workspace-stabilization";
import {
  createWorkspaceMapping,
  type WorkspaceMapping,
  type WorkspacePosition,
} from "../../teleoperation/mapping/workspace-mapping";
import {
  createTrackingConfidencePolicy,
  evaluateTrackingValidity,
  type ArmTrackingValidity,
  type TrackingValidity,
} from "../../tracking/validity/tracking-validity";
import type { Landmark, TrackingFrame } from "../../tracking/model/tracking-frame";
import { isFrontCamera, previewRotationDegrees } from "./store";

const requiredVisibility = (frame: TrackingFrame, side: ArmSide): readonly (Landmark | null)[] => {
  const pose = frame.poseLandmarks;
  return side === "left"
    ? [pose[11] ?? null, pose[13] ?? null, pose[15] ?? null, getHandAnchor(frame, side)]
    : [pose[12] ?? null, pose[14] ?? null, pose[16] ?? null, getHandAnchor(frame, side)];
};

export type ArmPipelineSnapshot = Readonly<{
  readonly pose: HumanArm | null;
  readonly validity: ArmTrackingValidity;
  readonly freshness: "fresh" | "stale" | "lost";
  readonly calibration: ArmCalibration | null;
  readonly displacement: DisplacementResult;
  readonly mapped: WorkspacePosition | null;
  readonly stabilized: WorkspacePosition | null;
  readonly target: RobotTarget | null;
  readonly elbowAngle: number | null;
  readonly shoulderAngle: number | null;
  readonly visibility: readonly (Landmark | null)[];
  readonly trail: readonly WorkspacePosition[];
  readonly canonical: CanonicalHumanSpace | null;
  readonly neutral: CanonicalHumanSpace | null;
  readonly uiFrameDisplacement: { readonly x: number; readonly y: number; readonly z: number } | null;
}>;

export type TrackingPipelineSnapshot = Readonly<{
  readonly frame: TrackingFrame;
  readonly pose: HumanArmPose;
  readonly validity: TrackingValidity;
  readonly freshness: InputFreshnessState;
  readonly calibration: CalibrationState;
  readonly stabilization: StabilizationConfig;
  readonly arms: Readonly<{ readonly left: ArmPipelineSnapshot; readonly right: ArmPipelineSnapshot }>;
  readonly humanFrame: CanonicalHumanScene;
}>;

const validPolicy = createTrackingConfidencePolicy(0.5, "accept");
const validMapping = createWorkspaceMapping({
  x: { source: "x", direction: 1, range: 0.5 },
  y: { source: "y", direction: 1, range: 0.5 },
  z: { source: "z", direction: 1, range: 0.5 },
});
const validStabilization = createStabilizationConfig({
  alpha: 0.35,
  deadZone: { x: 0.03, y: 0.03, z: 0.03 },
});
const validFreshness = createFreshnessConfig();
type CoordinateRotation = (displacement: { readonly x: number; readonly y: number; readonly z: number }) => { readonly x: number; readonly y: number; readonly z: number };
const coordinateRotation: CoordinateRotation = (displacement) => {
  const transformed = rotateIntoPreviewFrame(previewRotationDegrees(), displacement);
  const x = isFrontCamera() === "web-camera-front" ? -transformed.x : transformed.x;
  return Object.freeze({ x, y: transformed.y, z: transformed.z });
};
if (!validPolicy.ok || !validMapping.ok || !validStabilization.ok || !validFreshness.ok) {
  throw new Error("Invalid tracking pipeline defaults");
}

const emptyFrame: TrackingFrame = Object.freeze({
  timestamp: 0,
  poseLandmarks: [],
  poseWorldLandmarks: [],
  leftHandLandmarks: [],
  rightHandLandmarks: [],
  faceLandmarks: [],
});

const emptyArm = (validity: ArmTrackingValidity, visibility: readonly (Landmark | null)[]): ArmPipelineSnapshot =>
  Object.freeze({
    pose: null,
    validity,
    freshness: "lost",
    calibration: null,
    displacement: Object.freeze({ available: false, reason: "not-calibrated" }),
    mapped: null,
    stabilized: null,
    target: null,
    elbowAngle: null,
    shoulderAngle: null,
    visibility,
    trail: [],
    canonical: null,
    neutral: null,
    uiFrameDisplacement: null,
  });

const initialValidity: TrackingValidity = Object.freeze({
  left: Object.freeze({ valid: false, reason: "arm-unavailable" }),
  right: Object.freeze({ valid: false, reason: "arm-unavailable" }),
});

const initialSnapshot: TrackingPipelineSnapshot = Object.freeze({
  frame: emptyFrame,
  pose: Object.freeze({ timestamp: 0, left: null, right: null }),
  validity: initialValidity,
  freshness: createInputFreshnessState(),
  calibration: Object.freeze({ left: null, right: null }),
  stabilization: validStabilization.config,
  arms: Object.freeze({
    left: emptyArm(initialValidity.left, []),
    right: emptyArm(initialValidity.right, []),
  }),
  humanFrame: buildCanonicalHumanScene(emptyFrame),
});

export const pipeline = Stream<TrackingPipelineSnapshot>(initialSnapshot);

let calibration: CalibrationState = Object.freeze({ left: null, right: null });
let canonicalNeutral: Readonly<{ readonly left: CanonicalHumanSpace | null; readonly right: CanonicalHumanSpace | null }> = Object.freeze({ left: null, right: null });
let stabilizationState: StabilizationState = createStabilizationState();
let freshnessState: InputFreshnessState = createInputFreshnessState();
let sequence = 0;

const readCalibration = (side: ArmSide): ArmCalibration | null =>
  side === "left" ? calibration.left : calibration.right;

const readArm = (pose: HumanArmPose, side: ArmSide): HumanArm | null =>
  side === "left" ? pose.left : pose.right;

type RebaseRecoveredArm = (pose: HumanArmPose, side: ArmSide) => void;
const rebaseRecoveredArm: RebaseRecoveredArm = (pose, side) => {
  const current = readArm(pose, side);
  if (current === null) return;
  const reference = Object.freeze({
    shoulder: Object.freeze({ ...current.shoulder }),
    elbow: Object.freeze({ ...current.elbow }),
    wrist: Object.freeze({ ...current.wrist }),
    handAnchor: Object.freeze({ ...current.handAnchor }),
  });
  const nextCalibration = Object.freeze({ side, timestamp: pose.timestamp, reference });
  calibration = Object.freeze(side === "left"
    ? { left: nextCalibration, right: calibration.right }
    : { left: calibration.left, right: nextCalibration });
  stabilizationState = Object.freeze(side === "left"
    ? { left: null, right: stabilizationState.right }
    : { left: stabilizationState.left, right: null });
};

const makeArmSnapshot = (
  frame: TrackingFrame,
  pose: HumanArmPose,
  validity: TrackingValidity,
  freshness: "fresh" | "stale" | "lost",
  side: ArmSide,
  mapping: WorkspaceMapping,
  stabilization: StabilizationConfig,
  previousTrail: readonly WorkspacePosition[],
  scene: CanonicalHumanScene,
): ArmPipelineSnapshot => {
  const currentArm = readArm(pose, side);
  const canonicalArm = side === "left" ? scene.arms.left : scene.arms.right;
  const armValidity = side === "left" ? validity.left : validity.right;
  const visibility = requiredVisibility(frame, side);
  if (currentArm === null || canonicalArm === null || !armValidity.valid) return emptyArm(armValidity, visibility);

  const neutral = side === "left" ? canonicalNeutral.left : canonicalNeutral.right;
  const displacement = neutral === null || canonicalArm.hand === null
    ? Object.freeze({ available: false as const, reason: neutral === null ? "not-calibrated" as const : "arm-unavailable" as const })
    : Object.freeze({ available: true as const, displacement: calibratedDisplacement(canonicalArm.hand.palm, neutral) });
  const uiDisplacement = displacement.available ? coordinateRotation(displacement.displacement) : null;
  const mappedResult = uiDisplacement === null
    ? Object.freeze({ ok: false as const, reason: "not-calibrated" as const })
    : mapping.mapDisplacement(side, uiDisplacement);
  const mapped = mappedResult.ok ? mappedResult.position : null;
  let stabilized: WorkspacePosition | null = null;
  if (mapped !== null) {
    const result = stabilizeWorkspacePosition(stabilizationState, side, mapped, stabilization);
    if (result.ok) {
      stabilizationState = result.state;
      stabilized = result.position;
    }
  }
  const targetConstruction = stabilized === null
    ? null
    : createRobotTarget({ side, position: stabilized, sourceTimestamp: frame.timestamp, sequence: sequence++ });
  const trail = stabilized === null
    ? previousTrail
    : Object.freeze([...previousTrail, stabilized].slice(-12));

  return Object.freeze({
    pose: currentArm,
    validity: armValidity,
    freshness,
    calibration: readCalibration(side),
    displacement,
    mapped,
    stabilized,
    target: targetConstruction?.ok ? targetConstruction.target : null,
    canonical: canonicalArm.hand?.palm ?? null,
    neutral,
    uiFrameDisplacement: uiDisplacement,
    elbowAngle: angle(currentArm.shoulder, currentArm.elbow, currentArm.wrist),
    shoulderAngle: angle(currentArm.elbow, currentArm.shoulder, currentArm.handAnchor),
    visibility,
    trail,
  });
};

type ProcessTrackingFrame = (frame: TrackingFrame) => TrackingPipelineSnapshot;
export const processTrackingFrame: ProcessTrackingFrame = (frame) => {
  const pose = createHumanArmPose(frame);
  const humanFrame = buildCanonicalHumanScene(frame);
  const validity = evaluateTrackingValidity(frame, pose, validPolicy.policy);
  const previous = pipeline();
  const now = performance.now();
  const leftUpdate = updateInputFreshness(
    freshnessState,
    "left",
    validity.left.valid,
    now,
    validFreshness.config,
  );
  freshnessState = leftUpdate.state;
  const rightUpdate = updateInputFreshness(
    freshnessState,
    "right",
    validity.right.valid,
    now,
    validFreshness.config,
  );
  freshnessState = rightUpdate.state;
  if (leftUpdate.events.includes("tracking-recovered")) rebaseRecoveredArm(pose, "left");
  if (rightUpdate.events.includes("tracking-recovered")) rebaseRecoveredArm(pose, "right");
  const next = Object.freeze({
    frame,
    pose,
    validity,
    freshness: freshnessState,
    calibration,
    stabilization: validStabilization.config,
    arms: Object.freeze({
      left: makeArmSnapshot(frame, pose, validity, freshnessState.left.status, "left", validMapping.mapping, validStabilization.config, previous.arms.left.trail, humanFrame),
      right: makeArmSnapshot(frame, pose, validity, freshnessState.right.status, "right", validMapping.mapping, validStabilization.config, previous.arms.right.trail, humanFrame),
    }),
    humanFrame,
  });
  pipeline(next);
  return next;
};

const setCalibrationForSide = (side: ArmSide, value: ArmCalibration | null): void => {
  calibration = Object.freeze(side === "left"
    ? { left: value, right: calibration.right }
    : { left: calibration.left, right: value });
  stabilizationState = Object.freeze({ left: null, right: null });
  processTrackingFrame(pipeline().frame);
};

export const calibrateTrackingArm = (side: ArmSide): void => {
  const result = calibrateArm(pipeline().pose, side, false);
  const canonicalArm = side === "left" ? pipeline().humanFrame.arms.left : pipeline().humanFrame.arms.right;
  if (!result.ok || canonicalArm === null || canonicalArm.hand === null) return;
  {
    setCalibrationForSide(side, result.calibration);
    canonicalNeutral = Object.freeze(side === "left"
      ? { left: canonicalArm.hand.palm, right: canonicalNeutral.right }
      : { left: canonicalNeutral.left, right: canonicalArm.hand.palm });
    processTrackingFrame(pipeline().frame);
  }
};

export const resetTrackingArmCalibration = (side: ArmSide): void => {
  setCalibrationForSide(side, null);
  canonicalNeutral = Object.freeze(side === "left"
    ? { left: null, right: canonicalNeutral.right }
    : { left: canonicalNeutral.left, right: null });
  processTrackingFrame(pipeline().frame);
};

export const resetTrackingPipeline = (): void => {
  calibration = Object.freeze({ left: null, right: null });
  canonicalNeutral = Object.freeze({ left: null, right: null });
  stabilizationState = createStabilizationState();
  freshnessState = createInputFreshnessState();
  sequence = 0;
  pipeline(initialSnapshot);
};
