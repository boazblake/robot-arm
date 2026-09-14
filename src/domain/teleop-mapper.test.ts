import { describe, expect, it, vi } from "vitest";
import { calibrateArm, type ArmCalibration } from "./arm-calibration";
import type { HumanArm, HumanArmPose } from "./human-arm-pose";
import { mapTeleopInput, type TeleopMappingInput } from "./teleop-mapper";
import type {
  WorkspaceMapping,
  WorkspaceMappingResult,
} from "./workspace-mapping";

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

const validWorkspace = (position = { x: 10, y: 20, z: 30 }): WorkspaceMapping => ({
  mapDisplacement: vi.fn((): WorkspaceMappingResult => ({ ok: true, position })),
});

const calibrationFor = (source: HumanArmPose, side: "left" | "right"): ArmCalibration => {
  const result = calibrateArm(source, side, false);
  if (!result.ok) throw new Error("expected calibration");
  return result.calibration;
};

const input = (
  overrides: Partial<TeleopMappingInput> = {},
): TeleopMappingInput => {
  const source = pose(arm(1), arm(10));
  return {
    side: "left",
    pose: source,
    calibration: calibrationFor(source, "left"),
    validity: { valid: true },
    workspace: validWorkspace(),
    sequence: 7,
    ...overrides,
  };
};

describe("TeleopMapper", () => {
  it.each(["left", "right"] as const)("maps one %s arm through calibrated displacement", (side) => {
    const source = pose(arm(1), arm(10));
    const workspace = validWorkspace();
    const result = mapTeleopInput(input({
      side,
      pose: source,
      calibration: calibrationFor(source, side),
      workspace,
    }));

    expect(result).toEqual({
      ok: true,
      target: {
        side,
        position: { x: 10, y: 20, z: 30 },
        sourceTimestamp: 1234,
        sequence: 7,
      },
    });
    expect(workspace.mapDisplacement).toHaveBeenCalledWith(side, {
      x: 0,
      y: 0,
      z: 0,
    });
  });

  it("maps non-zero calibrated displacement to absolute workspace position", () => {
    const calibrationPose = pose(arm(1), null);
    const currentPose = pose(arm(4), null);
    const workspace = validWorkspace({ x: 0.4, y: 0.5, z: 0.6 });
    const result = mapTeleopInput(input({
      pose: currentPose,
      calibration: calibrationFor(calibrationPose, "left"),
      workspace,
    }));

    expect(result).toMatchObject({
      ok: true,
      target: { position: { x: 0.4, y: 0.5, z: 0.6 } },
    });
    expect(workspace.mapDisplacement).toHaveBeenCalledWith("left", {
      x: 3,
      y: 3,
      z: 3,
    });
  });

  it.each([
    ["arm-unavailable", input({ pose: pose(null, arm(10)) })],
    ["tracking-invalid", input({ validity: { valid: false, reason: "confidence-invalid" } })],
    ["not-calibrated", input({ calibration: null })],
    ["not-calibrated", input({ calibration: { ...input().calibration!, side: "right" } })],
  ] as const)("rejects input with reason %s", (reason, mappingInput) => {
    expect(mapTeleopInput(mappingInput)).toEqual({ ok: false, reason });
  });

  it("prioritizes unavailable arm over invalid tracking and missing calibration", () => {
    expect(
      mapTeleopInput(input({
        pose: pose(null, arm(10)),
        validity: { valid: false, reason: "confidence-invalid" },
        calibration: null,
      })),
    ).toEqual({ ok: false, reason: "arm-unavailable" });
  });

  it("prioritizes invalid tracking over missing calibration", () => {
    expect(
      mapTeleopInput(input({
        validity: { valid: false, reason: "confidence-invalid" },
        calibration: null,
      })),
    ).toEqual({ ok: false, reason: "tracking-invalid" });
  });

  it("preserves pose timestamp and supplied sequence without orientation or gripper", () => {
    const result = mapTeleopInput(input({ sequence: 42 }));
    expect(result).toMatchObject({
      ok: true,
      target: { sourceTimestamp: 1234, sequence: 42 },
    });
    if (result.ok) {
      expect("orientation" in result.target).toBe(false);
      expect("gripper" in result.target).toBe(false);
    }
  });

  it("rejects non-finite calculated displacement", () => {
    const source = pose(arm(1), null);
    const calibration = calibrationFor(source, "left");
    const invalidCalibration: ArmCalibration = {
      ...calibration,
      reference: {
        ...calibration.reference,
        handAnchor: { x: Number.NaN, y: 0, z: 0 },
      },
    };

    expect(
      mapTeleopInput(input({
        pose: source,
        calibration: invalidCalibration,
      })),
    ).toEqual({ ok: false, reason: "mapping-invalid" });
  });

  it("rejects invalid workspace results and non-finite workspace output", () => {
    expect(
      mapTeleopInput(input({
        workspace: { mapDisplacement: () => ({ ok: false, reason: "workspace-invalid" }) },
      })),
    ).toEqual({ ok: false, reason: "workspace-invalid" });
    expect(
      mapTeleopInput(input({
        workspace: validWorkspace({ x: Number.NaN, y: 0, z: 0 }),
      })),
    ).toEqual({ ok: false, reason: "mapping-invalid" });
  });
});
