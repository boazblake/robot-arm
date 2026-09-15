import type { RobotTarget } from "../domain/robot-target";
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
} from "../domain/control-policy";

export type RobotControlAdapter = Readonly<{
  readonly sendTarget: (target: RobotTarget) => Promise<void>;
  readonly stop: () => Promise<void>;
}>;

export type EmergencyStopResult =
  | Readonly<{ readonly ok: true }>
  | Readonly<{ readonly ok: false; readonly reason: "adapter-stop-failed" }>;

export type ControlOrchestrator = Readonly<{
  readonly getState: () => ControlState;
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

  const submitTarget = (target: RobotTarget): Promise<boolean> =>
    enqueue(async () => {
      if (!canTransmitTarget(state, target.side)) return false;
      await adapter.sendTarget(target);
      return true;
    });

  return Object.freeze({
    getState,
    enable,
    disable,
    applyReadiness: applyReadinessToState,
    clearEmergencyStop: clear,
    requestEmergencyStop,
    submitTarget,
  });
};
