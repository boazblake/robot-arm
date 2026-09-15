import type { ArmSide } from "./robot-target";

export type { ArmSide };

export type ControlMode = "disabled" | "enabled" | "stopped";

export type ControlState = Readonly<{
  readonly left: ControlMode;
  readonly right: ControlMode;
}>;

export type ControlReadiness = Readonly<{
  readonly trackingValid: boolean;
  readonly inputFresh: boolean;
  readonly calibrated: boolean;
}>;

export type ControlTransitionEvent =
  | "enable"
  | "disable"
  | "readiness-lost"
  | "emergency-stop-cleared";

export type ControlTransition = Readonly<{
  readonly previous: ControlState;
  readonly next: ControlState;
  readonly event: ControlTransitionEvent | "emergency-stop";
  readonly side?: ArmSide;
  readonly reason?: ControlFailureReason;
}>;

export type ControlFailureReason =
  | "tracking-invalid"
  | "input-stale"
  | "not-calibrated"
  | "emergency-stop-latched";

export type ControlTransitionResult =
  | Readonly<{
      readonly ok: true;
      readonly state: ControlState;
      readonly transition?: ControlTransition;
    }>
  | Readonly<{
      readonly ok: false;
      readonly state: ControlState;
      readonly reason: ControlFailureReason;
      readonly transition?: ControlTransition;
    }>;

type ReadSideMode = (state: ControlState, side: ArmSide) => ControlMode;
const readSideMode: ReadSideMode = (state, side) =>
  side === "left" ? state.left : state.right;

type ReplaceSideMode = (
  state: ControlState,
  side: ArmSide,
  mode: ControlMode,
) => ControlState;
const replaceSideMode: ReplaceSideMode = (state, side, mode) =>
  Object.freeze(
    side === "left"
      ? { left: mode, right: state.right }
      : { left: state.left, right: mode },
  );

type FreezeState = (state: ControlState) => ControlState;
const freezeState: FreezeState = (state) =>
  Object.freeze({ left: state.left, right: state.right });

type ReadinessFailure = (readiness: ControlReadiness) => ControlFailureReason | null;
const readinessFailure: ReadinessFailure = (readiness) => {
  if (!readiness.trackingValid) return "tracking-invalid";
  if (!readiness.inputFresh) return "input-stale";
  if (!readiness.calibrated) return "not-calibrated";
  return null;
};

type CreateTransition = (
  previous: ControlState,
  next: ControlState,
  event: ControlTransition["event"],
  side?: ArmSide,
  reason?: ControlFailureReason,
) => ControlTransition;
const createTransition: CreateTransition = (previous, next, event, side, reason) =>
  Object.freeze({
    previous: freezeState(previous),
    next: freezeState(next),
    event,
    ...(side === undefined ? {} : { side }),
    ...(reason === undefined ? {} : { reason }),
  });

type CreateControlState = () => ControlState;
export const createControlState: CreateControlState = () =>
  Object.freeze({ left: "disabled", right: "disabled" });

type EnableControl = (
  state: ControlState,
  side: ArmSide,
  readiness: ControlReadiness,
) => ControlTransitionResult;
export const enableControl: EnableControl = (state, side, readiness) => {
  const previous = freezeState(state);
  if (readSideMode(previous, side) === "stopped") {
    return Object.freeze({
      ok: false,
      state: previous,
      reason: "emergency-stop-latched",
    });
  }
  const failure = readinessFailure(readiness);
  if (failure !== null) {
    return Object.freeze({ ok: false, state: previous, reason: failure });
  }
  const next = replaceSideMode(previous, side, "enabled");
  return Object.freeze({
    ok: true,
    state: next,
    transition: createTransition(previous, next, "enable", side),
  });
};

type DisableControl = (state: ControlState, side: ArmSide) => ControlTransitionResult;
export const disableControl: DisableControl = (state, side) => {
  const previous = freezeState(state);
  if (readSideMode(previous, side) === "stopped") {
    return Object.freeze({
      ok: false,
      state: previous,
      reason: "emergency-stop-latched",
    });
  }
  const next = replaceSideMode(previous, side, "disabled");
  return Object.freeze({
    ok: true,
    state: next,
    transition: createTransition(previous, next, "disable", side),
  });
};

type ApplyReadiness = (
  state: ControlState,
  side: ArmSide,
  readiness: ControlReadiness,
) => ControlTransitionResult;
export const applyReadiness: ApplyReadiness = (state, side, readiness) => {
  const previous = freezeState(state);
  if (readSideMode(previous, side) === "stopped") {
    return Object.freeze({ ok: true, state: previous });
  }
  const failure = readinessFailure(readiness);
  if (failure === null || readSideMode(previous, side) === "disabled") {
    return Object.freeze({ ok: true, state: previous });
  }
  const next = replaceSideMode(previous, side, "disabled");
  return Object.freeze({
    ok: true,
    state: next,
    transition: createTransition(previous, next, "readiness-lost", side, failure),
  });
};

type EmergencyStop = (state: ControlState) => ControlState;
export const emergencyStop: EmergencyStop = (state) => {
  void state;
  return Object.freeze({ left: "stopped", right: "stopped" });
};

type ClearEmergencyStop = (state: ControlState) => ControlTransitionResult;
export const clearEmergencyStop: ClearEmergencyStop = (state) => {
  const previous = freezeState(state);
  const next = createControlState();
  return Object.freeze({
    ok: true,
    state: next,
    transition: createTransition(previous, next, "emergency-stop-cleared"),
  });
};

type CanTransmitTarget = (state: ControlState, side: ArmSide) => boolean;
export const canTransmitTarget: CanTransmitTarget = (state, side) =>
  readSideMode(state, side) === "enabled";
