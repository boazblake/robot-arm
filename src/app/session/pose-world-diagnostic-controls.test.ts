import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("mithril", () => ({ default: { redraw: vi.fn() } }));
import {
  clearPoseWorldDiagnostic,
  diagnosticPoseWorldAngle,
  diagnosticPoseWorldSource,
  freezePoseWorldDiagnostic,
  setDiagnosticPoseWorldAngle,
} from "./store";

const source = Object.freeze([
  ...Array.from({ length: 23 }, (_, index) => ({ x: index, y: index, z: index })),
  { x: -0.2, y: 0, z: 0 },
  { x: 0.2, y: 0, z: 0 },
  ...Array.from({ length: 9 }, (_, index) => ({ x: index, y: index, z: index })),
]);

describe("pose-world diagnostic controls", () => {
  afterEach(() => clearPoseWorldDiagnostic());

  it("freezes once and angle changes retain the same source", () => {
    freezePoseWorldDiagnostic(source);
    const frozen = diagnosticPoseWorldSource();
    setDiagnosticPoseWorldAngle(90);
    expect(diagnosticPoseWorldSource()).toBe(frozen);
    setDiagnosticPoseWorldAngle(180);
    expect(diagnosticPoseWorldSource()).toBe(frozen);
    expect(diagnosticPoseWorldAngle()).toBe(180);
  });

  it("sets absolute angles, including 90, 0, and 360", () => {
    freezePoseWorldDiagnostic(source);
    setDiagnosticPoseWorldAngle(90);
    expect(diagnosticPoseWorldAngle()).toBe(90);
    setDiagnosticPoseWorldAngle(360);
    expect(diagnosticPoseWorldAngle()).toBe(360);
    setDiagnosticPoseWorldAngle(0);
    expect(diagnosticPoseWorldAngle()).toBe(0);
  });

  it("resumes live mode by clearing the frozen source and resetting angle", () => {
    freezePoseWorldDiagnostic(source);
    setDiagnosticPoseWorldAngle(270);
    clearPoseWorldDiagnostic();
    expect(diagnosticPoseWorldSource()).toBeNull();
    expect(diagnosticPoseWorldAngle()).toBe(0);
  });
});
