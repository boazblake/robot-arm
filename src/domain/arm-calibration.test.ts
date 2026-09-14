import { describe, expect, it } from "vitest";
import {
  calibrateArm,
  calculateArmDisplacement,
  resetCalibration,
  setCalibration,
  type CalibrationState,
} from "./arm-calibration";
import type { HumanArm, HumanArmPose } from "./human-arm-pose";

const arm = (offset: number): HumanArm => ({
  shoulder: { x: offset, y: offset + 1, z: offset + 2 },
  elbow: { x: offset + 3, y: offset + 4, z: offset + 5 },
  wrist: { x: offset + 6, y: offset + 7, z: offset + 8 },
  handAnchor: { x: offset + 9, y: offset + 10, z: offset + 11 },
});

const pose = (left: HumanArm | null, right: HumanArm | null): HumanArmPose => ({
  timestamp: 1234,
  left,
  right,
});

const emptyState: CalibrationState = { left: null, right: null };

describe("arm calibration", () => {
  it.each([
    ["left", arm(1), null],
    ["right", null, arm(2)],
  ] as const)("calibrates a usable %s arm independently", (side, left, right) => {
    const result = calibrateArm(pose(left, right), side, false);
    expect(result).toEqual({
      ok: true,
      calibration: { side, timestamp: 1234, reference: side === "left" ? left : right },
    });
  });

  it("rejects an unavailable requested arm", () => {
    expect(calibrateArm(pose(null, arm(1)), "left", false)).toEqual({
      ok: false,
      reason: "arm-unavailable",
    });
  });

  it("rejects calibration and reset while control is active", () => {
    expect(calibrateArm(pose(arm(1), null), "left", true)).toEqual({
      ok: false,
      reason: "control-active",
    });
    expect(resetCalibration(emptyState, "left", true)).toEqual({
      ok: false,
      reason: "control-active",
    });
  });

  it("snapshots the reference arm", () => {
    const source = arm(1);
    const result = calibrateArm(pose(source, null), "left", false);
    expect(result.ok && result.calibration.reference).not.toBe(source);
    expect(result.ok && Object.isFrozen(result.calibration.reference)).toBe(true);
    expect(result.ok && Object.isFrozen(result.calibration.reference.handAnchor)).toBe(true);
  });

  it("replaces only the selected side", () => {
    const firstLeft = calibrateArm(pose(arm(1), arm(2)), "left", false);
    const right = calibrateArm(pose(arm(1), arm(2)), "right", false);
    const state = setCalibration(setCalibration(emptyState, firstLeft), right);
    const secondLeft = calibrateArm(pose(arm(3), arm(4)), "left", false);
    const replaced = setCalibration(state, secondLeft);
    expect(replaced.left?.reference.handAnchor.x).toBe(12);
    expect(replaced.right).toBe(state.right);
  });

  it("resets only the selected side", () => {
    const left = calibrateArm(pose(arm(1), null), "left", false);
    const state = setCalibration(emptyState, left);
    const result = resetCalibration(state, "left", false);
    expect(result).toEqual({ ok: true, state: { left: null, right: null } });
  });

  it("calculates hand-anchor translation in the source coordinates", () => {
    const calibration = calibrateArm(pose(arm(1), null), "left", false);
    if (!calibration.ok) throw new Error("expected calibration");
    expect(calculateArmDisplacement(calibration.calibration, arm(4))).toEqual({
      available: true,
      displacement: { x: 3, y: 3, z: 3 },
    });
    expect(calculateArmDisplacement(calibration.calibration, arm(1))).toEqual({
      available: true,
      displacement: { x: 0, y: 0, z: 0 },
    });
  });

  it("distinguishes uncalibrated and unavailable displacement", () => {
    expect(calculateArmDisplacement(null, arm(1))).toEqual({
      available: false,
      reason: "not-calibrated",
    });
    const calibration = calibrateArm(pose(arm(1), null), "left", false);
    if (!calibration.ok) throw new Error("expected calibration");
    expect(calculateArmDisplacement(calibration.calibration, null)).toEqual({
      available: false,
      reason: "arm-unavailable",
    });
  });
});
