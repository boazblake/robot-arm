import type { RobotTarget } from "../../robotics/model/robot-target";
import {
  createFreshnessConfig,
  createInputFreshnessState,
  updateInputFreshness,
  type FreshnessUpdate,
  type InputFreshnessState,
} from "../../teleoperation/freshness/input-freshness";
import {
  applyReadiness,
  canTransmitTarget,
  clearEmergencyStop,
  disableControl,
  emergencyStop,
  enableControl,
  type ArmSide,
  type ControlReadiness,
  type ControlState,
  type ControlTransitionResult,
} from "../../teleoperation/control/control-policy";

export type RobotControlAdapter = Readonly<{
  readonly sendTarget: (target: RobotTarget) => Promise<void>;
  readonly stop: () => Promise<void>;
}>;

export type TransmissionResult =
  | Readonly<{ readonly ok: true }>
  | Readonly<{ readonly ok: false; readonly reason: "control-disabled" | "input-stale" | "input-lost" }>;

export type EmergencyStopResult =
  | Readonly<{ readonly ok: true }>
  | Readonly<{ readonly ok: false; readonly reason: "adapter-stop-failed" }>;

export type ControlOrchestrator = Readonly<{
  readonly getState: () => ControlState;
  readonly getFreshness: () => InputFreshnessState;
  readonly applyFreshness: (
    side: ArmSide,
    trackingValid: boolean,
    now: number,
  ) => Promise<FreshnessUpdate>;
  readonly enable: (
    side: ArmSide,
    readiness: ControlReadiness,
  ) => Promise<ControlTransitionResult>;
  readonly disable: (side: ArmSide) => Promise<ControlTransitionResult>;
  readonly applyReadiness: (
    side: ArmSide,
    readiness: ControlReadiness,
  ) => Promise<ControlTransitionResult>;
  readonly clearEmergencyStop: () => Promise<ControlTransitionResult>;
  readonly requestEmergencyStop: () => Promise<EmergencyStopResult>;
  readonly submitTarget: (target: RobotTarget) => Promise<boolean>;
  readonly submitTargetResult: (target: RobotTarget) => Promise<TransmissionResult>;
}>;

type Enqueue = <A>(operation: () => Promise<A>) => Promise<A>;

type CreateControlOrchestrator = (
  adapter: RobotControlAdapter,
  initialState?: ControlState,
) => ControlOrchestrator;

export const createControlOrchestrator: CreateControlOrchestrator = (
  adapter,
  initialState = { left: "disabled", right: "disabled" },
) => {
  let state = Object.freeze({ left: initialState.left, right: initialState.right });
  let freshness = createInputFreshnessState();
  const freshnessConfig = createFreshnessConfig();
  let tail: Promise<void> = Promise.resolve();

  const enqueue: Enqueue = <A>(operation: () => Promise<A>): Promise<A> => {
    const queued = tail.then(operation, operation);
    tail = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  };

  const updateState = (result: ControlTransitionResult): ControlTransitionResult => {
    if (result.ok) state = result.state;
    return result;
  };

  const getState = (): ControlState => state;
  const getFreshness = (): InputFreshnessState => freshness;

  const applyFreshness = (
    side: ArmSide,
    trackingValid: boolean,
    now: number,
  ): Promise<FreshnessUpdate> =>
    enqueue(async () => {
      if (!freshnessConfig.ok) throw new Error("Invalid freshness configuration");
      const update = updateInputFreshness(freshness, side, trackingValid, now, freshnessConfig.config);
      freshness = update.state;
      if (update.freshness === "stale") {
        const result = disableControl(state, side);
        if (result.ok) state = result.state;
      }
      if (update.events.includes("input-became-lost")) {
        const left = disableControl(state, "left");
        if (left.ok) state = left.state;
        const right = disableControl(state, "right");
        if (right.ok) state = right.state;
        try {
          await adapter.stop();
        } catch {
          // A failed physical stop never restores local control.
        }
      }
      return update;
    });

  const enable = (
    side: ArmSide,
    readiness: ControlReadiness,
  ): Promise<ControlTransitionResult> =>
    enqueue(async () => updateState(enableControl(state, side, readiness)));

  const disable = (side: ArmSide): Promise<ControlTransitionResult> =>
    enqueue(async () => updateState(disableControl(state, side)));

  const applyReadinessToState = (
    side: ArmSide,
    readiness: ControlReadiness,
  ): Promise<ControlTransitionResult> =>
    enqueue(async () => updateState(applyReadiness(state, side, readiness)));

  const clear = (): Promise<ControlTransitionResult> =>
    enqueue(async () => updateState(clearEmergencyStop(state)));

  const requestEmergencyStop = (): Promise<EmergencyStopResult> =>
    enqueue(async () => {
      state = emergencyStop(state);
      try {
        await adapter.stop();
        return Object.freeze({ ok: true });
      } catch {
        return Object.freeze({ ok: false, reason: "adapter-stop-failed" });
      }
    });

  const submitTargetResult = (target: RobotTarget): Promise<TransmissionResult> =>
    enqueue(async () => {
      if (!canTransmitTarget(state, target.side)) {
        const status = target.side === "left" ? freshness.left.status : freshness.right.status;
        const reason = status === "stale" ? "input-stale" : status === "lost" ? "input-lost" : "control-disabled";
        return Object.freeze({ ok: false, reason });
      }
      await adapter.sendTarget(target);
      return Object.freeze({ ok: true });
    });

  const submitTarget = (target: RobotTarget): Promise<boolean> =>
    submitTargetResult(target).then((result) => result.ok);

  return Object.freeze({
    getState,
    getFreshness,
    applyFreshness,
    enable,
    disable,
    applyReadiness: applyReadinessToState,
    clearEmergencyStop: clear,
    requestEmergencyStop,
    submitTarget,
    submitTargetResult,
  });
};
