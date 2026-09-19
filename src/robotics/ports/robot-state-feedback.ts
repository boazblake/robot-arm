import type { RobotState } from "../model/robot-state";

export type RobotStateObserver = (state: RobotState) => void;
export type RobotStateFeedback = Readonly<{
  readonly onState: (observer: RobotStateObserver) => () => void;
  readonly publish: (state: RobotState) => void;
}>;

export const createRobotStateFeedback = (): RobotStateFeedback => {
  const observers = new Set<RobotStateObserver>();
  const onState = (observer: RobotStateObserver): (() => void) => {
    observers.add(observer);
    return () => { observers.delete(observer); };
  };
  const publish = (state: RobotState): void => {
    for (const observer of observers) {
      try { observer(state); } catch { /* feedback observers are best effort */ }
    }
  };
  return Object.freeze({ onState, publish });
};
