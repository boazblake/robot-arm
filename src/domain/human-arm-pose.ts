import {
  getHandAnchor,
  getLeftElbow,
  getLeftShoulder,
  getLeftWrist,
  getRightElbow,
  getRightShoulder,
  getRightWrist,
} from "./human-landmarks";
import type { Landmark, TrackingFrame } from "./tracking";

export type HumanArmPoint = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
}>;

export type HumanArm = Readonly<{
  readonly shoulder: HumanArmPoint;
  readonly elbow: HumanArmPoint;
  readonly wrist: HumanArmPoint;
  readonly handAnchor: HumanArmPoint;
}>;

export type HumanArmPose = Readonly<{
  readonly timestamp: number;
  readonly left: HumanArm | null;
  readonly right: HumanArm | null;
}>;

type FiniteLandmark = (landmark: Landmark | null) => Landmark | null;

const finiteLandmark: FiniteLandmark = (landmark) =>
  landmark !== null &&
  Number.isFinite(landmark.x) &&
  Number.isFinite(landmark.y) &&
  Number.isFinite(landmark.z)
    ? landmark
    : null;

type LandmarkPoint = (landmark: Landmark) => HumanArmPoint;

const landmarkPoint: LandmarkPoint = (landmark) =>
  Object.freeze({ x: landmark.x, y: landmark.y, z: landmark.z });

type BuildArm = (
  shoulder: Landmark | null,
  elbow: Landmark | null,
  wrist: Landmark | null,
  handAnchor: Landmark | null,
) => HumanArm | null;

const buildArm: BuildArm = (shoulder, elbow, wrist, handAnchor) => {
  const shoulderPoint = finiteLandmark(shoulder);
  const elbowPoint = finiteLandmark(elbow);
  const wristPoint = finiteLandmark(wrist);
  const handAnchorPoint = finiteLandmark(handAnchor);
  if (
    shoulderPoint === null ||
    elbowPoint === null ||
    wristPoint === null ||
    handAnchorPoint === null
  ) {
    return null;
  }

  return Object.freeze({
    shoulder: landmarkPoint(shoulderPoint),
    elbow: landmarkPoint(elbowPoint),
    wrist: landmarkPoint(wristPoint),
    handAnchor: landmarkPoint(handAnchorPoint),
  });
};

type CreateHumanArmPose = (frame: TrackingFrame) => HumanArmPose;

export const createHumanArmPose: CreateHumanArmPose = (frame) =>
  Object.freeze({
    timestamp: frame.timestamp,
    left: buildArm(
      getLeftShoulder(frame),
      getLeftElbow(frame),
      getLeftWrist(frame),
      getHandAnchor(frame, "left"),
    ),
    right: buildArm(
      getRightShoulder(frame),
      getRightElbow(frame),
      getRightWrist(frame),
      getHandAnchor(frame, "right"),
    ),
  });
