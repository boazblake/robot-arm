import { describe, expect, it, vi } from "vitest";
import { createClrRobotAdapter, type ClrAdapterConfiguration } from "./clr-robot-adapter";
import type { RosTransport } from "../../transport/ros-transport";
import { createRobotTarget } from "../../model/robot-target";

const configuration: ClrAdapterConfiguration = {
  targetChannel: "/liftmate/target",
  targetMessageType: "geometry_msgs/Point",
  stopChannel: "/liftmate/stop",
  stopMessageType: "std_msgs/Bool",
  stopMessage: { data: true },
  capabilities: { orientation: false, gripper: false },
};
const target = createRobotTarget({
  side: "left",
  position: { x: 0.1, y: 0.2, z: 0.3 },
  sourceTimestamp: 10,
  sequence: 1,
});
if (!target.ok) throw new Error("test target must be valid");

const transport = (overrides: Partial<RosTransport> = {}): RosTransport => {
  const base: RosTransport = {
    connect: vi.fn(async () => ({ ok: true as const })),
    disconnect: vi.fn(async () => ({ ok: true as const })),
    publish: vi.fn(() => ({ ok: true as const })),
    subscribe: vi.fn(() => () => undefined),
    onEvent: vi.fn(() => () => undefined),
    status: vi.fn(() => "disconnected" as const),
  };
  return { ...base, ...overrides };
};

describe("ClrRobotAdapter", () => {
  it("implements RobotAdapter through injected RosTransport and mapper", async () => {
    const publish = vi.fn(() => ({ ok: true }));
    const ros = transport({
      status: (() => "connected" as const) as RosTransport["status"],
      publish: publish as RosTransport["publish"],
    });
    const adapter = createClrRobotAdapter({
      transport: ros,
      configuration,
      freshnessPolicy: () => "fresh",
      mapper: (value) => ({ ok: true, command: { x: value.position.x } }),
    });

    expect(await adapter.sendTarget(target.target)).toEqual({ ok: true, status: "accepted" });
    expect(publish).toHaveBeenCalledWith("/liftmate/target", { x: 0.1 }, "geometry_msgs/Point");
  });

  it("reuses canonical validation and rejects unsupported intent", async () => {
    const publish = vi.fn(() => ({ ok: true }));
    const ros = transport({
      status: (() => "connected" as const) as RosTransport["status"],
      publish: publish as RosTransport["publish"],
    });
    const adapter = createClrRobotAdapter({
      transport: ros,
      configuration,
      freshnessPolicy: () => "fresh",
      mapper: vi.fn(() => ({ ok: true as const, command: {} })),
    });
    const malformed = { ...target.target, position: { x: 2, y: 0, z: 0 } };
    expect(await adapter.sendTarget(malformed as never)).toEqual({ ok: false, reason: "target-invalid" });
    expect(await adapter.sendTarget({ ...target.target, gripper: "open" })).toEqual({ ok: false, reason: "unsupported-intent" });
    expect(publish).not.toHaveBeenCalled();
  });

  it("maps mapping and transport failures", async () => {
    const ros = transport({
      status: (() => "connected" as const) as RosTransport["status"],
      publish: (() => ({ ok: false as const, reason: "publish-failed" as const })) as RosTransport["publish"],
    });
    const adapter = createClrRobotAdapter({
      transport: ros,
      configuration,
      freshnessPolicy: () => "fresh",
      mapper: () => ({ ok: false, reason: "translation-failed" }),
    });
    expect(await adapter.sendTarget(target.target)).toEqual({ ok: false, reason: "translation-failed" });
  });
});
