export type CapEnd = "min" | "max";
export type CapRange = readonly [number, number];
export type CapUpdateResult = Readonly<
  | { readonly ok: true; readonly caps: [number, number] }
  | { readonly ok: false; readonly reason: "invalid-value" | "empty-range" }
>;

export type UpdateCap = (caps: CapRange, calibration: CapRange, end: CapEnd, value: number) => CapUpdateResult;
const updateCap: UpdateCap = (caps, calibration, end, value) => {
  if (!Number.isFinite(value)) return { ok: false, reason: "invalid-value" };
  const bounded = Math.min(calibration[1], Math.max(calibration[0], value));
  const next: [number, number] = end === "min"
    ? [Math.min(bounded, caps[1] - 0.1), caps[1]]
    : [caps[0], Math.max(bounded, caps[0] + 0.1)];
  if (!(calibration[0] <= next[0] && next[0] < next[1] && next[1] <= calibration[1])) return { ok: false, reason: "empty-range" };
  return { ok: true, caps: next };
};

export type CaptureCap = (caps: CapRange, calibration: CapRange, current: number, end: CapEnd) => CapUpdateResult;
const captureCap: CaptureCap = (caps, calibration, current, end) => {
  if (!Number.isFinite(current)) return { ok: false, reason: "invalid-value" };
  if (current < calibration[0] || current > calibration[1]) return { ok: false, reason: "invalid-value" };
  const next: [number, number] = end === "min" ? [current, caps[1]] : [caps[0], current];
  return next[0] < next[1] ? { ok: true, caps: next } : { ok: false, reason: "empty-range" };
};

export { captureCap, updateCap };
