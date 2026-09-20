import { describe, expect, it } from "vitest";
import { createRobotState } from "./robot-state";

const validStateInput = (overrides: Record<string, unknown> = {}) => ({
  observedAt: 123,
  arms: {
    left: null,
    right: { position: { x: 2, y: 3, z: 4 } },
  },
  ...overrides,
});

describe("RobotState", () => {
  it("represents observed state without copying requested intent", () => {
    const result = createRobotState(validStateInput());
    expect(result).toEqual({
      ok: true,
      state: {
        observedAt: 123,
        arms: { left: null, right: { position: { x: 2, y: 3, z: 4 } } },
      },
    });
  });

  it("preserves finite observed Cartesian values without workspace bounds", () => {
    const result = createRobotState(
      validStateInput({
        arms: { left: { position: { x: -100, y: 2.5, z: 100 } }, right: null },
      }),
    );
    expect(result).toEqual({
      ok: true,
      state: {
        observedAt: 123,
        arms: { left: { position: { x: -100, y: 2.5, z: 100 } }, right: null },
      },
    });
  });

  it("normalizes optional orientation and preserves absent fields", () => {
    const result = createRobotState(
      validStateInput({
        arms: {
          left: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 2 } },
          right: null,
        },
      }),
    );
    expect(result).toEqual({
      ok: true,
      state: {
        observedAt: 123,
        arms: {
          left: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
          right: null,
        },
      },
    });
    if (result.ok) expect(result.state.arms.right).toBeNull();
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("rejects non-finite timestamps: %s", (_label, observedAt) => {
    expect(createRobotState(validStateInput({ observedAt }))).toEqual({
      ok: false,
      reason: "timestamp-invalid",
    });
  });

  it.each([
    ["x", { x: Number.NaN, y: 0, z: 0 }],
    ["y", { x: 0, y: Number.POSITIVE_INFINITY, z: 0 }],
    ["z", { x: 0, y: 0, z: Number.NEGATIVE_INFINITY }],
  ])("rejects non-finite position component: %s", (_axis, position) => {
    expect(
      createRobotState(validStateInput({ arms: { left: { position }, right: null } })),
    ).toEqual({ ok: false, reason: "position-invalid" });
  });

  it("rejects missing arms and malformed positions", () => {
    expect(createRobotState({ observedAt: 1 })).toEqual({ ok: false, reason: "arms-invalid" });
    expect(
      createRobotState(validStateInput({ arms: { left: { position: {} }, right: null } })),
    ).toEqual({ ok: false, reason: "position-invalid" });
  });

  it("rejects malformed and zero orientations", () => {
    expect(
      createRobotState(validStateInput({ arms: { left: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 0 } }, right: null } })),
    ).toEqual({ ok: false, reason: "orientation-invalid" });
    expect(
      createRobotState(validStateInput({ arms: { left: { position: { x: 0, y: 0, z: 0 }, orientation: { x: Number.NaN, y: 0, z: 0, w: 1 } }, right: null } })),
    ).toEqual({ ok: false, reason: "orientation-invalid" });
  });

  it("preserves left and right absence independently", () => {
    const result = createRobotState(
      validStateInput({ arms: { left: null, right: null } }),
    );
    expect(result).toEqual({
      ok: true,
      state: { observedAt: 123, arms: { left: null, right: null } },
    });
  });

  it("deeply freezes state and nested values", () => {
    const result = createRobotState(validStateInput({
      arms: { left: { position: { x: 1, y: 2, z: 3 } }, right: null },
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.isFrozen(result.state)).toBe(true);
    expect(Object.isFrozen(result.state.arms)).toBe(true);
    expect(Object.isFrozen(result.state.arms.left)).toBe(true);
    expect(Object.isFrozen(result.state.arms.left?.position)).toBe(true);
  });

  it("round trips without inventing optional fields", () => {
    const result = createRobotState(validStateInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const roundTrip = JSON.parse(JSON.stringify(result.state)) as typeof result.state;
    expect(roundTrip).toEqual(result.state);
    expect("orientation" in (roundTrip.arms.right ?? {})).toBe(false);
  });
});
