import { describe, expect, it } from "vitest";
import { rotateAroundYAxis, rotateIntoPreviewFrame } from "./rotation";

describe("rotateAroundYAxis", () => {
  it("rotates x into z without changing y", () => {
    const rotated = rotateAroundYAxis(Math.PI / 2, { x: 1, y: 2, z: 0 });
    expect(rotated.x).toBeCloseTo(0, 10);
    expect(rotated.y).toBe(2);
    expect(rotated.z).toBeCloseTo(1, 10);
  });

  it("preserves the distance from the rotation axis", () => {
    const point = { x: 0.3, y: -2, z: 0.7 };
    const rotated = rotateAroundYAxis(0.8, point);
    expect(Math.hypot(rotated.x, rotated.z)).toBeCloseTo(Math.hypot(point.x, point.z), 10);
  });
});

describe("rotateIntoPreviewFrame", () => {
  it("uses the same camera-to-UI orientation for control vectors", () => {
    const rotated = rotateIntoPreviewFrame(90, { x: 0, y: 0, z: 1 });
    expect(rotated.x).toBeCloseTo(1, 10);
    expect(rotated.y).toBe(0);
    expect(rotated.z).toBeCloseTo(0, 10);
  });
});
