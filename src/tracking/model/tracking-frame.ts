export type Landmark = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly visibility?: number;
}>;

export type TrackingFrame = Readonly<{
  readonly timestamp: number;
  readonly poseLandmarks: readonly Landmark[];
  readonly leftHandLandmarks: readonly Landmark[];
  readonly rightHandLandmarks: readonly Landmark[];
  readonly faceLandmarks: readonly Landmark[];
}>;
