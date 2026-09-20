import type { Landmark, TrackingFrame } from "./tracking-frame";

export type ImagePoint = Readonly<{ readonly x: number; readonly y: number }>;
export type PoseObservation = ImagePoint & Readonly<{ readonly poseDepth: number }>;
export type HandObservation = ImagePoint & Readonly<{ readonly wristRelativeDepth: number }>;
export type FaceObservation = ImagePoint & Readonly<{ readonly faceDepth: number }>;
export type DetectorObservations = Readonly<{
  readonly timestamp: number;
  readonly pose: readonly PoseObservation[];
  readonly leftHand: readonly HandObservation[];
  readonly rightHand: readonly HandObservation[];
  readonly face: readonly FaceObservation[];
}>;

const pose = (point: Landmark): PoseObservation => Object.freeze({ x: point.x, y: point.y, poseDepth: point.z });
const hand = (point: Landmark): HandObservation => Object.freeze({ x: point.x, y: point.y, wristRelativeDepth: point.z });
const face = (point: Landmark): FaceObservation => Object.freeze({ x: point.x, y: point.y, faceDepth: point.z });

export type ReadDetectorObservations = (frame: TrackingFrame) => DetectorObservations;
export const readDetectorObservations: ReadDetectorObservations = (frame) => Object.freeze({
  timestamp: frame.timestamp,
  pose: Object.freeze(frame.poseLandmarks.map(pose)),
  leftHand: Object.freeze(frame.leftHandLandmarks.map(hand)),
  rightHand: Object.freeze(frame.rightHandLandmarks.map(hand)),
  face: Object.freeze(frame.faceLandmarks.map(face)),
});
