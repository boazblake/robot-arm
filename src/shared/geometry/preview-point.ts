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
  const cameraDistance = 4;
  const worldPoints = points.map((point) => {
    const depth = point.z + cameraDistance;
    return {
      x: (point.x - 0.5) * depth,
      y: (point.y - 0.5) * depth,
      z: point.z,
    };
  });
  const sum = worldPoints.reduce(
    (total, point) => ({ x: total.x + point.x, y: total.y + point.y, z: total.z + point.z }),
    { x: 0, y: 0, z: 0 },
  );
  const center = {
    x: sum.x / worldPoints.length,
    y: sum.y / worldPoints.length,
    z: sum.z / worldPoints.length,
  };
  return Object.freeze(worldPoints.map((point) => {
    const rotated = rotateIntoPreviewFrame(rotationDegrees, {
      x: point.x - center.x,
      y: point.y - center.y,
      z: point.z - center.z,
    });
    const depth = center.z + rotated.z + cameraDistance;
    return Object.freeze({
      x: 0.5 + (center.x + rotated.x) / depth,
      y: 0.5 + (center.y + rotated.y) / depth,
      z: center.z + rotated.z,
    });
  }));
};
