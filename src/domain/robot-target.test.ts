import { describe, expect, it } from "vitest";
import { createRobotTarget, type RobotTargetInput } from "./robot-target";

const input = (overrides: Partial<RobotTargetInput> = {}): RobotTargetInput => ({
  side: "left",
  position: { x: 1, y: 2, z: 3 },
  sourceTimestamp: 1700000000000,
  sequence: 4,
  ...overrides,
});

describe("RobotTarget", () => {
  it.each(["left", "right"] as const)("creates a valid %s position-only target", (side) => {
    const result = createRobotTarget(input({ side }));
    expect(result).toEqual({
      ok: true,
      target: {
        side,
        position: { x: 1, y: 2, z: 3 },
        sourceTimestamp: 1700000000000,
        sequence: 4,
      },
    });
  });

  it("supports optional quaternion orientation and semantic gripper intent", () => {
    const result = createRobotTarget(
      input({ orientation: { x: 0, y: 0, z: 0, w: 2 }, gripper: "open" }),
    );
    expect(result).toEqual({
      ok: true,
      target: {
        side: "left",
        position: { x: 1, y: 2, z: 3 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        gripper: "open",
        sourceTimestamp: 1700000000000,
        sequence: 4,
      },
    });
    expect(createRobotTarget(input({ gripper: "close" }))).toMatchObject({
      ok: true,
      target: { gripper: "close" },
    });
  });

  it.each([
    ["position", { position: { x: Number.NaN, y: 0, z: 0 } }, "position-invalid"],
    ["missing position", { position: undefined }, "position-invalid"],
    ["orientation", { orientation: { x: 0, y: 0, z: 0, w: 0 } }, "orientation-invalid"],
    ["timestamp", { sourceTimestamp: -1 }, "timestamp-invalid"],
    ["sequence", { sequence: -1 }, "sequence-invalid"],
    ["non-integer sequence", { sequence: 1.5 }, "sequence-invalid"],
    ["gripper", { gripper: "hold" }, "gripper-invalid"],
  ] as const)("rejects invalid %s", (_name, overrides, reason) => {
    expect(createRobotTarget(input(overrides))).toEqual({ ok: false, reason });
  });

  it("rejects non-finite quaternion components", () => {
    expect(
      createRobotTarget(input({ orientation: { x: Infinity, y: 0, z: 0, w: 1 } })),
    ).toEqual({ ok: false, reason: "orientation-invalid" });
  });

  it("deeply freezes the target and nested values", () => {
    const result = createRobotTarget(input({ orientation: { x: 0, y: 0, z: 0, w: 1 } }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.isFrozen(result.target)).toBe(true);
    expect(Object.isFrozen(result.target.position)).toBe(true);
    expect(Object.isFrozen(result.target.orientation)).toBe(true);
  });

  it("survives a JSON round trip", () => {
    const result = createRobotTarget(input({ orientation: { x: 0, y: 0, z: 0, w: 2 } }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(JSON.stringify(result.target))).toEqual(result.target);
  });
});
