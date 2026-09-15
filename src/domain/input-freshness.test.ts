import { describe, expect, it } from "vitest";
import {
  createFreshnessConfig,
  createInputFreshnessState,
  rejectStaleInput,
  updateInputFreshness,
} from "./input-freshness";

const config = () => {
  const result = createFreshnessConfig();
  if (!result.ok) throw new Error("expected valid config");
  return result.config;
};

describe("input freshness", () => {
  it("uses the configured inclusive boundaries", () => {
    const state = updateInputFreshness(createInputFreshnessState(), "left", true, 1000, config()).state;
    expect(updateInputFreshness(state, "left", false, 1250, config()).freshness).toBe("fresh");
    expect(updateInputFreshness(state, "left", false, 1251, config()).freshness).toBe("stale");
    expect(updateInputFreshness(state, "left", false, 2000, config()).freshness).toBe("stale");
    expect(updateInputFreshness(state, "left", false, 2001, config()).freshness).toBe("lost");
  });

  it("tracks arms independently", () => {
    let state = createInputFreshnessState();
    state = updateInputFreshness(state, "left", true, 1000, config()).state;
    state = updateInputFreshness(state, "right", true, 1200, config()).state;
    const result = updateInputFreshness(state, "left", false, 1300, config());
    expect(result.freshness).toBe("stale");
    expect(result.state.right.status).toBe("fresh");
  });

  it("emits recovery only after an observed loss", () => {
    let state = updateInputFreshness(createInputFreshnessState(), "left", true, 1000, config()).state;
    state = updateInputFreshness(state, "left", false, 1301, config()).state;
    const result = updateInputFreshness(state, "left", true, 1400, config());
    expect(result.events).toEqual(["tracking-recovered"]);
  });

  it("rejects invalid timeout relationships", () => {
    expect(createFreshnessConfig(0, 1000)).toEqual({ ok: false, reason: "timeout-invalid" });
    expect(createFreshnessConfig(1000, 1000)).toEqual({ ok: false, reason: "timeout-invalid" });
    expect(createFreshnessConfig(1001, 1000)).toEqual({ ok: false, reason: "timeout-invalid" });
  });

  it("maps freshness to typed transmission rejection", () => {
    expect(rejectStaleInput("fresh")).toBeNull();
    expect(rejectStaleInput("stale")).toBe("input-stale");
    expect(rejectStaleInput("lost")).toBe("input-lost");
  });
});
