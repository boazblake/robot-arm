import { createRobotTarget, type RobotTarget, type RobotTargetInput } from "../../model/robot-target";
import type {
  AdapterConnectionFailure,
  AdapterLifecycleFailure,
  AdapterStatus,
  ConnectResult,
  DisconnectResult,
  RobotAdapter,
  RobotAdapterCapabilities,
  RobotAdapterEvent,
  RobotAdapterObserver,
  SendTargetFailure,
  SendTargetResult,
  StopResult,
  TargetFreshnessPolicy,
} from "../../ports/robot-adapter";
import type { RosTransport } from "../../transport/ros-transport";

type ClrTargetMapperResult =
  | Readonly<{ readonly ok: true; readonly command: Readonly<Record<string, unknown>> }>
  | Readonly<{ readonly ok: false; readonly reason: "translation-failed" }>;

export type ClrTargetMapper = (
  target: RobotTarget,
) => ClrTargetMapperResult;

export type ClrAdapterConfiguration = Readonly<{
  readonly targetChannel: string;
  readonly targetMessageType: string;
  readonly stopChannel: string;
  readonly stopMessageType: string;
  readonly stopMessage: Readonly<Record<string, unknown>>;
  readonly capabilities?: Readonly<{
    readonly orientation: boolean;
    readonly gripper: boolean;
  }>;
}>;

export type CreateClrRobotAdapterOptions = Readonly<{
  readonly transport: RosTransport;
  readonly mapper: ClrTargetMapper;
  readonly configuration: ClrAdapterConfiguration;
  readonly freshnessPolicy: TargetFreshnessPolicy;
  readonly observer?: RobotAdapterObserver;
}>;

const mapConnectionFailure = (reason: string): AdapterConnectionFailure =>
  reason === "timeout" ? "timeout" : "transport-failed";
const mapLifecycleFailure = (reason: string): AdapterLifecycleFailure =>
  reason === "timeout" ? "timeout" : "transport-failed";

export const createClrRobotAdapter = (
  options: CreateClrRobotAdapterOptions,
): RobotAdapter => {
  const capabilities: RobotAdapterCapabilities = Object.freeze({
    position: true,
    orientation: options.configuration.capabilities?.orientation ?? false,
    gripper: options.configuration.capabilities?.gripper ?? false,
  });
  let operationTail: Promise<void> = Promise.resolve();
  const enqueue = <A>(operation: () => Promise<A>): Promise<A> => {
    const result = operationTail.then(operation, operation);
    operationTail = result.then(() => undefined, () => undefined);
    return result;
  };
  const observe = (event: RobotAdapterEvent): void => {
    try {
      options.observer?.(event);
    } catch {
      // Observers are diagnostic only.
    }
  };
  const reject = (reason: SendTargetFailure, sequence?: number): SendTargetResult => {
    observe(sequence === undefined
      ? { type: "target-rejected", reason }
      : { type: "target-rejected", sequence, reason });
    return Object.freeze({ ok: false, reason });
  };
  const connect = (): Promise<ConnectResult> =>
    enqueue(async () => {
      const result = await options.transport.connect();
      if (result.ok) {
        observe({ type: "connected" });
        return Object.freeze({ ok: true, status: "connected" as const });
      }
      return Object.freeze({ ok: false, reason: mapConnectionFailure(result.reason) });
    });
  const disconnect = (): Promise<DisconnectResult> =>
    enqueue(async () => {
      const result = await options.transport.disconnect();
      if (result.ok) {
        observe({ type: "disconnected" });
        return Object.freeze({ ok: true, status: "disconnected" as const });
      }
      observe({ type: "disconnected" });
      return Object.freeze({ ok: false, reason: mapLifecycleFailure(result.reason) });
    });
  const sendTarget = (target: RobotTarget): Promise<SendTargetResult> =>
    enqueue(async () => {
      let sequence: number | undefined;
      try {
        if (typeof target === "object" && target !== null && "sequence" in target) {
          const candidate = target.sequence;
          if (typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 0) sequence = candidate;
        }
        if (options.transport.status() !== "connected") return reject("not-connected", sequence);
        const validation = createRobotTarget(target as unknown as RobotTargetInput);
        if (!validation.ok) return reject("target-invalid", sequence);
        const validated = validation.target;
        if (options.freshnessPolicy(validated) === "stale") return reject("target-stale", validated.sequence);
        if (validated.orientation !== undefined && !capabilities.orientation) return reject("unsupported-intent", validated.sequence);
        if (validated.gripper !== undefined && !capabilities.gripper) return reject("unsupported-intent", validated.sequence);
        const mapped = options.mapper(validated);
        if (!mapped.ok) return reject(mapped.reason, validated.sequence);
        const published = options.transport.publish(
          options.configuration.targetChannel,
          mapped.command,
          options.configuration.targetMessageType,
        );
        if (!published.ok) return reject("transport-failed", validated.sequence);
        observe({ type: "target-accepted", sequence: validated.sequence });
        return Object.freeze({ ok: true, status: "accepted" as const });
      } catch {
        return reject("translation-failed", sequence);
      }
    });
  const stop = (): Promise<StopResult> =>
    enqueue(async () => {
      if (options.transport.status() !== "connected") {
        observe({ type: "stop-failed", reason: "not-connected" });
        return Object.freeze({ ok: false, reason: "not-connected" as const });
      }
      observe({ type: "stop-requested" });
      const published = options.transport.publish(
        options.configuration.stopChannel,
        options.configuration.stopMessage,
        options.configuration.stopMessageType,
      );
      if (!published.ok) {
        observe({ type: "stop-failed", reason: "transport-failed" });
        return Object.freeze({ ok: false, reason: "transport-failed" as const });
      }
      observe({ type: "stop-accepted" });
      return Object.freeze({ ok: true, status: "stop-request-accepted" as const });
    });
  const status = (): AdapterStatus => {
    const current = options.transport.status();
    return current === "connected" || current === "connecting" || current === "disconnecting"
      ? current
      : "disconnected";
  };
  return Object.freeze({ connect, disconnect, sendTarget, stop, status, capabilities: () => capabilities });
};
