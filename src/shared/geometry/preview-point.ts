import { rotateIntoPreviewFrame, type Coordinate3D } from "./rotation";

export type PreviewPoint = Coordinate3D;

export type RotatePreviewPoint = (
  point: PreviewPoint,
  rotationDegrees: number,
) => PreviewPoint;

export type RotatePreviewMesh = (
  points: readonly PreviewPoint[],
  rotationDegrees: number,
) => readonly PreviewPoint[];

export const rotatePreviewPoint: RotatePreviewPoint = (point, rotationDegrees) => {
  const cameraDistance = 4;
  const depth = point.z + cameraDistance;
  const cameraPoint = {
    x: (point.x - 0.5) * depth,
    y: (point.y - 0.5) * depth,
    z: point.z,
  };
  const rotated = rotateIntoPreviewFrame(rotationDegrees, cameraPoint);
  const projectedDepth = rotated.z + cameraDistance;
  return Object.freeze({
    x: 0.5 + rotated.x / projectedDepth,
    y: 0.5 + rotated.y / projectedDepth,
    z: rotated.z,
  });
};

export const rotatePreviewMesh: RotatePreviewMesh = (points, rotationDegrees) => {
  if (points.length === 0) return Object.freeze([]);
  const sum = points.reduce(
    (total, point) => ({ x: total.x + point.x, y: total.y + point.y, z: total.z + point.z }),
    { x: 0, y: 0, z: 0 },
  );
  const center = {
    x: sum.x / points.length,
    y: sum.y / points.length,
    z: sum.z / points.length,
  };
  return Object.freeze(points.map((point) => {
    const rotated = rotateIntoPreviewFrame(rotationDegrees, {
      x: point.x - center.x,
      y: point.y - center.y,
      z: point.z - center.z,
    });
    return Object.freeze({
      x: center.x + rotated.x,
      y: center.y + rotated.y,
      z: center.z + rotated.z,
    });
  }));
};
