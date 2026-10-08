import { describe, expect, it } from "vitest";
import { captureCap, updateCap } from "./so101-manual-control-policy";

describe("SO-101 cap policy", () => {
  const calibration = [-180, 180] as const;

  it("captures a low and high endpoint without mutating the current caps", () => {
    const caps = [-90, 90] as const;
    expect(captureCap(caps, -40, "min")).toEqual({ ok: true, caps: [-40, 90] });
    expect(captureCap(caps, 40, "max")).toEqual({ ok: true, caps: [-90, 40] });
    expect(caps).toEqual([-90, 90]);
  });

  it("rejects a capture that would invert the active range", () => {
    expect(captureCap([-90, 90], 90, "min")).toEqual({ ok: false, reason: "empty-range" });
    expect(captureCap([-90, 90], -90, "max")).toEqual({ ok: false, reason: "empty-range" });
  });

  it("clamps slider cap edits to calibration and keeps a non-empty range", () => {
    expect(updateCap([-90, 90], calibration, "min", -240)).toEqual({ ok: true, caps: [-180, 90] });
    expect(updateCap([-90, 90], calibration, "max", 240)).toEqual({ ok: true, caps: [-90, 180] });
    expect(updateCap([-90, 90], calibration, "min", 90)).toEqual({ ok: true, caps: [89.9, 90] });
  });

  it("rejects non-numeric cap input", () => {
    expect(updateCap([-90, 90], calibration, "min", Number.NaN)).toEqual({ ok: false, reason: "invalid-value" });
  });
});
