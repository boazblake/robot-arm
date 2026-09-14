import { describe, expect, it } from "vitest";
import {
  createWorkspaceMapping,
  type WorkspaceMappingConfigInput,
} from "./workspace-mapping";
import type { ArmDisplacement } from "./arm-calibration";

const config = (
  overrides: Partial<WorkspaceMappingConfigInput> = {},
): WorkspaceMappingConfigInput => ({
  x: { source: "x", direction: 1, range: 0.4 },
  y: { source: "y", direction: 1, range: 0.2 },
  z: { source: "z", direction: 1, range: 0.5 },
  ...overrides,
});

const mapping = (input: WorkspaceMappingConfigInput = config()) => {
  const result = createWorkspaceMapping(input);
  if (!result.ok) throw new Error("expected valid workspace mapping");
  return result.mapping;
};

describe("WorkspaceMapping", () => {
  it("maps zero displacement to the workspace center", () => {
    expect(mapping().mapDisplacement("left", { x: 0, y: 0, z: 0 })).toEqual({
      ok: true,
      position: { x: 0, y: 0, z: 0 },
    });
  });

  it("maps configured axes, swaps, and directions", () => {
    const result = mapping({
      x: { source: "x", direction: 1, range: 0.4 },
      y: { source: "z", direction: -1, range: 0.2 },
      z: { source: "y", direction: 1, range: 0.5 },
    }).mapDisplacement("left", { x: 0.2, y: 0.25, z: 0.1 });
    expect(result).toEqual({
      ok: true,
      position: { x: 0.5, y: -0.5, z: 0.5 },
    });
  });

  it.each([
    [0.4, 0.2, 0.5, { x: 1, y: 1, z: 1 }],
    [-0.4, -0.2, -0.5, { x: -1, y: -1, z: -1 }],
  ] as const)("preserves exact %s boundary displacement", (x, y, z, position) => {
    expect(mapping().mapDisplacement("left", { x, y, z })).toEqual({
      ok: true,
      position,
    });
  });

  it("maps negative values and clamps both bounds", () => {
    const result = mapping().mapDisplacement("left", {
      x: 0.8,
      y: -0.8,
      z: 0.25,
    });
    expect(result).toEqual({
      ok: true,
      position: { x: 1, y: -1, z: 0.5 },
    });
  });

  it("uses the same transform for both arms without mirroring", () => {
    const workspace = mapping();
    const displacement = { x: 0.1, y: -0.1, z: 0.2 };
    expect(workspace.mapDisplacement("left", displacement)).toEqual(
      workspace.mapDisplacement("right", displacement),
    );
  });

  it.each([
    ["x", 0],
    ["y", -1],
    ["z", Number.NaN],
    ["x", Number.POSITIVE_INFINITY],
  ] as const)("rejects invalid range %s=%s", (axis, range) => {
    expect(
      createWorkspaceMapping(config({ [axis]: { source: axis, direction: 1, range } })),
    ).toEqual({ ok: false, reason: "range-invalid" });
  });

  it("rejects invalid source axes and directions", () => {
    expect(
      createWorkspaceMapping(config({ x: { source: "q", direction: 1, range: 1 } })),
    ).toEqual({ ok: false, reason: "source-axis-invalid" });
    expect(
      createWorkspaceMapping(config({ x: { source: "x", direction: 0, range: 1 } })),
    ).toEqual({ ok: false, reason: "direction-invalid" });
  });

  it("rejects duplicate source axes", () => {
    expect(
      createWorkspaceMapping(config({
        y: { source: "x", direction: 1, range: 1 },
      })),
    ).toEqual({ ok: false, reason: "duplicate-source-axis" });
  });

  it.each([
    { x: Number.NaN, y: 0, z: 0 },
    { x: 0, y: Number.POSITIVE_INFINITY, z: 0 },
    { x: 0, y: 0, z: Number.NEGATIVE_INFINITY },
  ] as const)("rejects non-finite displacement", (displacement: ArmDisplacement) => {
    expect(mapping().mapDisplacement("left", displacement)).toEqual({
      ok: false,
      reason: "workspace-invalid",
    });
  });

  it("deeply freezes configuration, mapping, result, and position", () => {
    const result = createWorkspaceMapping(config());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.isFrozen(result.mapping)).toBe(true);
    expect(Object.isFrozen(result.mapping.config)).toBe(true);
    expect(Object.isFrozen(result.mapping.config.x)).toBe(true);

    const mapped = result.mapping.mapDisplacement("left", { x: 0, y: 0, z: 0 });
    expect(Object.isFrozen(mapped)).toBe(true);
    if (mapped.ok) expect(Object.isFrozen(mapped.position)).toBe(true);
  });

  it("returns exactly the same result for repeated identical calls", () => {
    const workspace = mapping();
    const displacement = { x: 0.1, y: 0.05, z: -0.25 };
    const first = workspace.mapDisplacement("left", displacement);
    const second = workspace.mapDisplacement("left", displacement);
    expect(second).toEqual(first);
  });
});
