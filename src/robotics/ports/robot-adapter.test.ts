import { describe, expect, it, vi } from "vitest";
import { createRobotTarget } from "../model/robot-target";
import { createRobotAdapter, type RobotTransport, type TransportConnectResult, type TransportDisconnectResult, type TransportTargetResult } from "./robot-adapter";

const target = (sequence = 1, options: { orientation?: boolean; gripper?: "open" | "close" } = {}) => {
  const result = createRobotTarget({
    side: "right",
    position: { x: 0.2, y: -0.1, z: 0.4 },
    ...(options.orientation ? { orientation: { x: 0, y: 0, z: 0, w: 1 } } : {}),
    ...(options.gripper === undefined ? {} : { gripper: options.gripper }),
    sourceTimestamp: 10,
    sequence,
  });
  if (!result.ok) throw new Error("test target must be valid");
  return result.target;
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const transportWith = (overrides: Partial<RobotTransport> = {}): RobotTransport => ({
  connect: vi.fn().mockResolvedValue({ ok: true }),
  disconnect: vi.fn().mockResolvedValue({ ok: true }),
  send: vi.fn().mockReturnValue({ ok: true }),
  stop: vi.fn().mockResolvedValue({ ok: true }),
  ...overrides,
});

describe("RobotAdapter", () => {
  it("serializes lifecycle and target operations", async () => {
    const transport = transportWith();
    const adapter = createRobotAdapter({ transport, freshnessPolicy: () => "fresh" });

    const connect = adapter.connect();
    expect(adapter.status()).toBe("disconnected");
    await connect;
    expect(adapter.status()).toBe("connected");

    const results = await Promise.all([adapter.sendTarget(target(1)), adapter.stop(), adapter.sendTarget(target(2))]);
    expect(results.map((result) => result.ok)).toEqual([true, true, true]);
    expect(transport.send).toHaveBeenCalledTimes(2);
    expect(transport.stop).toHaveBeenCalledTimes(1);
  });

  it("defensively rejects malformed targets without transport access", async () => {
    const transport = transportWith();
    const events: unknown[] = [];
    const adapter = createRobotAdapter({ transport, freshnessPolicy: () => "fresh", observer: (event) => events.push(event) });
    await adapter.connect();

    const result = await adapter.sendTarget({ side: "right", position: { x: Infinity } } as never);

    expect(result).toEqual({ ok: false, reason: "target-invalid" });
    expect(transport.send).not.toHaveBeenCalled();
    expect(events).toHaveLength(2);
    expect(events[1]).toEqual({ type: "target-rejected", reason: "target-invalid" });
  });

  it("uses the injected freshness policy and does not retry writes", async () => {
    const transport = transportWith({ send: vi.fn(() => { throw new Error("deadline exceeded"); }) });
    const adapter = createRobotAdapter({ transport, freshnessPolicy: () => "stale" });
    await adapter.connect();

    expect(await adapter.sendTarget(target())).toEqual({ ok: false, reason: "target-stale" });
    expect(transport.send).not.toHaveBeenCalled();

    const freshAdapter = createRobotAdapter({ transport, freshnessPolicy: () => "fresh" });
    await freshAdapter.connect();
    expect(await freshAdapter.sendTarget(target())).toEqual({ ok: false, reason: "timeout" });
    expect(transport.send).toHaveBeenCalledTimes(1);
  });

  it("maps lifecycle failures and restores safe statuses", async () => {
    const connectFailure = transportWith({ connect: vi.fn().mockRejectedValue(new Error("connection timeout")) });
    const failedConnect = createRobotAdapter({ transport: connectFailure, freshnessPolicy: () => "fresh" });
    expect(await failedConnect.connect()).toEqual({ ok: false, reason: "timeout" });
    expect(failedConnect.status()).toBe("disconnected");

    const disconnectFailure = transportWith({ disconnect: vi.fn().mockRejectedValue(new Error("cleanup failed")) });
    const failedDisconnect = createRobotAdapter({ transport: disconnectFailure, freshnessPolicy: () => "fresh" });
    await failedDisconnect.connect();
    expect(await failedDisconnect.disconnect()).toEqual({ ok: false, reason: "transport-failed" });
    expect(failedDisconnect.status()).toBe("disconnected");

    const disconnected = createRobotAdapter({ transport: transportWith(), freshnessPolicy: () => "fresh" });
    expect(await disconnected.stop()).toEqual({ ok: false, reason: "not-connected" });
  });

  it("reports unsupported intent and translation failures before transport", async () => {
    const transport = transportWith();
    const events: unknown[] = [];
    const adapter = createRobotAdapter({
      transport,
      freshnessPolicy: () => "fresh",
      observer: (event) => events.push(event),
    });
    await adapter.connect();

    expect(await adapter.sendTarget(target(3, { orientation: true }))).toEqual({ ok: false, reason: "unsupported-intent" });
    expect(await adapter.sendTarget(target(4, { gripper: "close" }))).toEqual({ ok: false, reason: "unsupported-intent" });
    const translating = createRobotAdapter({
      transport,
      freshnessPolicy: () => "fresh",
      translateTarget: () => { throw new Error("unsafe translation"); },
    });
    await translating.connect();
    expect(await translating.sendTarget(target(5))).toEqual({ ok: false, reason: "translation-failed" });
    expect(transport.send).not.toHaveBeenCalled();
    expect(events.slice(-2)).toEqual([
      { type: "target-rejected", sequence: 3, reason: "unsupported-intent" },
      { type: "target-rejected", sequence: 4, reason: "unsupported-intent" },
    ]);
  });

  it("maps external command rejection and isolates observer failures", async () => {
    const observer = vi.fn(() => { throw new Error("observer failure"); });
    const transport = transportWith({ send: vi.fn().mockResolvedValue({ ok: false, reason: "robot-rejected" }) });
    const adapter = createRobotAdapter({ transport, freshnessPolicy: () => "fresh", observer });
    await expect(adapter.connect()).resolves.toEqual({ ok: true, status: "connected" });
    await expect(adapter.sendTarget(target(9))).resolves.toEqual({ ok: false, reason: "transport-failed" });
    expect(observer).toHaveBeenCalled();
  });

  it("emits one exclusive target event with the established sequence", async () => {
    const events: unknown[] = [];
    const transport = transportWith();
    const adapter = createRobotAdapter({ transport, freshnessPolicy: () => "fresh", observer: (event) => events.push(event) });
    await adapter.connect();
    await adapter.sendTarget(target(17));
    await adapter.sendTarget({ side: "right", position: { x: 2 }, sequence: 18, sourceTimestamp: 10 } as never);

    expect(events.filter((event) => (event as { type: string }).type === "target-accepted")).toEqual([
      { type: "target-accepted", sequence: 17 },
    ]);
    expect(events.filter((event) => (event as { type: string }).type === "target-rejected")).toEqual([
      { type: "target-rejected", sequence: 18, reason: "target-invalid" },
    ]);
    expect(JSON.stringify(events)).not.toMatch(/sourceTimestamp|position|correlation/);
  });

  it("exposes connecting and disconnecting only while those operations execute", async () => {
    const connection = deferred<TransportConnectResult>();
    const cleanup = deferred<TransportDisconnectResult>();
    const transport = transportWith({ connect: vi.fn(() => connection.promise), disconnect: vi.fn(() => cleanup.promise) });
    const adapter = createRobotAdapter({ transport, freshnessPolicy: () => "fresh" });

    const connecting = adapter.connect();
    await Promise.resolve();
    expect(adapter.status()).toBe("connecting");
    connection.resolve({ ok: true, status: "connected" });
    await connecting;

    const disconnecting = adapter.disconnect();
    await Promise.resolve();
    expect(adapter.status()).toBe("disconnecting");
    cleanup.resolve({ ok: true, status: "disconnected" });
    await disconnecting;
  });

  it("maps send and stop transport failures without retrying", async () => {
    const transport = transportWith({
      send: vi.fn(() => { throw new Error("write failed"); }),
      stop: vi.fn().mockResolvedValue({ ok: false, reason: "timeout" }),
    });
    const adapter = createRobotAdapter({ transport, freshnessPolicy: () => "fresh" });
    await adapter.connect();
    expect(await adapter.sendTarget(target())).toEqual({ ok: false, reason: "transport-failed" });
    expect(await adapter.stop()).toEqual({ ok: false, reason: "timeout" });
    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(transport.stop).toHaveBeenCalledTimes(1);
  });

  it("rejects targets during disconnect and preserves stop event order", async () => {
    const cleanup = deferred<TransportDisconnectResult>();
    const events: unknown[] = [];
    const transport = transportWith({ disconnect: vi.fn(() => cleanup.promise) });
    const adapter = createRobotAdapter({ transport, freshnessPolicy: () => "fresh", observer: (event) => events.push(event) });
    await adapter.connect();
    const disconnecting = adapter.disconnect();
    await Promise.resolve();
    const rejectedDuringDisconnect = adapter.sendTarget(target(22));
    expect(transport.send).not.toHaveBeenCalled();
    cleanup.resolve({ ok: true, status: "disconnected" });
    await disconnecting;
    await expect(rejectedDuringDisconnect).resolves.toEqual({ ok: false, reason: "not-connected" });

    await adapter.connect();
    const stop = adapter.stop();
    await stop;
    expect(events.slice(-2)).toEqual([
      { type: "stop-requested" },
      { type: "stop-accepted" },
    ]);
    expect(events.some((event) => (event as { type: string }).type === "target-transported")).toBe(false);
    expect(events.some((event) => (event as { type: string }).type === "target-executed")).toBe(false);
  });

  it("waits for lifecycle operations before evaluating stop", async () => {
    const connection = deferred<TransportConnectResult>();
    const cleanup = deferred<TransportDisconnectResult>();
    const transport = transportWith({ connect: vi.fn(() => connection.promise), disconnect: vi.fn(() => cleanup.promise) });
    const adapter = createRobotAdapter({ transport, freshnessPolicy: () => "fresh" });

    const connecting = adapter.connect();
    const stoppingAfterConnect = adapter.stop();
    connection.resolve({ ok: true, status: "connected" });
    await connecting;
    await expect(stoppingAfterConnect).resolves.toEqual({ ok: true, status: "stop-request-accepted" });

    const disconnecting = adapter.disconnect();
    const stoppingAfterDisconnect = adapter.stop();
    cleanup.resolve({ ok: true, status: "disconnected" });
    await disconnecting;
    await expect(stoppingAfterDisconnect).resolves.toEqual({ ok: false, reason: "not-connected" });
  });

  it("issues a new stop request after the previous one completes", async () => {
    const transport = transportWith();
    const adapter = createRobotAdapter({ transport, freshnessPolicy: () => "fresh" });
    await adapter.connect();
    await adapter.stop();
    await adapter.stop();
    expect(transport.stop).toHaveBeenCalledTimes(2);
    expect(adapter.status()).toBe("connected");
  });

  it("serializes send before a later disconnect", async () => {
    const order: string[] = [];
    const transport = transportWith({
      send: vi.fn(() => { order.push("send"); return { ok: true, sequence: 1 } satisfies TransportTargetResult; }),
      disconnect: vi.fn(async () => { order.push("disconnect"); return { ok: true, status: "disconnected" } satisfies TransportDisconnectResult; }),
    });
    const adapter = createRobotAdapter({ transport, freshnessPolicy: () => "fresh" });
    await adapter.connect();
    const sending = adapter.sendTarget(target());
    const disconnecting = adapter.disconnect();
    await Promise.resolve();
    expect(order).toEqual(["send"]);
    expect(adapter.status()).toBe("connected");
    await sending;
    await disconnecting;
    expect(order).toEqual(["send", "disconnect"]);

  });

  it("coalesces concurrent connect, disconnect, and stop calls", async () => {
    const transport = transportWith();
    const adapter = createRobotAdapter({ transport, freshnessPolicy: () => "fresh" });

    expect(await Promise.all([adapter.connect(), adapter.connect()])).toEqual([
      { ok: true, status: "connected" },
      { ok: true, status: "connected" },
    ]);
    expect(transport.connect).toHaveBeenCalledTimes(1);

    expect(await Promise.all([adapter.stop(), adapter.stop()])).toEqual([
      { ok: true, status: "stop-request-accepted" },
      { ok: true, status: "stop-request-accepted" },
    ]);
    expect(transport.stop).toHaveBeenCalledTimes(1);

    expect(await Promise.all([adapter.disconnect(), adapter.disconnect()])).toEqual([
      { ok: true, status: "disconnected" },
      { ok: true, status: "disconnected" },
    ]);
    expect(transport.disconnect).toHaveBeenCalledTimes(1);
  });
});
