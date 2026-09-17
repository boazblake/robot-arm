import { createRobotTarget, type RobotTarget, type RobotTargetInput } from "../model/robot-target";
import type {
  TransportConnectResult,
  TransportDisconnectResult,
  TransportStopResult,
  TransportTargetResult,
} from "../ports/robot-adapter";

export type TransportStatus = "disconnected" | "connecting" | "connected" | "closing";
export type Unsubscribe = () => void;
export type AdapterErrorReason = "target-invalid" | "target-stale" | "unsupported-intent" | "translation-failed" | "robot-rejected";
export type RobotStateValidator<State> = (input: unknown) => Readonly<{ ok: true; value: State }> | Readonly<{ ok: false }>;
export type RobotStateEvent<State = unknown> = Readonly<{ stream: "robot-state"; sequence: number; state: State }>;
export type AdapterErrorEvent = Readonly<{ stream: "adapter-error"; sequence: number; targetSequence: number; reason: AdapterErrorReason }>;
export type ConnectionLossReason = "network" | "server" | "authentication-expired" | "authorization-revoked" | "protocol-error";
export type TransportControlEnableResult =
  | Readonly<{ ok: true; status: "acknowledged" }>
  | Readonly<{ ok: false; reason: "not-connected" | "closing" | "control-superseded" | "transport-failed" | "timeout" | "remote-rejected" | "delivery-unknown" }>;
export type TransportEvent =
  | Readonly<{ type: "connection-lost"; reason: ConnectionLossReason }>
  | Readonly<{ type: "disconnected" }>
  | Readonly<{ type: "stale-control-result"; requestId: string }>
  | Readonly<{ type: "target-dropped"; sequence: number; reason: "duplicate-or-old" }>
  | Readonly<{ type: "invalid-robot-state" }>;

export type RobotSocket = {
  readonly readyState: number;
  readonly bufferedAmount: number;
  readonly send: (data: string) => void;
  readonly close: () => void;
  onopen: (() => void) | null;
  onmessage: ((event: Readonly<{ data: unknown }>) => void) | null;
  onerror: (() => void) | null;
  onclose: ((event: Readonly<{ code: number }>) => void) | null;
};
export type RobotSocketFactory = () => RobotSocket;
export type RobotTransportClientOptions<State> = Readonly<{
  readonly createSocket: RobotSocketFactory;
  readonly robotStateValidator?: RobotStateValidator<State>;
  readonly maxBufferedBytes?: number;
  readonly requestTimeoutMs?: number;
}>;

const OPEN = 1;
const MAX_MESSAGE_BYTES = 65_536;
const textBytes = (value: string): number => new TextEncoder().encode(value).byteLength;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const parseSequence = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;
const isAdapterErrorReason = (value: unknown): value is AdapterErrorReason => value === "target-invalid" || value === "target-stale" || value === "unsupported-intent" || value === "translation-failed" || value === "robot-rejected";
const parseTarget = (value: unknown): RobotTarget | null => {
  if (!isRecord(value)) return null;
  try {
    const result = createRobotTarget(value as unknown as RobotTargetInput);
    return result.ok ? result.target : null;
  } catch { return null; }
};

export const createRobotTransportClient = <State = unknown>(options: RobotTransportClientOptions<State>) => {
  let status: TransportStatus = "disconnected";
  let socket: RobotSocket | null = null;
  let generation = 0;
  let nextTargetSequence = 1;
  let lastStateSequence = 0;
  let connectPromise: Promise<TransportConnectResult> | undefined;
  let resolveConnect: ((result: TransportConnectResult) => void) | undefined;
  let disconnectPromise: Promise<TransportDisconnectResult> | undefined;
  const listeners = new Set<(event: TransportEvent) => void>();
  const stateListeners = new Set<(event: RobotStateEvent<State>) => void>();
  const adapterErrorListeners = new Set<(event: AdapterErrorEvent) => void>();
  const controls = new Map<string, { operation: "stop" | "control-enable"; generation: number; resolve: (result: TransportStopResult | TransportControlEnableResult) => void; timer: ReturnType<typeof setTimeout> }>();
  const timeoutMs = options.requestTimeoutMs ?? 2_000;

  const observe = (event: TransportEvent): void => { for (const listener of listeners) { try { listener(event); } catch { /* best effort */ } } };
  const disconnectResult = (): TransportDisconnectResult => Object.freeze({ ok: true, status: "disconnected" });
  const failControls = (uncertain: boolean): void => {
    for (const [requestId, control] of controls) {
      clearTimeout(control.timer);
      control.resolve(Object.freeze({ ok: false, reason: uncertain ? "delivery-unknown" : "not-connected" }));
      controls.delete(requestId);
    }
  };
  const closeGeneration = (myGeneration: number, reason: ConnectionLossReason | null): void => {
    if (myGeneration !== generation) return;
    generation += 1;
    status = "disconnected";
    failControls(true);
    socket = null;
    if (reason === null) observe({ type: "disconnected" });
    else observe({ type: "connection-lost", reason });
  };
  const attach = (candidate: RobotSocket, myGeneration: number): void => {
    let inboundQueue: Promise<void> = Promise.resolve();
    candidate.onopen = () => { if (myGeneration === generation) { status = "connected"; } };
    candidate.onmessage = (event) => {
      if (myGeneration !== generation) return;
      inboundQueue = inboundQueue.then(() => processMessage(event.data, myGeneration)).catch(() => undefined);
    };
    const processMessage = async (rawData: unknown, messageGeneration: number): Promise<void> => {
      if (messageGeneration !== generation) return;
      const data = typeof rawData === "string" ? (() => { try { return JSON.parse(rawData); } catch { return null; } })() : rawData;
      if (!isRecord(data) || data.version !== 1) return;
      if (data.type === "robot-state") {
        if (!parseSequence(data.sequence) || data.sequence <= lastStateSequence) {
          if (parseSequence(data.sequence)) observe({ type: "target-dropped", sequence: data.sequence, reason: "duplicate-or-old" });
          return;
        }
        const validation = options.robotStateValidator?.(data.payload);
        if (validation === undefined || !validation.ok) { observe({ type: "invalid-robot-state" }); return; }
        lastStateSequence = data.sequence;
        const stateEvent = Object.freeze({ stream: "robot-state" as const, sequence: data.sequence, state: validation.value });
        for (const listener of stateListeners) { try { listener(stateEvent); } catch { /* best effort */ } }
      } else if (data.type === "adapter-error" && parseSequence(data.sequence) && parseSequence(data.targetSequence) && isAdapterErrorReason(data.reason)) {
        const adapterEvent = Object.freeze({ stream: "adapter-error" as const, sequence: data.sequence, targetSequence: data.targetSequence, reason: data.reason });
        for (const listener of adapterErrorListeners) { try { listener(adapterEvent); } catch { /* best effort */ } }
      } else if ((data.type === "stop-result" || data.type === "control-enable-result") && typeof data.requestId === "string") {
        const control = controls.get(data.requestId);
        if (control === undefined || control.generation !== myGeneration) { observe({ type: "stale-control-result", requestId: data.requestId }); return; }
        clearTimeout(control.timer); controls.delete(data.requestId);
        const result = isRecord(data.result) ? data.result : null;
        control.resolve(result !== null && result.ok === true ? Object.freeze({ ok: true, status: "acknowledged" }) : Object.freeze({ ok: false, reason: "remote-rejected" }));
      }
    };
    candidate.onerror = () => closeGeneration(myGeneration, "network");
    candidate.onclose = (event) => closeGeneration(myGeneration, event.code === 4401 ? "authentication-expired" : event.code === 4403 ? "authorization-revoked" : event.code === 4422 ? "protocol-error" : "server");
  };
  const connect = (): Promise<TransportConnectResult> => {
    if (connectPromise !== undefined) return connectPromise;
    if (status === "connected") return Promise.resolve(Object.freeze({ ok: true, status: "connected" }));
    status = "connecting";
    nextTargetSequence = 1;
    lastStateSequence = 0;
    const myGeneration = ++generation;
    const candidate = options.createSocket(); socket = candidate; attach(candidate, myGeneration);
    connectPromise = new Promise<TransportConnectResult>((resolve) => {
      resolveConnect = resolve;
      const timer = setTimeout(() => { if (myGeneration === generation) { closeGeneration(myGeneration, "network"); resolve({ ok: false, reason: "timeout" }); } }, timeoutMs);
      const previousOpen = candidate.onopen;
      candidate.onopen = () => { clearTimeout(timer); previousOpen?.(); resolve(Object.freeze({ ok: true, status: "connected" })); };
      const previousClose = candidate.onclose;
      candidate.onclose = (event) => { previousClose?.(event); resolve(Object.freeze({ ok: false, reason: event.code === 4401 ? "authentication-expired" : event.code === 4403 ? "forbidden" : "transport-failed" })); };
      const previousError = candidate.onerror;
      candidate.onerror = () => { previousError?.(); resolve(Object.freeze({ ok: false, reason: "transport-failed" })); };
    }).finally(() => { connectPromise = undefined; resolveConnect = undefined; });
    return connectPromise;
  };
  const disconnect = (): Promise<TransportDisconnectResult> => {
    if (disconnectPromise !== undefined) return disconnectPromise;
    if (status === "disconnected") return Promise.resolve(disconnectResult());
    status = "closing";
    if (status === "closing" && resolveConnect !== undefined) resolveConnect(Object.freeze({ ok: false, reason: "cancelled" }));
    failControls(true); generation += 1; const oldSocket = socket; socket = null;
    disconnectPromise = Promise.resolve().then(() => { try { oldSocket?.close(); } catch { return Object.freeze({ ok: false, reason: "transport-failed" as const }); } return disconnectResult(); }).finally(() => { status = "disconnected"; disconnectPromise = undefined; });
    return disconnectPromise;
  };
  const sendTarget = (target: RobotTarget): TransportTargetResult => {
    if (status !== "connected" || socket === null || socket.readyState !== OPEN) return Object.freeze({ ok: false, reason: "not-connected" });
    const validated = parseTarget(target); if (validated === null) return Object.freeze({ ok: false, reason: "target-invalid" });
    if (socket.bufferedAmount > (options.maxBufferedBytes ?? MAX_MESSAGE_BYTES)) return Object.freeze({ ok: false, reason: "backpressure" });
    const sequence = nextTargetSequence;
    let message: string; try { message = JSON.stringify({ version: 1, type: "robot-target", sequence, payload: validated }); } catch { return Object.freeze({ ok: false, reason: "serialization-failed" }); }
    if (textBytes(message) > MAX_MESSAGE_BYTES) return Object.freeze({ ok: false, reason: "message-too-large" });
    try { socket.send(message); } catch {
      const failedSocket = socket;
      closeGeneration(generation, "network");
      try { failedSocket?.close(); } catch { /* best effort */ }
      return Object.freeze({ ok: false, reason: "transport-failed" });
    }
    nextTargetSequence += 1; return Object.freeze({ ok: true, sequence });
  };
  const sendControl = (operation: "stop" | "control-enable"): Promise<TransportStopResult | TransportControlEnableResult> => {
    if (status === "closing") return Promise.resolve(Object.freeze({ ok: false, reason: "closing" }));
    if (status !== "connected" || socket === null || socket.readyState !== OPEN) return Promise.resolve(Object.freeze({ ok: false, reason: "not-connected" }));
    for (const control of controls.values()) if (control.operation === operation) return new Promise((resolve) => { const existing = [...controls.entries()].find(([, value]) => value === control); if (existing) { const originalResolve = control.resolve; control.resolve = (result) => { originalResolve(result); resolve(result); }; } });
    const requestId = crypto.randomUUID(); const message = JSON.stringify({ version: 1, type: operation === "stop" ? "stop" : "control-enable", requestId });
    let resolveRequest!: (result: TransportStopResult | TransportControlEnableResult) => void;
    const result = new Promise<TransportStopResult | TransportControlEnableResult>((resolve) => { resolveRequest = resolve; });
    const timer = setTimeout(() => { controls.delete(requestId); resolveRequest(Object.freeze({ ok: false, reason: "timeout" })); }, timeoutMs);
    controls.set(requestId, { operation, generation, resolve: resolveRequest, timer });
    try { socket.send(message); } catch {
      clearTimeout(timer);
      controls.delete(requestId);
      const failedSocket = socket;
      closeGeneration(generation, "network");
      try { failedSocket?.close(); } catch { /* best effort */ }
      resolveRequest(Object.freeze({ ok: false, reason: "transport-failed" }));
    }
    return result;
  };
  const on = <T>(set: Set<T>, listener: T): Unsubscribe => { set.add(listener); return () => { set.delete(listener); }; };
  return Object.freeze({ connect, disconnect, sendTarget, sendControlEnable: () => sendControl("control-enable") as Promise<TransportControlEnableResult>, sendStop: () => sendControl("stop") as Promise<TransportStopResult>, onRobotState: (listener: (event: RobotStateEvent<State>) => void) => on(stateListeners, listener), onAdapterError: (listener: (event: AdapterErrorEvent) => void) => on(adapterErrorListeners, listener), onEvent: (listener: (event: TransportEvent) => void) => on(listeners, listener), status: () => status });
};
