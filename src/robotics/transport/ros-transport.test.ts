import { describe, expect, it, vi } from "vitest";
import type { RosBridgeClient, RosBridgeConnectionLossReason } from "./rosbridge-client";
import { createRosTransport } from "./ros-transport";

type ExampleOutboundMessage = Readonly<{ x: number; y: number }>;
type ExampleInboundMessage = Readonly<{ value: string }>;

type FakeRosBridge = RosBridgeClient & {
  readonly published: Array<Readonly<{ channel: string; message: unknown }>>;
  readonly disconnectCalls: number;
  readonly connectResult: (result: "success" | "failure") => void;
  readonly publishResult: (result: "success" | "failure") => void;
  readonly loseConnection: (reason: RosBridgeConnectionLossReason) => void;
  readonly deliver: (index: number, payload: unknown) => void;
  readonly deliverLate: (index: number, payload: unknown) => void;
};

const fakeRosBridge = (): FakeRosBridge => {
  let connectOutcome: "success" | "failure" = "success";
  let publishOutcome: "success" | "failure" = "success";
  let connectionLost: ((reason: RosBridgeConnectionLossReason) => void) | undefined;
  const subscriptions: Array<{ channel: string; listener: (payload: unknown) => void; active: boolean }> = [];
  const published: Array<Readonly<{ channel: string; message: unknown }>> = [];
  let disconnectCalls = 0;
  const client: FakeRosBridge = {
    published,
    get disconnectCalls() { return disconnectCalls; },
    connect: () => Promise.resolve(connectOutcome === "success" ? { ok: true } : { ok: false, reason: "connection-failed" }),
    disconnect: () => {
      disconnectCalls += 1;
      return Promise.resolve({ ok: true });
    },
    publish: (channel, message) => {
      if (publishOutcome === "failure") return { ok: false, reason: "publish-failed" };
      published.push({ channel, message });
      return { ok: true };
    },
    subscribe: (channel, listener) => {
      const subscription = { channel, listener, active: true };
      subscriptions.push(subscription);
      return () => { subscription.active = false; };
    },
    onConnectionLost: (listener) => {
      connectionLost = listener;
      return () => { connectionLost = undefined; };
    },
    connectResult: (result) => { connectOutcome = result; },
    publishResult: (result) => { publishOutcome = result; },
    loseConnection: (reason) => { connectionLost?.(reason); },
    deliver: (index, payload) => {
      const subscription = subscriptions[index];
      if (subscription?.active) subscription.listener(payload);
    },
    deliverLate: (index, payload) => subscriptions[index]?.listener(payload),
  };
  return client;
};

const validator = (input: unknown) =>
  typeof input === "object" && input !== null && "value" in input && typeof input.value === "string"
    ? { ok: true as const, value: input as ExampleInboundMessage }
    : { ok: false as const, reason: "invalid-payload" as const };

const connect = async (transport: ReturnType<typeof createRosTransport>): Promise<void> => {
  await transport.connect();
};

describe("RosTransport", () => {
  it("starts disconnected and connects successfully", async () => {
    const client = fakeRosBridge();
    const transport = createRosTransport(client);
    expect(transport.status()).toBe("disconnected");
    await expect(transport.connect()).resolves.toEqual({ ok: true });
    expect(transport.status()).toBe("connected");
  });

  it("returns a typed failure when connection fails", async () => {
    const client = fakeRosBridge();
    client.connectResult("failure");
    const transport = createRosTransport(client);
    await expect(transport.connect()).resolves.toEqual({ ok: false, reason: "connection-failed" });
    expect(transport.status()).toBe("disconnected");
  });

  it("disconnects and makes repeated disconnect safe", async () => {
    const client = fakeRosBridge();
    const transport = createRosTransport(client);
    await connect(transport);
    await expect(transport.disconnect()).resolves.toEqual({ ok: true });
    await expect(transport.disconnect()).resolves.toEqual({ ok: true });
    expect(client.disconnectCalls).toBe(1);
    expect(transport.status()).toBe("disconnected");
  });

  it("publishes the exact channel and message without queuing while disconnected", async () => {
    const client = fakeRosBridge();
    const transport = createRosTransport(client);
    const message: ExampleOutboundMessage = { x: 1, y: 2 };
    expect(transport.publish("/test/outbound", message)).toEqual({ ok: false, reason: "not-connected" });
    await connect(transport);
    expect(transport.publish("/test/outbound", message)).toEqual({ ok: true });
    expect(client.published).toEqual([{ channel: "/test/outbound", message }]);
  });

  it("does not queue after a publish failure", async () => {
    const client = fakeRosBridge();
    client.publishResult("failure");
    const transport = createRosTransport(client);
    await connect(transport);
    expect(transport.publish("/test/outbound", { x: 1 })).toEqual({ ok: false, reason: "publish-failed" });
    expect(client.published).toEqual([]);
  });

  it("delivers valid inbound data and rejects invalid data with an event", async () => {
    const client = fakeRosBridge();
    const transport = createRosTransport(client);
    const listener = vi.fn();
    const events: unknown[] = [];
    transport.onEvent((event) => events.push(event));
    await connect(transport);
    transport.subscribe("/test/inbound", validator, listener);
    client.deliver(0, { value: "ready" });
    client.deliver(0, { value: 42 });
    expect(listener).toHaveBeenCalledWith({ value: "ready" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(events).toEqual([{ type: "invalid-message", channel: "/test/inbound" }]);
  });

  it("reports unexpected connection loss once and becomes disconnected", async () => {
    const client = fakeRosBridge();
    const transport = createRosTransport(client);
    const events: unknown[] = [];
    transport.onEvent((event) => events.push(event));
    await connect(transport);
    client.loseConnection("network");
    client.loseConnection("network");
    expect(transport.status()).toBe("disconnected");
    expect(events).toEqual([{ type: "connection-lost", reason: "network" }]);
  });

  it("ignores callbacks from an old connection", async () => {
    const client = fakeRosBridge();
    const transport = createRosTransport(client);
    const listener = vi.fn();
    await connect(transport);
    transport.subscribe("/test/inbound", validator, listener);
    client.loseConnection("server");
    await connect(transport);
    client.deliverLate(0, { value: "stale" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not replay old outbound messages after reconnect", async () => {
    const client = fakeRosBridge();
    const transport = createRosTransport(client);
    await connect(transport);
    transport.publish("/test/outbound", { x: 1 });
    client.loseConnection("network");
    await connect(transport);
    expect(client.published).toEqual([{ channel: "/test/outbound", message: { x: 1 } }]);
  });

  it("supports idempotent subscription and event unsubscribe", async () => {
    const client = fakeRosBridge();
    const transport = createRosTransport(client);
    const listener = vi.fn();
    const eventListener = vi.fn();
    await connect(transport);
    const unsubscribe = transport.subscribe("/test/inbound", validator, listener);
    const unsubscribeEvent = transport.onEvent(eventListener);
    unsubscribe();
    unsubscribe();
    unsubscribeEvent();
    unsubscribeEvent();
    client.deliver(0, { value: "ignored" });
    client.deliver(0, { value: 42 });
    expect(listener).not.toHaveBeenCalled();
    expect(eventListener).not.toHaveBeenCalled();
  });

  it("isolates observer failures from transport state", async () => {
    const client = fakeRosBridge();
    const transport = createRosTransport(client);
    transport.onEvent(() => { throw new Error("observer failure"); });
    await connect(transport);
    client.loseConnection("protocol-error");
    expect(transport.status()).toBe("disconnected");
    await expect(transport.connect()).resolves.toEqual({ ok: true });
  });
});
