import type { Landmark, TrackingFrame } from "../../tracking/model/tracking-frame";

type AlignHandDepthToPose = (frame: TrackingFrame) => TrackingFrame;

const alignHandDepth = (
  points: readonly Landmark[],
  poseWrist: Landmark | undefined,
): readonly Landmark[] => {
  const poseDepth = poseWrist?.z ?? 0;
  return Object.freeze(points.map((point) => Object.freeze({
    ...point,
    z: point.z + poseDepth,
  })));
};

export const alignHandDepthToPose: AlignHandDepthToPose = (frame) => Object.freeze({
  ...frame,
  leftHandLandmarks: alignHandDepth(frame.leftHandLandmarks, frame.poseLandmarks[15]),
  rightHandLandmarks: alignHandDepth(frame.rightHandLandmarks, frame.poseLandmarks[16]),
});
