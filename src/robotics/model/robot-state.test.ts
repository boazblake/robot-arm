import { describe, expect, it } from "vitest";
import { createRobotState } from "./robot-state";

describe("RobotState", () => {
  it("represents actual observed state with freshness timing", () => {
    const result = createRobotState({ observedAt: 123, arms: { left: null, right: { position: { x: 1, y: 2, z: 3 }, gripper: "open" } } });
    expect(result).toEqual({ ok: true, state: { observedAt: 123, arms: { left: null, right: { position: { x: 1, y: 2, z: 3 }, gripper: "open" } } } });
  });

  it("normalizes optional orientation and preserves absent fields", () => {
    const result = createRobotState({ observedAt: 1, arms: { left: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 2 } }, right: null } });
    expect(result).toEqual({ ok: true, state: { observedAt: 1, arms: { left: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } }, right: null } } });
  });

  it("rejects malformed or stale-unusable timing data", () => {
    expect(createRobotState({ observedAt: -1, arms: { left: null, right: null } })).toEqual({ ok: false, reason: "timestamp-invalid" });
    expect(createRobotState({ observedAt: 1, arms: { left: { position: { x: Infinity, y: 0, z: 0 } }, right: null } })).toEqual({ ok: false, reason: "arms-invalid" });
    expect(createRobotState({ observedAt: 1, arms: { left: null, right: { position: { x: 0, y: 0, z: 0 }, gripper: "half" } } })).toEqual({ ok: false, reason: "arms-invalid" });
  });
});
