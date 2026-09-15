import Stream from "mithril/stream";
import { angle } from "../../domain/geometry";
import {
  calibrateArm,
  calculateArmDisplacement,
  type ArmCalibration,
  type ArmSide,
  type CalibrationState,
  type DisplacementResult,
} from "../../domain/arm-calibration";
import { createHumanArmPose, type HumanArm, type HumanArmPose } from "../../domain/human-arm-pose";
import { getHandAnchor } from "../../domain/human-landmarks";
import { createRobotTarget, type RobotTarget } from "../../domain/robot-target";
import { mapTeleopPosition, type TeleopPositionResult } from "../../domain/teleop-mapper";
import {
  createStabilizationConfig,
  createStabilizationState,
  stabilizeWorkspacePosition,
  type StabilizationConfig,
  type StabilizationState,
} from "../../domain/stabilization";
import {
  createWorkspaceMapping,
  type WorkspaceMapping,
  type WorkspacePosition,
} from "../../domain/workspace-mapping";
import {
  createTrackingConfidencePolicy,
  evaluateTrackingValidity,
  type ArmTrackingValidity,
  type TrackingValidity,
} from "../../domain/tracking-validity";
import type { Landmark, TrackingFrame } from "../../domain/tracking";

const requiredVisibility = (frame: TrackingFrame, side: ArmSide): readonly (Landmark | null)[] => {
  const pose = frame.poseLandmarks;
  return side === "left"
    ? [pose[11] ?? null, pose[13] ?? null, pose[15] ?? null, getHandAnchor(frame, side)]
    : [pose[12] ?? null, pose[14] ?? null, pose[16] ?? null, getHandAnchor(frame, side)];
};

export type ArmPipelineSnapshot = Readonly<{
  readonly pose: HumanArm | null;
  readonly validity: ArmTrackingValidity;
  readonly calibration: ArmCalibration | null;
  readonly displacement: DisplacementResult;
  readonly mapped: WorkspacePosition | null;
  readonly stabilized: WorkspacePosition | null;
  readonly target: RobotTarget | null;
  readonly elbowAngle: number | null;
  readonly shoulderAngle: number | null;
  readonly visibility: readonly (Landmark | null)[];
  readonly trail: readonly WorkspacePosition[];
}>;

export type TrackingPipelineSnapshot = Readonly<{
  readonly frame: TrackingFrame;
  readonly pose: HumanArmPose;
  readonly validity: TrackingValidity;
  readonly calibration: CalibrationState;
  readonly stabilization: StabilizationConfig;
  readonly arms: Readonly<{ readonly left: ArmPipelineSnapshot; readonly right: ArmPipelineSnapshot }>;
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
if (!validPolicy.ok || !validMapping.ok || !validStabilization.ok) {
  throw new Error("Invalid tracking pipeline defaults");
}

const emptyFrame: TrackingFrame = Object.freeze({
  timestamp: 0,
  poseLandmarks: [],
  leftHandLandmarks: [],
  rightHandLandmarks: [],
  faceLandmarks: [],
});

const emptyArm = (validity: ArmTrackingValidity, visibility: readonly (Landmark | null)[]): ArmPipelineSnapshot =>
  Object.freeze({
    pose: null,
    validity,
    calibration: null,
    displacement: Object.freeze({ available: false, reason: "not-calibrated" }),
    mapped: null,
    stabilized: null,
    target: null,
    elbowAngle: null,
    shoulderAngle: null,
    visibility,
    trail: [],
  });

const initialValidity: TrackingValidity = Object.freeze({
  left: Object.freeze({ valid: false, reason: "arm-unavailable" }),
  right: Object.freeze({ valid: false, reason: "arm-unavailable" }),
});

const initialSnapshot: TrackingPipelineSnapshot = Object.freeze({
  frame: emptyFrame,
  pose: Object.freeze({ timestamp: 0, left: null, right: null }),
  validity: initialValidity,
  calibration: Object.freeze({ left: null, right: null }),
  stabilization: validStabilization.config,
  arms: Object.freeze({
    left: emptyArm(initialValidity.left, []),
    right: emptyArm(initialValidity.right, []),
  }),
});

export const pipeline = Stream<TrackingPipelineSnapshot>(initialSnapshot);

let calibration: CalibrationState = Object.freeze({ left: null, right: null });
let stabilizationState: StabilizationState = createStabilizationState();
let sequence = 0;

const readCalibration = (side: ArmSide): ArmCalibration | null =>
  side === "left" ? calibration.left : calibration.right;

const readArm = (pose: HumanArmPose, side: ArmSide): HumanArm | null =>
  side === "left" ? pose.left : pose.right;

const makeArmSnapshot = (
  frame: TrackingFrame,
  pose: HumanArmPose,
  validity: TrackingValidity,
  side: ArmSide,
  mapping: WorkspaceMapping,
  stabilization: StabilizationConfig,
  previousTrail: readonly WorkspacePosition[],
): ArmPipelineSnapshot => {
  const currentArm = readArm(pose, side);
  const armValidity = side === "left" ? validity.left : validity.right;
  const visibility = requiredVisibility(frame, side);
  if (currentArm === null) return emptyArm(armValidity, visibility);

  const displacement = calculateArmDisplacement(readCalibration(side), currentArm);
  const mappedResult: TeleopPositionResult = mapTeleopPosition({
    side,
    pose,
    calibration: readCalibration(side),
    validity: armValidity,
    workspace: mapping,
  });
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
    calibration: readCalibration(side),
    displacement,
    mapped,
    stabilized,
    target: targetConstruction?.ok ? targetConstruction.target : null,
    elbowAngle: angle(currentArm.shoulder, currentArm.elbow, currentArm.wrist),
    shoulderAngle: angle(currentArm.elbow, currentArm.shoulder, currentArm.handAnchor),
    visibility,
    trail,
  });
};

type ProcessTrackingFrame = (frame: TrackingFrame) => TrackingPipelineSnapshot;
export const processTrackingFrame: ProcessTrackingFrame = (frame) => {
  const pose = createHumanArmPose(frame);
  const validity = evaluateTrackingValidity(frame, pose, validPolicy.policy);
  const previous = pipeline();
  const next = Object.freeze({
    frame,
    pose,
    validity,
    calibration,
    stabilization: validStabilization.config,
    arms: Object.freeze({
      left: makeArmSnapshot(frame, pose, validity, "left", validMapping.mapping, validStabilization.config, previous.arms.left.trail),
      right: makeArmSnapshot(frame, pose, validity, "right", validMapping.mapping, validStabilization.config, previous.arms.right.trail),
    }),
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
  if (result.ok) setCalibrationForSide(side, result.calibration);
};

export const resetTrackingArmCalibration = (side: ArmSide): void => {
  setCalibrationForSide(side, null);
};

export const resetTrackingPipeline = (): void => {
  calibration = Object.freeze({ left: null, right: null });
  stabilizationState = createStabilizationState();
  sequence = 0;
  pipeline(initialSnapshot);
};
