import { describe, expect, it, vi } from "vitest";
import { calibrateArm, type ArmCalibration } from "./arm-calibration";
import type { HumanArm, HumanArmPose } from "./human-arm-pose";
import { mapTeleopPosition, type TeleopPositionInput } from "./teleop-mapper";
import type { WorkspaceMapping, WorkspaceMappingResult } from "./workspace-mapping";

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

const validWorkspace = (position = { x: 0.4, y: 0.5, z: 0.6 }): WorkspaceMapping => ({
  config: {
    x: { source: "x", direction: 1, range: 1 },
    y: { source: "y", direction: 1, range: 1 },
    z: { source: "z", direction: 1, range: 1 },
  },
  mapDisplacement: vi.fn((): WorkspaceMappingResult => ({ ok: true, position })),
});

const calibrationFor = (source: HumanArmPose, side: "left" | "right"): ArmCalibration => {
  const result = calibrateArm(source, side, false);
  if (!result.ok) throw new Error("expected calibration");
  return result.calibration;
};

const input = (overrides: Partial<TeleopPositionInput> = {}): TeleopPositionInput => {
  const source = pose(arm(1), arm(10));
  return {
    side: "left",
    pose: source,
    calibration: calibrationFor(source, "left"),
    validity: { valid: true },
    workspace: validWorkspace(),
    ...overrides,
  };
};

describe("TeleopMapper", () => {
  it.each(["left", "right"] as const)("maps one %s arm to WorkspacePosition", (side) => {
    const source = pose(arm(1), arm(10));
    const workspace = validWorkspace();
    const result = mapTeleopPosition(input({
      side,
      pose: source,
      calibration: calibrationFor(source, side),
      workspace,
    }));

    expect(result).toEqual({ ok: true, position: { x: 0.4, y: 0.5, z: 0.6 } });
    expect(workspace.mapDisplacement).toHaveBeenCalledWith(side, { x: 0, y: 0, z: 0 });
  });

  it("maps non-zero calibrated displacement through WorkspaceMapping", () => {
    const calibrationPose = pose(arm(1), null);
    const currentPose = pose(arm(4), null);
    const workspace = validWorkspace();
    const result = mapTeleopPosition(input({
      pose: currentPose,
      calibration: calibrationFor(calibrationPose, "left"),
      workspace,
    }));

    expect(result).toEqual({ ok: true, position: { x: 0.4, y: 0.5, z: 0.6 } });
    expect(workspace.mapDisplacement).toHaveBeenCalledWith("left", { x: 3, y: 3, z: 3 });
  });

  it.each([
    ["arm-unavailable", input({ pose: pose(null, arm(10)) })],
    ["tracking-invalid", input({ validity: { valid: false, reason: "confidence-invalid" } })],
    ["not-calibrated", input({ calibration: null })],
    ["not-calibrated", input({ calibration: { ...input().calibration!, side: "right" } })],
  ] as const)("rejects input with reason %s", (reason, mappingInput) => {
    expect(mapTeleopPosition(mappingInput)).toEqual({ ok: false, reason });
  });

  it("applies failure precedence", () => {
    expect(mapTeleopPosition(input({
      pose: pose(null, arm(10)),
      validity: { valid: false, reason: "confidence-invalid" },
      calibration: null,
    }))).toEqual({ ok: false, reason: "arm-unavailable" });
    expect(mapTeleopPosition(input({
      validity: { valid: false, reason: "confidence-invalid" },
      calibration: null,
    }))).toEqual({ ok: false, reason: "tracking-invalid" });
  });

  it("rejects non-finite displacement and workspace output", () => {
    const source = pose(arm(1), null);
    const calibration = calibrationFor(source, "left");
    const invalidCalibration: ArmCalibration = {
      ...calibration,
      reference: { ...calibration.reference, handAnchor: { x: Number.NaN, y: 0, z: 0 } },
    };
    expect(mapTeleopPosition(input({ pose: source, calibration: invalidCalibration }))).toEqual({
      ok: false,
      reason: "mapping-invalid",
    });
    expect(mapTeleopPosition(input({ workspace: validWorkspace({ x: Number.NaN, y: 0, z: 0 }) }))).toEqual({
      ok: false,
      reason: "mapping-invalid",
    });
  });
});
