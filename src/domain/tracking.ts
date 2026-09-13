export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface TrackingFrame {
  timestamp: number;
  poseLandmarks: Landmark[];
  leftHandLandmarks: Landmark[];
  rightHandLandmarks: Landmark[];
  faceLandmarks: Landmark[];
}
