import { describe, expect, it } from "vitest";
import {
  buildCanonicalHumanScene,
  calibratedDisplacement,
  projectHumanPoint,
  projectTsoding,
  uiTransform,
} from "./canonical-coordinate-pipeline";
import { createWorkspaceMapping } from "../../teleoperation/mapping/workspace-mapping";
import type { Landmark, TrackingFrame } from "./tracking-frame";

const point = (x: number, y: number, z: number): Landmark => ({ x, y, z });
const frame = (offset = 0): TrackingFrame => {
  const pose = Array.from({ length: 25 }, () => point(0.5, 0.5, 0));
  pose[11] = point(0.4, 0.4, 0); pose[12] = point(0.6, 0.4, 0);
  pose[23] = point(0.45, 0.7, 0); pose[24] = point(0.55, 0.7, 0);
  pose[13] = point(0.35, 0.5, 0); pose[15] = point(0.3 + offset, 0.55, 0);
  pose[14] = point(0.65, 0.5, 0); pose[16] = point(0.7, 0.55, 0);
  const hand = (x: number, z = 0): Landmark[] => Array.from({ length: 21 }, (_, index) => point(x + (index === 5 ? 0.02 : index === 17 ? -0.02 : 0), 0.55, z));
  return { timestamp: 1, poseLandmarks: pose, leftHandLandmarks: hand(0.3, -0.01), rightHandLandmarks: hand(0.7, -0.01), faceLandmarks: [point(0.5, 0.25, 0)] };
};

describe("canonical coordinate pipeline", () => {
  it("calibrates neutral to zero without mixing hand and pose z", () => {
    const neutral = buildCanonicalHumanScene(frame()).arms.left?.hand?.palm;
    expect(neutral).not.toBeNull();
    expect(calibratedDisplacement(neutral!, neutral!)).toEqual({ x: 0, y: 0, z: 0 });
    expect(buildCanonicalHumanScene(frame()).arms.left?.hand?.palm.z).toBeCloseTo(0);
  });

  it("keeps hand mesh attached and preserves measured image geometry", () => {
    const arm = buildCanonicalHumanScene(frame()).arms.left!;
    expect(arm.visualHand?.wrist).toEqual(arm.wrist);
    expect(arm.hand?.wrist).toEqual(arm.wrist);
    const wrist = arm.visualHand?.points[0];
    expect(wrist).toBeDefined();
    if (wrist === undefined) return;
    const image = projectHumanPoint(buildCanonicalHumanScene(frame()), wrist, { rotationDegrees: 0, camera: "rear" }, 4);
    expect(image.x).toBeCloseTo(0.3);
    expect(image.y).toBeCloseTo(0.55);
  });

  it.each([0, 60, 90])("uses one Tsoding rotation at %d degrees", (degrees) => {
    const value = uiTransform({ rotationDegrees: degrees, camera: "rear" }, { x: 1, y: 0, z: 0 });
    expect(Math.hypot(value.x, value.z)).toBeCloseTo(1);
    expect(projectTsoding(value, 4)).toBeDefined();
  });

  it("registers canonical rendering back to detector image coordinates", () => {
    const scene = buildCanonicalHumanScene(frame());
    const shoulder = scene.body[11];
    expect(shoulder).toBeDefined();
    if (shoulder === undefined) return;
    const rear = projectHumanPoint(scene, shoulder, { rotationDegrees: 0, camera: "rear" }, 4);
    const front = projectHumanPoint(scene, shoulder, { rotationDegrees: 0, camera: "front" }, 4);
    expect(rear.x).toBeCloseTo(0.4);
    expect(rear.y).toBeCloseTo(0.4);
    expect(front.x).toBeCloseTo(0.6);
    expect(front.y).toBeCloseTo(0.4);
  });

  it("represents front reflection and leaves rear unreflected", () => {
    expect(uiTransform({ rotationDegrees: 0, camera: "front" }, { x: 1, y: 0, z: 0 }).x).toBe(-1);
    expect(uiTransform({ rotationDegrees: 0, camera: "rear" }, { x: 1, y: 0, z: 0 }).x).toBe(1);
  });

  it.each([0, 60, 90])("maps calibrated target direction consistently at %d degrees", (degrees) => {
    const mapping = createWorkspaceMapping({ x: { source: "x", direction: 1, range: 1 }, y: { source: "y", direction: 1, range: 1 }, z: { source: "z", direction: 1, range: 1 } });
    expect(mapping.ok).toBe(true);
    if (!mapping.ok) return;
    const ui = uiTransform({ rotationDegrees: degrees, camera: "front" }, { x: 0, y: 0, z: -1 });
    const target = mapping.mapping.mapDisplacement("left", ui);
    expect(target.ok).toBe(true);
    if (!target.ok) return;
    expect(target.position.x).toBeCloseTo(ui.x);
    expect(target.position.z).toBeCloseTo(ui.z);
  });
});
