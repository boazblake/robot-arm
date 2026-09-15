import { describe, expect, it } from "vitest";
import { drawTrackingFrame } from "./render-service";

const context = () => {
  const calls: string[] = [];
  const ctx = { canvas: { width: 100, height: 100 }, beginPath: () => calls.push("begin"), arc: () => calls.push("arc"), fill: () => calls.push("fill"), moveTo: () => calls.push("move"), lineTo: () => calls.push("line"), stroke: () => calls.push("stroke") } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
};

describe("tracking landmark rendering", () => {
  it("draws landmarks from a normalized frame", () => {
    const { ctx, calls } = context();
    drawTrackingFrame(ctx, { timestamp: 1, poseLandmarks: [{ x: .5, y: .5, z: 0 }], leftHandLandmarks: [], rightHandLandmarks: [], faceLandmarks: [] }, { pose: true, hands: false, face: false });
    expect(calls).toContain("arc");
    expect(calls).toContain("fill");
  });
});
