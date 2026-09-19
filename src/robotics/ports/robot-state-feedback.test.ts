import { describe, expect, it, vi } from "vitest";
import { createRobotState } from "../model/robot-state";
import { createRobotStateFeedback } from "./robot-state-feedback";

describe("RobotStateFeedback", () => {
  it("publishes validated actual state without coupling to target intent", () => {
    const result = createRobotState({ observedAt: 10, arms: { left: null, right: { position: { x: 2, y: 3, z: 4 } } } });
    if (!result.ok) throw new Error("state fixture invalid");
    const feedback = createRobotStateFeedback();
    const observer = vi.fn();
    feedback.onState(observer);
    feedback.publish(result.state);
    expect(observer).toHaveBeenCalledWith(result.state);
  });

  it("isolates observers and supports unsubscribe", () => {
    const result = createRobotState({ observedAt: 10, arms: { left: null, right: null } });
    if (!result.ok) throw new Error("state fixture invalid");
    const feedback = createRobotStateFeedback();
    const failing = vi.fn(() => { throw new Error("observer failure"); });
    const observer = vi.fn();
    feedback.onState(failing);
    const unsubscribe = feedback.onState(observer);
    feedback.publish(result.state);
    unsubscribe();
    feedback.publish(result.state);
    expect(failing).toHaveBeenCalledTimes(2);
    expect(observer).toHaveBeenCalledTimes(1);
  });
});
