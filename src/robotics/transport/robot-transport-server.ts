import { createRobotTarget, type RobotTargetInput } from "../model/robot-target";
import type { RobotAdapter } from "../ports/robot-adapter";

export type RawWebSocketFrame = Readonly<{ kind: "text"; text: string; byteLength: number }> | Readonly<{ kind: "binary"; byteLength: number }>;
export type ConnectionContext = Readonly<{ connectionId: string; principalId: string; adapterId: string; authorized: boolean }>;
export type IncomingConnection = Readonly<{ connectionId: string; principalId: string; origin: string; authorized: boolean; sendText: (text: string) => void; close: (code: number, reason: string) => void }>;
export type ControlState = "active" | "stopped";
export type ReceiveResult = Readonly<{ ok: true; status: "processed" }> | Readonly<{ ok: false; reason: "message-too-large" | "binary-frame-unsupported" | "invalid-json" | "invalid-envelope" | "unsupported-version" | "unsupported-message" | "invalid-payload" | "duplicate-or-old" | "unauthorized" | "control-stopped" }>;
export type ServerSendResult = Readonly<{ ok: true }> | Readonly<{ ok: false; reason: "not-connected" | "transport-failed" }>;
export type StateSendResult = Readonly<{ ok: true; status: "submitted" }> | Readonly<{ ok: false; reason: "not-connected" | "message-too-large" | "transport-failed" }>;
export type ControlEnablePolicy = (context: ConnectionContext) => Promise<Readonly<{ ok: true }> | Readonly<{ ok: false; reason: "forbidden" }>>;
export type ServerTransportEvent =
  | Readonly<{ type: "target-rejected"; sequence: number; reason: "control-stopped" | "unauthorized" | "duplicate-or-old" | "target-invalid" }>
  | Readonly<{ type: "connection-lost"; connectionId: string }>;
export type ServerOptions<State> = Readonly<{
  readonly resolveAdapter: (context: ConnectionContext) => RobotAdapter | null;
  readonly controlEnablePolicy: ControlEnablePolicy;
  readonly validateRobotState?: (input: State) => boolean;
  readonly observer?: (event: ServerTransportEvent) => void;
}>;
export type RobotTransportServer<State = unknown> = Readonly<{
  readonly accept: (connection: IncomingConnection) => Promise<Readonly<{ ok: true; connection: ConnectionContext }> | Readonly<{ ok: false; reason: "unauthorized" | "forbidden" | "origin-rejected" }>>;
  readonly receive: (connection: ConnectionContext, frame: RawWebSocketFrame) => Promise<ReceiveResult>;
  readonly sendRobotState: (connection: ConnectionContext, state: State) => StateSendResult;
  readonly close: (connection: ConnectionContext) => void;
}>;

const MAX_BYTES = 65_536;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const validSequence = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value > 0;
const encodeSize = (value: string): number => new TextEncoder().encode(value).byteLength;

export const createRobotTransportServer = <State = unknown>(options: ServerOptions<State>): RobotTransportServer<State> => {
  type Session = { context: ConnectionContext; connection: IncomingConnection; valid: boolean; controlState: ControlState; lastTargetSequence: number; nextStateSequence: number; receiveQueue: Promise<void>; outboundQueue: Promise<void> };
  const sessions = new Map<string, Session>();
  const observe = (event: ServerTransportEvent): void => { try { options.observer?.(event); } catch { /* best effort */ } };
  const lookup = (context: ConnectionContext): Session | null => { const session = sessions.get(context.connectionId); return session?.valid && session.context.principalId === context.principalId ? session : null; };
  const enqueueReceive = <T>(session: Session, operation: () => Promise<T>): Promise<T> => {
    const result = session.receiveQueue.then(operation, operation);
    session.receiveQueue = result.then(() => undefined, () => undefined);
    return result;
  };
  const enqueueOutbound = (session: Session, operation: () => void): void => {
    const result = session.outboundQueue.then(operation, operation);
    session.outboundQueue = result.then(() => undefined, () => undefined);
  };
  const send = (session: Session, message: unknown): ServerSendResult => {
    if (!session.valid) return Object.freeze({ ok: false, reason: "not-connected" });
    let text: string; try { text = JSON.stringify(message); } catch { return Object.freeze({ ok: false, reason: "transport-failed" }); }
    if (encodeSize(text) > MAX_BYTES) return Object.freeze({ ok: false, reason: "transport-failed" });
    try { session.connection.sendText(text); return Object.freeze({ ok: true }); } catch { return Object.freeze({ ok: false, reason: "transport-failed" }); }
  };
  const accept = async (connection: IncomingConnection) => {
    if (!connection.authorized) return Object.freeze({ ok: false, reason: "forbidden" as const });
    const context = Object.freeze({ connectionId: connection.connectionId, principalId: connection.principalId, adapterId: connection.connectionId, authorized: true });
    sessions.set(connection.connectionId, { context, connection, valid: true, controlState: "stopped", lastTargetSequence: 0, nextStateSequence: 1, receiveQueue: Promise.resolve(), outboundQueue: Promise.resolve() });
    return Object.freeze({ ok: true, connection: context });
  };
  const receive = (connection: ConnectionContext, frame: RawWebSocketFrame): Promise<ReceiveResult> => {
    const session = lookup(connection);
    if (session === null) return Promise.resolve(Object.freeze({ ok: false, reason: "unauthorized" as const }));
    return enqueueReceive(session, async () => {
      if (!session.valid) return Object.freeze({ ok: false, reason: "unauthorized" as const });
      if (frame.kind === "binary") return Object.freeze({ ok: false, reason: "binary-frame-unsupported" as const });
      if (frame.byteLength > MAX_BYTES) return Object.freeze({ ok: false, reason: "message-too-large" as const });
      let message: unknown; try { message = JSON.parse(frame.text); } catch { return Object.freeze({ ok: false, reason: "invalid-json" as const }); }
      if (!isRecord(message) || message.version !== 1 || typeof message.type !== "string") return Object.freeze({ ok: false, reason: "invalid-envelope" as const });
      if (message.type === "robot-target") {
        if (!validSequence(message.sequence)) return Object.freeze({ ok: false, reason: "invalid-envelope" as const });
        if (message.sequence <= session.lastTargetSequence) { observe({ type: "target-rejected", sequence: message.sequence, reason: "duplicate-or-old" }); return Object.freeze({ ok: false, reason: "duplicate-or-old" as const }); }
        session.lastTargetSequence = message.sequence;
        let targetResult;
        try { targetResult = createRobotTarget(message.payload as RobotTargetInput); }
        catch { targetResult = { ok: false as const, reason: "position-invalid" as const }; }
        if (!targetResult.ok) { observe({ type: "target-rejected", sequence: message.sequence, reason: "target-invalid" }); return Object.freeze({ ok: false, reason: "invalid-payload" as const }); }
        if (!session.valid || !session.context.authorized || session.controlState !== "active") { observe({ type: "target-rejected", sequence: message.sequence, reason: session.context.authorized ? "control-stopped" : "unauthorized" }); return Object.freeze({ ok: false, reason: session.context.authorized ? "control-stopped" : "unauthorized" }); }
        const adapter = options.resolveAdapter(session.context);
        if (adapter === null) return Object.freeze({ ok: false, reason: "unauthorized" as const });
        if (!session.valid || session.controlState !== "active") return Object.freeze({ ok: false, reason: "control-stopped" as const });
        await adapter.sendTarget(targetResult.target);
        return Object.freeze({ ok: true, status: "processed" as const });
      }
      if (message.type === "control-enable") {
        if (typeof message.requestId !== "string") return Object.freeze({ ok: false, reason: "invalid-envelope" as const });
        const policy = await options.controlEnablePolicy(session.context);
        if (!session.valid) return Object.freeze({ ok: false, reason: "unauthorized" as const });
        const result = policy.ok ? (session.controlState = "active", { ok: true }) : policy;
        enqueueOutbound(session, () => { send(session, { version: 1, type: "control-enable-result", requestId: message.requestId, result }); });
        return Object.freeze({ ok: true, status: "processed" as const });
      }
      if (message.type === "stop") {
        if (typeof message.requestId !== "string") return Object.freeze({ ok: false, reason: "invalid-envelope" as const });
        session.controlState = "stopped";
        const adapter = options.resolveAdapter(session.context);
        const result = adapter === null ? { ok: false, reason: "remote-rejected" as const } : await adapter.stop();
        if (session.valid) enqueueOutbound(session, () => { send(session, { version: 1, type: "stop-result", requestId: message.requestId, result: result.ok ? { ok: true } : { ok: false, reason: "remote-rejected" } }); });
        return Object.freeze({ ok: true, status: "processed" as const });
      }
      return Object.freeze({ ok: false, reason: "unsupported-message" as const });
    });
  };
  const sendRobotState = (connection: ConnectionContext, state: State): StateSendResult => {
    const session = lookup(connection); if (session === null) return Object.freeze({ ok: false, reason: "not-connected" });
    if (options.validateRobotState && !options.validateRobotState(state)) return Object.freeze({ ok: false, reason: "transport-failed" });
    const sequence = session.nextStateSequence; let message: string; try { message = JSON.stringify({ version: 1, type: "robot-state", sequence, payload: state }); } catch { return Object.freeze({ ok: false, reason: "transport-failed" }); }
    if (encodeSize(message) > MAX_BYTES) return Object.freeze({ ok: false, reason: "message-too-large" });
    enqueueOutbound(session, () => { if (session.valid) { try { session.connection.sendText(message); session.nextStateSequence += 1; } catch { /* connection close owns failure */ } } });
    return Object.freeze({ ok: true, status: "submitted" });
  };
  const close = (connection: ConnectionContext): void => { const session = sessions.get(connection.connectionId); if (session === undefined) return; session.valid = false; session.controlState = "stopped"; sessions.delete(connection.connectionId); try { session.connection.close(1000, "closed"); } catch { /* best effort */ } observe({ type: "connection-lost", connectionId: connection.connectionId }); };
  return Object.freeze({ accept, receive, sendRobotState, close });
};
