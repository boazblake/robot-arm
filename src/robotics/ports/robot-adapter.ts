import { createRobotTarget, type RobotTarget, type RobotTargetInput } from "../model/robot-target";

export type AdapterStatus = "disconnected" | "connecting" | "connected" | "disconnecting";
export type AdapterConnectionFailure = "transport-failed" | "timeout";
export type AdapterLifecycleFailure = "transport-failed" | "timeout";
export type StopFailure = "not-connected" | "transport-failed" | "timeout" | "robot-rejected";
export type SendTargetFailure =
  | "not-connected"
  | "target-invalid"
  | "target-stale"
  | "transport-failed"
  | "timeout"
  | "robot-rejected"
  | "unsupported-intent"
  | "translation-failed";

export type ConnectResult =
  | Readonly<{ ok: true; status: "connected" }>
  | Readonly<{ ok: false; reason: AdapterConnectionFailure }>;
export type DisconnectResult =
  | Readonly<{ ok: true; status: "disconnected" }>
  | Readonly<{ ok: false; reason: AdapterLifecycleFailure }>;
export type StopResult =
  | Readonly<{ ok: true; status: "stop-request-accepted" }>
  | Readonly<{ ok: false; reason: StopFailure }>;
export type SendTargetResult =
  | Readonly<{ ok: true; status: "accepted" }>
  | Readonly<{ ok: false; reason: SendTargetFailure }>;

export type RobotAdapterCapabilities = Readonly<{
  readonly position: true;
  readonly orientation: boolean;
  readonly gripper: boolean;
}>;
export type TargetFreshnessPolicy = (target: RobotTarget) => "fresh" | "stale";
export type RobotTransport = Readonly<{
  readonly connect: () => Promise<unknown>;
  readonly disconnect: () => Promise<unknown>;
  readonly send: (command: unknown) => Promise<unknown>;
  readonly stop: () => Promise<unknown>;
}>;
export type RobotAdapterObserver = (event: RobotAdapterEvent) => void;
export type RobotTargetTranslator = (target: RobotTarget) => unknown;
export type CreateRobotAdapterOptions = Readonly<{
  readonly transport: RobotTransport;
  readonly freshnessPolicy: TargetFreshnessPolicy;
  readonly observer?: RobotAdapterObserver;
  /** Concrete adapters can replace this generic, lossless command translation. */
  readonly translateTarget?: RobotTargetTranslator;
  readonly capabilities?: RobotAdapterCapabilities;
}>;
export type RobotAdapterEvent =
  | Readonly<{ type: "connected" | "disconnected" }>
  | Readonly<{ type: "target-accepted"; sequence: number }>
  | Readonly<{ type: "target-rejected"; sequence?: number; reason: SendTargetFailure }>
  | Readonly<{ type: "stop-requested" | "stop-accepted" }>
  | Readonly<{ type: "stop-failed"; reason: StopFailure }>;
export type RobotAdapter = Readonly<{
  readonly connect: () => Promise<ConnectResult>;
  readonly disconnect: () => Promise<DisconnectResult>;
  readonly sendTarget: (target: RobotTarget) => Promise<SendTargetResult>;
  readonly stop: () => Promise<StopResult>;
  readonly status: () => AdapterStatus;
  readonly capabilities: () => RobotAdapterCapabilities;
}>;

type Failure = "transport-failed" | "timeout" | "robot-rejected";
const failureFrom = (value: unknown, fallback: Failure): Failure => {
  const explicitReason = validObject(value) && typeof value.reason === "string" ? value.reason : "";
  const text = `${explicitReason} ${value instanceof Error ? `${value.name} ${value.message}` : String(value)}`;
  if (/timeout|deadline/i.test(text)) return "timeout";
  if (/reject|denied/i.test(text)) return "robot-rejected";
  return fallback;
};

const lifecycleFailureFrom = (value: unknown): AdapterLifecycleFailure => {
  const failure = failureFrom(value, "transport-failed");
  return failure === "timeout" ? "timeout" : "transport-failed";
};

const transportSucceeded = (value: unknown): boolean =>
  value === undefined || value === true || (typeof value === "object" && value !== null && "ok" in value && value.ok === true);

const validObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readSequence = (value: unknown): number | undefined =>
  validObject(value) && typeof value.sequence === "number" && Number.isInteger(value.sequence) && value.sequence >= 0
    ? value.sequence
    : undefined;

export const createRobotAdapter = (options: CreateRobotAdapterOptions): RobotAdapter => {
  let currentStatus: AdapterStatus = "disconnected";
  let operationQueue: Promise<void> = Promise.resolve();
  let pendingConnect: Promise<ConnectResult> | undefined;
  let pendingDisconnect: Promise<DisconnectResult> | undefined;
  let pendingStop: Promise<StopResult> | undefined;
  const capabilities = Object.freeze({
    position: true as const,
    orientation: options.capabilities?.orientation ?? false,
    gripper: options.capabilities?.gripper ?? false,
  });

  const observe = (event: RobotAdapterEvent): void => {
    try { options.observer?.(event); } catch { /* observers are best effort */ }
  };
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = operationQueue.then(operation, operation);
    operationQueue = result.then(() => undefined, () => undefined);
    return result;
  };
  const rejected = (reason: SendTargetFailure, sequence?: number): SendTargetResult => {
    observe(sequence === undefined ? { type: "target-rejected", reason } : { type: "target-rejected", sequence, reason });
    return Object.freeze({ ok: false, reason });
  };

  const connect = (): Promise<ConnectResult> => {
    if (pendingConnect !== undefined) return pendingConnect;
    if (currentStatus === "connected") return Promise.resolve({ ok: true, status: "connected" });
    const result = enqueue(async () => {
      currentStatus = "connecting";
      try {
        const response = await options.transport.connect();
        if (!transportSucceeded(response)) throw response;
        currentStatus = "connected";
        observe({ type: "connected" });
        return Object.freeze({ ok: true, status: "connected" });
      } catch (error) {
        currentStatus = "disconnected";
        return Object.freeze({ ok: false, reason: lifecycleFailureFrom(error) });
      } finally { pendingConnect = undefined; }
    });
    pendingConnect = result;
    return result;
  };

  const disconnect = (): Promise<DisconnectResult> => {
    if (pendingDisconnect !== undefined) return pendingDisconnect;
    if (currentStatus === "disconnected" && pendingConnect === undefined) return Promise.resolve({ ok: true, status: "disconnected" });
    const result = enqueue(async () => {
      currentStatus = "disconnecting";
      try {
        const response = await options.transport.disconnect();
        if (!transportSucceeded(response)) throw response;
        currentStatus = "disconnected";
        observe({ type: "disconnected" });
        return Object.freeze({ ok: true, status: "disconnected" });
      } catch (error) {
        currentStatus = "disconnected";
        observe({ type: "disconnected" });
        return Object.freeze({ ok: false, reason: lifecycleFailureFrom(error) });
      } finally { pendingDisconnect = undefined; }
    });
    pendingDisconnect = result;
    return result;
  };

  const sendTarget = (target: RobotTarget): Promise<SendTargetResult> => enqueue(async () => {
    let sequence: number | undefined;
    try { sequence = readSequence(target); } catch { return rejected("target-invalid"); }
    if (currentStatus !== "connected") return rejected("not-connected", sequence);
    let validated: RobotTarget;
    try {
      if (!validObject(target)) return rejected("target-invalid", sequence);
      const input = target as unknown as RobotTargetInput;
      const result = createRobotTarget(input);
      if (!result.ok) return rejected("target-invalid", sequence);
      validated = result.target;
    } catch { return rejected("target-invalid", sequence); }
    if (options.freshnessPolicy(validated) === "stale") return rejected("target-stale", validated.sequence);
    if (validated.orientation !== undefined && !capabilities.orientation) return rejected("unsupported-intent", validated.sequence);
    if (validated.gripper !== undefined && !capabilities.gripper) return rejected("unsupported-intent", validated.sequence);
    let command: unknown;
    try {
      command = options.translateTarget === undefined ? validated : options.translateTarget(validated);
      if (options.translateTarget !== undefined && (command === undefined || command === null)) {
        return rejected("translation-failed", validated.sequence);
      }
    } catch { return rejected("translation-failed", validated.sequence); }
    try {
      const response = await options.transport.send(command);
      if (!transportSucceeded(response)) throw response;
      observe({ type: "target-accepted", sequence: validated.sequence });
      return Object.freeze({ ok: true, status: "accepted" });
    } catch (error) {
      return rejected(failureFrom(error, "transport-failed"), validated.sequence);
    }
  });

  const stop = (): Promise<StopResult> => {
    if (pendingStop !== undefined) return pendingStop;
    const result = enqueue(async () => {
      if (currentStatus !== "connected") {
        const failure = Object.freeze({ ok: false, reason: "not-connected" as const });
        observe({ type: "stop-failed", reason: failure.reason });
        return failure;
      }
      observe({ type: "stop-requested" });
      try {
        const response = await options.transport.stop();
        if (!transportSucceeded(response)) throw response;
        observe({ type: "stop-accepted" });
        return Object.freeze({ ok: true, status: "stop-request-accepted" as const });
      } catch (error) {
        const reason = failureFrom(error, "transport-failed");
        observe({ type: "stop-failed", reason });
        return Object.freeze({ ok: false, reason });
      } finally { pendingStop = undefined; }
    });
    pendingStop = result;
    return result;
  };

  return Object.freeze({ connect, disconnect, sendTarget, stop, status: () => currentStatus, capabilities: () => capabilities });
};
