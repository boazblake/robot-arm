import { describe, expect, it, vi } from "vitest";
import { createRobotTarget } from "../model/robot-target";
import { createRobotTransportClient, type RobotSocket } from "./robot-transport-client";

const socketFixture = (): RobotSocket => ({
  readyState: 0,
  bufferedAmount: 0,
  send: vi.fn(),
  close: vi.fn(),
  onopen: null,
  onmessage: null,
  onerror: null,
  onclose: null,
});
const validTarget = () => {
  const result = createRobotTarget({ side: "right", position: { x: 0, y: 0, z: 0 }, sourceTimestamp: 1, sequence: 0 });
  if (!result.ok) throw new Error("fixture target invalid");
  return result.target;
};
const open = (socket: RobotSocket): void => { (socket as { readyState: number }).readyState = 1; socket.onopen?.(); };

describe("RobotTransportClient", () => {
  it("serializes current targets with connection-local sequences", async () => {
    const socket = socketFixture();
    const client = createRobotTransportClient({ createSocket: () => socket });
    const connecting = client.connect();
    open(socket);
    await connecting;

    expect(client.sendTarget(validTarget())).toEqual({ ok: true, sequence: 1 });
    expect(client.sendTarget(validTarget())).toEqual({ ok: true, sequence: 2 });
    expect(JSON.parse((socket.send as ReturnType<typeof vi.fn>).mock.calls[0][0])).toMatchObject({ type: "robot-target", sequence: 1 });
  });

  it("rejects malformed, oversized, and backpressured targets before send", async () => {
    const socket = socketFixture();
    const client = createRobotTransportClient({ createSocket: () => socket, maxBufferedBytes: 10 });
    const connecting = client.connect(); open(socket); await connecting;
    expect(client.sendTarget({} as never)).toEqual({ ok: false, reason: "target-invalid" });
    (socket as { bufferedAmount: number }).bufferedAmount = 11;
    expect(client.sendTarget(validTarget())).toEqual({ ok: false, reason: "backpressure" });
    expect(socket.send).not.toHaveBeenCalled();
  });

  it("validates state and drops old state samples", async () => {
    const socket = socketFixture();
    const states: unknown[] = [];
    const events: unknown[] = [];
    const client = createRobotTransportClient({ createSocket: () => socket, robotStateValidator: (value) => typeof value === "string" ? { ok: true, value } : { ok: false } });
    client.onRobotState((state) => states.push(state)); client.onEvent((event) => events.push(event));
    const connecting = client.connect(); open(socket); await connecting;
    socket.onmessage?.({ data: JSON.stringify({ version: 1, type: "robot-state", sequence: 2, payload: "ready" }) });
    socket.onmessage?.({ data: JSON.stringify({ version: 1, type: "robot-state", sequence: 1, payload: "old" }) });
    socket.onmessage?.({ data: { version: 1, type: "robot-state", sequence: 3, payload: 42 } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(states).toEqual([{ stream: "robot-state", sequence: 2, state: "ready" }]);
    expect(events).toContainEqual({ type: "target-dropped", sequence: 1, reason: "duplicate-or-old" });
    expect(events).toContainEqual({ type: "invalid-robot-state" });
  });

  it("waits for stop acknowledgement and resolves unknown on loss", async () => {
    const socket = socketFixture();
    const client = createRobotTransportClient({ createSocket: () => socket, requestTimeoutMs: 100 });
    const connecting = client.connect(); open(socket); await connecting;
    const stopping = client.sendStop();
    const request = JSON.parse((socket.send as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    socket.onmessage?.({ data: { version: 1, type: "stop-result", requestId: request.requestId, result: { ok: true } } });
    await expect(stopping).resolves.toEqual({ ok: true, status: "acknowledged" });

    const uncertain = client.sendStop();
    socket.onclose?.({ code: 1006 });
    await expect(uncertain).resolves.toEqual({ ok: false, reason: "delivery-unknown" });
  });
});
