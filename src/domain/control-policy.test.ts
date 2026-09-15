import { describe, expect, it } from "vitest";
import {
  applyReadiness,
  canTransmitTarget,
  clearEmergencyStop,
  createControlState,
  disableControl,
  emergencyStop,
  enableControl,
} from "./control-policy";

const ready = { trackingValid: true, inputFresh: true, calibrated: true } as const;

const stopped = emergencyStop(createControlState());

describe("control policy", () => {
  it("starts both arms disabled", () => {
    expect(createControlState()).toEqual({ left: "disabled", right: "disabled" });
  });

  it("enables only the requested arm when readiness is valid", () => {
    const result = enableControl(createControlState(), "left", ready);
    expect(result).toMatchObject({ ok: true, state: { left: "enabled", right: "disabled" } });
  });

  it.each([
    ["tracking-invalid", { trackingValid: false, inputFresh: false, calibrated: false }],
    ["input-stale", { trackingValid: true, inputFresh: false, calibrated: false }],
    ["not-calibrated", { trackingValid: true, inputFresh: true, calibrated: false }],
  ] as const)("uses readiness failure precedence: %s", (reason, readiness) => {
    const result = enableControl(createControlState(), "left", readiness);
    expect(result).toMatchObject({ ok: false, reason, state: { left: "disabled" } });
  });

  it("keeps an enabled arm enabled when enablement readiness fails", () => {
    const state = enableControl(createControlState(), "left", ready);
    if (!state.ok) throw new Error("expected enabled state");
    const result = enableControl(state.state, "left", { ...ready, trackingValid: false });
    expect(result).toMatchObject({ ok: false, reason: "tracking-invalid", state: { left: "enabled" } });
  });

  it("does not allow disable to clear stopped", () => {
    expect(disableControl(stopped, "left")).toMatchObject({
      ok: false,
      reason: "emergency-stop-latched",
      state: { left: "stopped", right: "stopped" },
    });
  });

  it("applies readiness loss only to enabled arms", () => {
    const state = { left: "enabled", right: "enabled" } as const;
    const result = applyReadiness(state, "left", { ...ready, inputFresh: false });
    expect(result).toMatchObject({
      ok: true,
      state: { left: "disabled", right: "enabled" },
      transition: { event: "readiness-lost", reason: "input-stale", side: "left" },
    });
  });

  it("does not automatically enable on readiness recovery", () => {
    expect(applyReadiness(createControlState(), "left", ready)).toMatchObject({
      ok: true,
      state: { left: "disabled", right: "disabled" },
    });
  });

  it("clears emergency stop globally without readiness", () => {
    const result = clearEmergencyStop(stopped);
    expect(result).toMatchObject({
      ok: true,
      state: { left: "disabled", right: "disabled" },
      transition: { event: "emergency-stop-cleared" },
    });
  });

  it("only permits transmission for enabled target sides", () => {
    const state = { left: "disabled", right: "enabled" } as const;
    expect(canTransmitTarget(state, "left")).toBe(false);
    expect(canTransmitTarget(state, "right")).toBe(true);
  });

  it("freezes states and transitions", () => {
    const result = enableControl(createControlState(), "left", ready);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.state)).toBe(true);
    expect(result.ok && Object.isFrozen(result.transition)).toBe(true);
    expect(result.ok && Object.isFrozen(result.transition?.previous)).toBe(true);
  });

  it("is structurally deterministic without mutating input", () => {
    const input = { left: "disabled", right: "enabled" } as const;
    const first = enableControl(input, "left", ready);
    const second = enableControl(input, "left", ready);
    expect(first).toEqual(second);
    expect(input).toEqual({ left: "disabled", right: "enabled" });
  });
});
