import { describe, expect, it } from "vitest";
import {
  createPoseDiagnosticSeries,
  distance3D,
  maxLandmarkError,
  rotatePointAroundCenter,
  type Point3D,
  POSE_CONNECTIONS,
} from "./pose-world-diagnostic";

const center: Point3D = { x: 0.2, y: -0.4, z: 0.7 };
const point: Point3D = { x: 1.2, y: 0.3, z: -0.1 };
const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 10);

const pose = Array.from({ length: 33 }, (_, index) => ({
  x: Math.sin(index) * 0.4,
  y: Math.cos(index) * 0.6,
  z: Math.sin(index * 0.7) * 0.2,
}));
pose[23] = { x: -0.2, y: 0, z: 0 };
pose[24] = { x: 0.2, y: 0, z: 0 };

const invariantEdges = POSE_CONNECTIONS;

describe("pose world diagnostic rotation", () => {
  it("passes zero, full-turn, inverse, and double-half-turn tests", () => {
    const zero = rotatePointAroundCenter("y", 0, point, center);
    near(zero.x, point.x); near(zero.y, point.y); near(zero.z, point.z);
    const fullTurn = rotatePointAroundCenter("y", 360, point, center);
    near(fullTurn.x, point.x); near(fullTurn.y, point.y); near(fullTurn.z, point.z);
    const inverse = rotatePointAroundCenter("y", -90, rotatePointAroundCenter("y", 90, point, center), center);
    near(inverse.x, point.x); near(inverse.y, point.y); near(inverse.z, point.z);
    const halfTurns = rotatePointAroundCenter("y", 180, rotatePointAroundCenter("y", 180, point, center), center);
    near(halfTurns.x, point.x); near(halfTurns.y, point.y); near(halfTurns.z, point.z);
  });

  it("exposes source depth at a 90 degree Y turn", () => {
    const rotated = rotatePointAroundCenter("y", 90, { x: 3, y: 2, z: 5 }, { x: 0, y: 0, z: 0 });
    near(rotated.x, 5); near(rotated.y, 2); near(rotated.z, -3);
  });

  it("preserves every required 3D bone length at every diagnostic angle", () => {
    const series = createPoseDiagnosticSeries(1, pose, { width: 100, height: 100, scale: 100 });
    expect(series.map((snapshot) => snapshot.rotation.degrees)).toEqual([0, 45, 90, 180, 270, 360]);
    expect(series[2].rotation.axis).toBe("Y");
    expect(series[2].boneLengthMeasurements).toHaveLength(12);
    for (const snapshot of series) {
      for (const [a, b] of invariantEdges) {
        near(distance3D(pose[a], pose[b]), distance3D(snapshot.rotatedLandmarks[a], snapshot.rotatedLandmarks[b]));
      }
    }
  });

  it("uses one immutable source for all snapshots and closes the turn", () => {
    const source = pose.map((point) => Object.freeze({ ...point }));
    const series = createPoseDiagnosticSeries(7, source, { width: 100, height: 100, scale: 100 });
    expect(series.map((snapshot) => snapshot.sourceLandmarks).every((value) => value === source)).toBe(true);
    expect(maxLandmarkError(series[0].rotatedLandmarks, series[5].rotatedLandmarks)).toBeLessThan(1e-10);
    expect(source[0]).toEqual(pose[0]);
  });
});
