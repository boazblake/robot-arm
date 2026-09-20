import type { Landmark, TrackingFrame } from "./tracking-frame";

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

export const getHandAnchor: GetHandAnchor = (frame, side) => {
  const handPoints = side === "left" ? frame.leftHandLandmarks : frame.rightHandLandmarks;
  const handWrist = handPoints[0] ?? null;
  const poseWrist = frame.poseLandmarks[side === "left" ? 15 : 16] ?? null;
  if (handWrist === null || poseWrist === null) return handWrist;
  // Hand coordinates are image-relative while hand z is wrist-relative. Use
  // the pose wrist as the shared arm anchor, then preserve the palm's local
  // offset so a punch is not reduced to the pose wrist's noisy depth alone.
  const palm = [0, 5, 9, 13, 17]
    .map((index) => handPoints[index])
    .filter((point): point is Landmark => point !== undefined);
  if (palm.length === 0) return Object.freeze({ ...poseWrist });
  const palmOffset = palm.reduce(
    (offset, point) => ({
      x: offset.x + (point.x - handWrist.x) / palm.length,
      y: offset.y + (point.y - handWrist.y) / palm.length,
      z: offset.z + (point.z - handWrist.z) / palm.length,
    }),
    { x: 0, y: 0, z: 0 },
  );
  return Object.freeze({
    ...poseWrist,
    x: poseWrist.x + palmOffset.x,
    y: poseWrist.y + palmOffset.y,
    z: poseWrist.z + palmOffset.z,
  });
};

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
