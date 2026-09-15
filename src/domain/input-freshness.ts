import type { ArmSide } from "./robot-target";

export type InputFreshness = "fresh" | "stale" | "lost";

export type FreshnessConfig = Readonly<{
  readonly staleInputTimeout: number;
  readonly stopTimeout: number;
}>;

export type FreshnessConfigResult =
  | Readonly<{ readonly ok: true; readonly config: FreshnessConfig }>
  | Readonly<{ readonly ok: false; readonly reason: "timeout-invalid" }>;

export type ArmInputFreshness = Readonly<{
  readonly status: InputFreshness;
  readonly lastValidInputAt: number | null;
}>;

export type InputFreshnessState = Readonly<{
  readonly left: ArmInputFreshness;
  readonly right: ArmInputFreshness;
}>;

export type FreshnessEvent =
  | "tracking-loss-started"
  | "input-became-stale"
  | "input-became-lost"
  | "tracking-recovered"
  | "adapter-stop-requested"
  | "target-suppressed";

export type FreshnessUpdate = Readonly<{
  readonly state: InputFreshnessState;
  readonly side: ArmSide;
  readonly freshness: InputFreshness;
  readonly events: readonly FreshnessEvent[];
}>;

type CreateFreshnessConfig = (
  staleInputTimeout?: number,
  stopTimeout?: number,
) => FreshnessConfigResult;
export const createFreshnessConfig: CreateFreshnessConfig = (
  staleInputTimeout = 250,
  stopTimeout = 1000,
) =>
  Number.isFinite(staleInputTimeout) &&
  Number.isFinite(stopTimeout) &&
  staleInputTimeout > 0 &&
  staleInputTimeout < stopTimeout
    ? Object.freeze({
        ok: true,
        config: Object.freeze({ staleInputTimeout, stopTimeout }),
      })
    : Object.freeze({ ok: false, reason: "timeout-invalid" });

type CreateArmInputFreshness = (status: InputFreshness, lastValidInputAt: number | null) => ArmInputFreshness;
const createArmInputFreshness: CreateArmInputFreshness = (status, lastValidInputAt) =>
  Object.freeze({ status, lastValidInputAt });

type CreateInputFreshnessState = () => InputFreshnessState;
export const createInputFreshnessState: CreateInputFreshnessState = () =>
  Object.freeze({
    left: createArmInputFreshness("lost", null),
    right: createArmInputFreshness("lost", null),
  });

type ReadArmFreshness = (state: InputFreshnessState, side: ArmSide) => ArmInputFreshness;
const readArmFreshness: ReadArmFreshness = (state, side) =>
  side === "left" ? state.left : state.right;

type ReplaceArmFreshness = (
  state: InputFreshnessState,
  side: ArmSide,
  value: ArmInputFreshness,
) => InputFreshnessState;
const replaceArmFreshness: ReplaceArmFreshness = (state, side, value) =>
  Object.freeze(side === "left"
    ? { left: value, right: state.right }
    : { left: state.left, right: value });

type ClassifyAge = (age: number, config: FreshnessConfig) => InputFreshness;
const classifyAge: ClassifyAge = (age, config) =>
  age <= config.staleInputTimeout
    ? "fresh"
    : age <= config.stopTimeout
      ? "stale"
      : "lost";

type UpdateInputFreshness = (
  state: InputFreshnessState,
  side: ArmSide,
  trackingValid: boolean,
  now: number,
  config: FreshnessConfig,
) => FreshnessUpdate;
export const updateInputFreshness: UpdateInputFreshness = (
  state,
  side,
  trackingValid,
  now,
  config,
) => {
  const previous = readArmFreshness(state, side);
  if (trackingValid) {
    const recovered = previous.status !== "fresh" && previous.lastValidInputAt !== null;
    const nextArm = createArmInputFreshness("fresh", now);
    return Object.freeze({
      state: replaceArmFreshness(state, side, nextArm),
      side,
      freshness: "fresh",
      events: recovered ? Object.freeze(["tracking-recovered"] as const) : Object.freeze([]),
    });
  }

  if (previous.lastValidInputAt === null) {
    return Object.freeze({
      state,
      side,
      freshness: previous.status,
      events: Object.freeze([]),
    });
  }

  const age = Math.max(0, now - previous.lastValidInputAt);
  const freshness = classifyAge(age, config);
  const nextArm = createArmInputFreshness(freshness, previous.lastValidInputAt);
  const events: FreshnessEvent[] = [];
  if (previous.status === "fresh" && freshness !== "fresh") events.push("tracking-loss-started", "input-became-stale");
  if (previous.status !== "lost" && freshness === "lost") events.push("input-became-lost", "adapter-stop-requested");
  return Object.freeze({
    state: replaceArmFreshness(state, side, nextArm),
    side,
    freshness,
    events: Object.freeze(events),
  });
};

type TransmissionRejection = "control-disabled" | "input-stale" | "input-lost";
export type { TransmissionRejection };

type RejectStaleInput = (freshness: InputFreshness) => TransmissionRejection | null;
export const rejectStaleInput: RejectStaleInput = (freshness) =>
  freshness === "stale" ? "input-stale" : freshness === "lost" ? "input-lost" : null;
