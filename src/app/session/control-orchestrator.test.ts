import { describe, expect, it, vi } from "vitest";
import { createRobotTarget } from "../../robotics/model/robot-target";
import { createControlOrchestrator } from "./control-orchestrator";

const readiness = { trackingValid: true, inputFresh: true, calibrated: true } as const;

const target = () => {
  const result = createRobotTarget({
    side: "left",
    position: { x: 0, y: 0, z: 0 },
    sourceTimestamp: 1,
    sequence: 0,
  });
  if (!result.ok) throw new Error("expected valid target");
  return result.target;
};

describe("control orchestrator", () => {
  it("serializes target submission before emergency stop and blocks later targets", async () => {
    const calls: string[] = [];
    const adapter = {
      sendTarget: vi.fn(async () => { calls.push("send"); }),
      stop: vi.fn(async () => { calls.push("stop"); }),
    };
    const orchestrator = createControlOrchestrator(adapter);

    await orchestrator.enable("left", readiness);
    const first = orchestrator.submitTarget(target());
    const stopped = orchestrator.requestEmergencyStop();
    const second = orchestrator.submitTarget(target());

    await expect(first).resolves.toBe(true);
    await expect(stopped).resolves.toEqual({ ok: true });
    await expect(second).resolves.toBe(false);
    expect(calls).toEqual(["send", "stop"]);
    expect(orchestrator.getState()).toEqual({ left: "stopped", right: "stopped" });
  });

  it("latches local stop when the adapter stop fails", async () => {
    const adapter = {
      sendTarget: vi.fn(async () => undefined),
      stop: vi.fn(async () => { throw new Error("unavailable"); }),
    };
    const orchestrator = createControlOrchestrator(adapter, { left: "enabled", right: "disabled" });

    await expect(orchestrator.requestEmergencyStop()).resolves.toEqual({
      ok: false,
      reason: "adapter-stop-failed",
    });
    expect(orchestrator.getState()).toEqual({ left: "stopped", right: "stopped" });
    await expect(orchestrator.submitTarget(target())).resolves.toBe(false);
  });

  it("does not allow clearing stop to enable an arm", async () => {
    const adapter = {
      sendTarget: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
    };
    const orchestrator = createControlOrchestrator(adapter, { left: "stopped", right: "stopped" });

    await expect(orchestrator.clearEmergencyStop()).resolves.toMatchObject({
      ok: true,
      state: { left: "disabled", right: "disabled" },
    });
    await expect(orchestrator.submitTarget(target())).resolves.toBe(false);
  });

  it("globally disables both arms when one arm becomes lost", async () => {
    const adapter = {
      sendTarget: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
    };
    const orchestrator = createControlOrchestrator(adapter, { left: "enabled", right: "enabled" });

    await orchestrator.applyFreshness("left", true, 1000);
    await orchestrator.applyFreshness("left", false, 2001);
    expect(orchestrator.getState()).toEqual({ left: "disabled", right: "disabled" });
    expect(adapter.stop).toHaveBeenCalledTimes(1);
  });
});
