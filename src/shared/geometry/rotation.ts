export type Coordinate3D = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
}>;

/** Rotates a point around the y-axis by an angle in radians. */
export type RotateAroundYAxis = (
  angle: number,
  point: Coordinate3D,
) => Coordinate3D;

export const rotateAroundYAxis: RotateAroundYAxis = (angle, point) => {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return Object.freeze({
    x: point.x * cosine - point.z * sine,
    y: point.y,
    z: point.x * sine + point.z * cosine,
  });
};

export type PreviewFrameAngle = (rotationDegrees: number) => number;

/** Returns the camera-to-UI yaw used by both rendering and teleoperation. */
export const previewFrameAngle: PreviewFrameAngle = (rotationDegrees) =>
  (-rotationDegrees * Math.PI) / 180;

export type RotateIntoPreviewFrame = (
  rotationDegrees: number,
  point: Coordinate3D,
) => Coordinate3D;

/** Converts a camera-relative vector into the currently rotated UI frame. */
export const rotateIntoPreviewFrame: RotateIntoPreviewFrame = (rotationDegrees, point) =>
  rotateAroundYAxis(previewFrameAngle(rotationDegrees), point);

/** Perspective-projects a point after translating it away from the camera. */
export type ProjectPerspective = (
  point: Coordinate3D,
  cameraDistance: number,
) => Readonly<{ readonly x: number; readonly y: number }>;

export const projectPerspective: ProjectPerspective = (point, cameraDistance) => ({
  x: point.x / (point.z + cameraDistance),
  y: point.y / (point.z + cameraDistance),
});
