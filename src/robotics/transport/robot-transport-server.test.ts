import { describe, expect, it, vi } from "vitest";
import { createRobotTransportServer, type IncomingConnection } from "./robot-transport-server";
import type { RobotAdapter } from "../ports/robot-adapter";

const connectionFixture = (): IncomingConnection & { sent: string[]; closed: boolean } => {
  const sent: string[] = [];
  return { connectionId: "connection-1", principalId: "operator-1", origin: "https://liftmate.test", authorized: true, sent, closed: false, sendText: (text) => sent.push(text), close: () => { /* fixture */ } };
};
const frame = (message: unknown) => { const text = JSON.stringify(message); return { kind: "text" as const, text, byteLength: new TextEncoder().encode(text).byteLength }; };

describe("RobotTransportServer", () => {
  it("starts stopped and gates targets until control-enable", async () => {
    const adapter = { sendTarget: vi.fn().mockResolvedValue({ ok: true, status: "accepted" }), stop: vi.fn().mockResolvedValue({ ok: true, status: "stop-request-accepted" }) };
    const connection = connectionFixture();
    const server = createRobotTransportServer({ resolveAdapter: () => adapter as unknown as RobotAdapter, controlEnablePolicy: async () => ({ ok: true }) });
    const accepted = await server.accept(connection);
    if (!accepted.ok) throw new Error("connection should be accepted");
    const target = { side: "right", position: { x: 0, y: 0, z: 0 }, sourceTimestamp: 1, sequence: 0 };
    await server.receive(accepted.connection, frame({ version: 1, type: "robot-target", sequence: 1, payload: target }));
    expect(adapter.sendTarget).not.toHaveBeenCalled();
    await server.receive(accepted.connection, frame({ version: 1, type: "control-enable", requestId: "enable-1" }));
    await server.receive(accepted.connection, frame({ version: 1, type: "robot-target", sequence: 2, payload: target }));
    expect(adapter.sendTarget).toHaveBeenCalledTimes(1);
  });

  it("serializes stop before later targets and rejects duplicates", async () => {
    const calls: string[] = [];
    const adapter = { sendTarget: vi.fn(async () => { calls.push("target"); return { ok: true, status: "accepted" }; }), stop: vi.fn(async () => { calls.push("stop"); return { ok: true, status: "stop-request-accepted" }; }) };
    const connection = connectionFixture();
    const server = createRobotTransportServer({ resolveAdapter: () => adapter as unknown as RobotAdapter, controlEnablePolicy: async () => ({ ok: true }) });
    const accepted = await server.accept(connection); if (!accepted.ok) throw new Error("connection should be accepted");
    await server.receive(accepted.connection, frame({ version: 1, type: "control-enable", requestId: "enable-1" }));
    const target = { side: "right", position: { x: 0, y: 0, z: 0 }, sourceTimestamp: 1, sequence: 1 };
    await server.receive(accepted.connection, frame({ version: 1, type: "robot-target", sequence: 1, payload: target }));
    await server.receive(accepted.connection, frame({ version: 1, type: "stop", requestId: "stop-1" }));
    const duplicate = await server.receive(accepted.connection, frame({ version: 1, type: "robot-target", sequence: 1, payload: target }));
    expect(calls).toEqual(["target", "stop"]);
    expect(duplicate).toEqual({ ok: false, reason: "duplicate-or-old" });
    expect(adapter.sendTarget).toHaveBeenCalledTimes(1);
  });
});
