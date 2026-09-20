import type { Landmark, TrackingFrame } from "./tracking-frame";

export type Point3D = Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
export type Point2D = Readonly<{ readonly x: number; readonly y: number }>;
export type RotationAxis = "x" | "y" | "z";

/** MediaPipe Pose World Landmarks use meters, +X right, +Y down, +Z away from the camera (smaller z is closer). */
export const POSE_WORLD_AXES = Object.freeze({ x: "+X right", y: "+Y down", z: "+Z away from camera" });
export const POSE_DIAGNOSTIC_ANGLES = Object.freeze([0, 45, 90, 180, 270, 360]);
export const POSE_CONNECTIONS = Object.freeze([
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24],
  [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
] as const);

export type BoneLengthMeasurement = Readonly<{
  readonly connection: readonly [number, number];
  readonly distanceBefore: number;
  readonly distanceAfter: number;
}>;

export type PoseDiagnosticSnapshot = Readonly<{
  readonly frameId: number;
  readonly rotation: Readonly<{ readonly axis: Uppercase<RotationAxis>; readonly degrees: number }>;
  readonly center: Point3D;
  readonly sourceLandmarks: readonly Point3D[];
  readonly rotatedLandmarks: readonly Point3D[];
  readonly projectedLandmarks: readonly Point2D[];
  readonly boneLengthMeasurements: readonly BoneLengthMeasurement[];
}>;

const toPoint3D = (point: Landmark): Point3D => Object.freeze({ x: point.x, y: point.y, z: point.z });

export const poseWorldPoints = (frame: TrackingFrame): readonly Point3D[] =>
  Object.freeze((frame.poseWorldLandmarks ?? []).map(toPoint3D));

export const poseHipCenter = (points: readonly Point3D[]): Point3D => {
  const leftHip = points[23];
  const rightHip = points[24];
  if (!leftHip || !rightHip) throw new Error("Pose world landmarks 23 and 24 are required");
  return Object.freeze({
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2,
  });
};

export const rotatePointAroundCenter = (axis: RotationAxis, degrees: number, point: Point3D, center: Point3D): Point3D => {
  const theta = degrees * Math.PI / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const dz = point.z - center.z;
  const cosine = Math.cos(theta);
  const sine = Math.sin(theta);
  const local = axis === "x"
    ? { x: dx, y: dy * cosine - dz * sine, z: dy * sine + dz * cosine }
    : axis === "z"
      ? { x: dx * cosine - dy * sine, y: dx * sine + dy * cosine, z: dz }
      : { x: dx * cosine + dz * sine, y: dy, z: -dx * sine + dz * cosine };
  return Object.freeze({ x: local.x + center.x, y: local.y + center.y, z: local.z + center.z });
};

export const rotatePoseWorld = (source: readonly Point3D[], axis: RotationAxis, degrees: number, center: Point3D): readonly Point3D[] =>
  Object.freeze(source.map((point) => rotatePointAroundCenter(axis, degrees, point, center)));

export const orthographicProject = (point: Point3D, canvasWidth: number, canvasHeight: number, scale: number): Point2D =>
  Object.freeze({ x: canvasWidth / 2 + point.x * scale, y: canvasHeight / 2 + point.y * scale });

export const distance3D = (a: Point3D, b: Point3D): number =>
  Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);

export const createPoseDiagnosticSnapshot = (
  frameId: number,
  source: readonly Point3D[],
  axis: RotationAxis,
  degrees: number,
  projection: Readonly<{ readonly width: number; readonly height: number; readonly scale: number }>,
): PoseDiagnosticSnapshot => {
  const center = poseHipCenter(source);
  const rotatedLandmarks = rotatePoseWorld(source, axis, degrees, center);
  return Object.freeze({
    frameId,
    rotation: Object.freeze({ axis: axis === "x" ? "X" : axis === "y" ? "Y" : "Z", degrees }),
    center,
    sourceLandmarks: source,
    rotatedLandmarks,
    projectedLandmarks: Object.freeze(rotatedLandmarks.map((point) => orthographicProject(point, projection.width, projection.height, projection.scale))),
    boneLengthMeasurements: measureBoneLengths(source, rotatedLandmarks),
  });
};

export const createPoseDiagnosticSeries = (
  frameId: number,
  source: readonly Point3D[],
  projection: Readonly<{ readonly width: number; readonly height: number; readonly scale: number }>,
): readonly PoseDiagnosticSnapshot[] =>
  Object.freeze(POSE_DIAGNOSTIC_ANGLES.map((degrees) => createPoseDiagnosticSnapshot(frameId, source, "y", degrees, projection)));

export const measureBoneLengths = (source: readonly Point3D[], rotated: readonly Point3D[]): readonly BoneLengthMeasurement[] =>
  Object.freeze(POSE_CONNECTIONS.map(([start, end]) => Object.freeze({
    connection: [start, end] as const,
    distanceBefore: distance3D(source[start], source[end]),
    distanceAfter: distance3D(rotated[start], rotated[end]),
  })));

export const maxLandmarkError = (a: readonly Point3D[], b: readonly Point3D[]): number =>
  Math.max(...a.map((point, index) => distance3D(point, b[index] ?? point)));
