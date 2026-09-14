import { describe, expect, it } from "vitest";
import {
  createStabilizationConfig,
  createStabilizationState,
  resetStabilizationState,
  stabilizeWorkspacePosition,
} from "./stabilization";
import type { StabilizationConfig, StabilizationState } from "./stabilization";
import type { WorkspacePosition } from "./workspace-mapping";

const config = (alpha = 0.5, deadZone = { x: 0, y: 0, z: 0 }): StabilizationConfig => {
  const result = createStabilizationConfig({ alpha, deadZone });
  if (!result.ok) throw new Error("expected valid stabilization config");
  return result.config;
};

const state = (left: WorkspacePosition | null = null, right: WorkspacePosition | null = null): StabilizationState => ({ left, right });

describe("workspace stabilization", () => {
  it("initializes selected state from the first filtered input", () => {
    const result = stabilizeWorkspacePosition(createStabilizationState(), "left", { x: 0.4, y: 0, z: 0 }, config());
    expect(result).toEqual({ ok: true, position: { x: 0.4, y: 0, z: 0 }, state: { left: { x: 0.4, y: 0, z: 0 }, right: null } });
  });

  it("applies EMA and converges on repeated input", () => {
    const first = stabilizeWorkspacePosition(state({ x: 0, y: 0, z: 0 }), "left", { x: 1, y: 0, z: 0 }, config());
    expect(first.ok && first.position.x).toBe(0.5);
    if (!first.ok) return;
    const second = stabilizeWorkspacePosition(first.state, "left", { x: 1, y: 0, z: 0 }, config());
    expect(second).toMatchObject({ ok: true, position: { x: 0.75, y: 0, z: 0 } });
  });

  it("passes filtered input unchanged when alpha is one", () => {
    expect(stabilizeWorkspacePosition(state({ x: 0.2, y: -0.3, z: 0.4 }), "left", { x: 0.7, y: -0.6, z: 0.1 }, config(1))).toMatchObject({
      ok: true,
      position: { x: 0.7, y: -0.6, z: 0.1 },
    });
  });

  it("uses normal EMA for reversal and return to zero", () => {
    const reversed = stabilizeWorkspacePosition(state({ x: 0.5, y: 0, z: 0 }), "left", { x: -0.5, y: 0, z: 0 }, config());
    expect(reversed).toMatchObject({ ok: true, position: { x: 0, y: 0, z: 0 } });
    const returning = stabilizeWorkspacePosition(state({ x: 0.4, y: 0, z: 0 }), "left", { x: 0, y: 0, z: 0 }, config());
    expect(returning).toMatchObject({ ok: true, position: { x: 0.2, y: 0, z: 0 } });
  });

  it.each([
    ["x", { x: 0.04, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }],
    ["y", { x: 0, y: 0.05, z: 0 }, { x: 0, y: 0, z: 0 }],
    ["z", { x: 0, y: 0, z: -0.05 }, { x: 0, y: 0, z: 0 }],
    ["x", { x: 0.06, y: 0, z: 0 }, { x: 0.06, y: 0, z: 0 }],
    ["y", { x: 0, y: -0.06, z: 0 }, { x: 0, y: -0.06, z: 0 }],
    ["z", { x: 0, y: 0, z: 0.06 }, { x: 0, y: 0, z: 0.06 }],
  ] as const)("applies the %s dead zone independently", (_axis, position, expected) => {
    expect(stabilizeWorkspacePosition(createStabilizationState(), "left", position, config(0.5, { x: 0.05, y: 0.05, z: 0.05 }))).toMatchObject({ ok: true, position: expected });
  });

  it("isolates arm state and preserves unaffected identity", () => {
    const right = { x: -0.4, y: 0, z: 0 };
    const previous = state({ x: 0.8, y: 0, z: 0 }, right);
    const result = stabilizeWorkspacePosition(previous, "left", { x: 0, y: 0, z: 0 }, config());
    expect(result).toMatchObject({ ok: true, position: { x: 0.4, y: 0, z: 0 } });
    if (result.ok) expect(result.state.right).toBe(right);
  });

  it.each([
    0, -0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY,
  ])("rejects invalid alpha %s", (alpha) => {
    expect(createStabilizationConfig({ alpha, deadZone: { x: 0, y: 0, z: 0 } })).toEqual({ ok: false, reason: "alpha-invalid" });
  });

  it.each([
    -0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY,
  ])("rejects invalid dead zone %s", (value) => {
    expect(createStabilizationConfig({ alpha: 0.5, deadZone: { x: value, y: 0, z: 0 } })).toEqual({ ok: false, reason: "dead-zone-invalid" });
  });

  it("rejects non-finite input and preserves state", () => {
    const previous = state({ x: 0.4, y: 0, z: 0 });
    const result = stabilizeWorkspacePosition(previous, "left", { x: Number.NaN, y: 0, z: 0 }, config());
    expect(result).toEqual({ ok: false, reason: "input-invalid", state: previous });
  });

  it("rejects invalid selected state without updating either side", () => {
    const previous = state({ x: 2, y: 0, z: 0 }, { x: 0.3, y: 0, z: 0 });
    expect(stabilizeWorkspacePosition(previous, "left", { x: 0, y: 0, z: 0 }, config())).toEqual({ ok: false, reason: "state-invalid", state: previous });
  });

  it("resets one side and creates an empty session state", () => {
    const right = { x: 0.3, y: 0, z: 0 };
    const previous = state({ x: 0.4, y: 0, z: 0 }, right);
    const reset = resetStabilizationState(previous, "left");
    expect(reset.left).toBeNull();
    expect(reset.right).toBe(right);
    expect(createStabilizationState()).toEqual({ left: null, right: null });
  });

  it("freezes configuration, state, results, and positions", () => {
    const created = createStabilizationConfig({ alpha: 0.5, deadZone: { x: 0, y: 0, z: 0 } });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(Object.isFrozen(created.config)).toBe(true);
    expect(Object.isFrozen(created.config.deadZone)).toBe(true);
    const result = stabilizeWorkspacePosition(createStabilizationState(), "left", { x: 0.1, y: 0, z: 0 }, created.config);
    expect(Object.isFrozen(result)).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.position)).toBe(true);
      expect(Object.isFrozen(result.state)).toBe(true);
    }
  });

  it("is deterministic and does not mutate caller state", () => {
    const previous = state({ x: 0.2, y: 0, z: 0 });
    const position = { x: 0.6, y: 0, z: 0 };
    const first = stabilizeWorkspacePosition(previous, "left", position, config());
    const second = stabilizeWorkspacePosition(previous, "left", position, config());
    expect(second).toEqual(first);
    expect(previous).toEqual({ left: { x: 0.2, y: 0, z: 0 }, right: null });
  });
});
