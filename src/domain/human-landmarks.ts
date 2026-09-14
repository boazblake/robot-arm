import type { Landmark, TrackingFrame } from "./tracking";

export type HumanPoseLandmark =
  | "leftShoulder"
  | "rightShoulder"
  | "leftElbow"
  | "rightElbow"
  | "leftWrist"
  | "rightWrist";

const poseLandmarkIndices: Readonly<Record<HumanPoseLandmark, number>> = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
};

type GetPoseLandmark = (
  frame: TrackingFrame,
  landmark: HumanPoseLandmark,
) => Landmark | null;

export const getPoseLandmark: GetPoseLandmark = (frame, landmark) =>
  frame.poseLandmarks[poseLandmarkIndices[landmark]] ?? null;

type GetHandAnchor =
  (frame: TrackingFrame, side: "left" | "right") => Landmark | null;

export const getHandAnchor: GetHandAnchor = (frame, side) =>
  (side === "left" ? frame.leftHandLandmarks : frame.rightHandLandmarks)[0] ?? null;

type GetLeftShoulder = (frame: TrackingFrame) => Landmark | null;
export const getLeftShoulder: GetLeftShoulder = (frame) =>
  getPoseLandmark(frame, "leftShoulder");

type GetRightShoulder = (frame: TrackingFrame) => Landmark | null;
export const getRightShoulder: GetRightShoulder = (frame) =>
  getPoseLandmark(frame, "rightShoulder");

type GetLeftElbow = (frame: TrackingFrame) => Landmark | null;
export const getLeftElbow: GetLeftElbow = (frame) =>
  getPoseLandmark(frame, "leftElbow");

type GetRightElbow = (frame: TrackingFrame) => Landmark | null;
export const getRightElbow: GetRightElbow = (frame) =>
  getPoseLandmark(frame, "rightElbow");

type GetLeftWrist = (frame: TrackingFrame) => Landmark | null;
export const getLeftWrist: GetLeftWrist = (frame) =>
  getPoseLandmark(frame, "leftWrist");

type GetRightWrist = (frame: TrackingFrame) => Landmark | null;
export const getRightWrist: GetRightWrist = (frame) =>
  getPoseLandmark(frame, "rightWrist");
