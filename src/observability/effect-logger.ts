import { Effect } from "effect";

type LogFields = Readonly<Record<string, unknown>>;
type LogEvent = (event: string, fields?: LogFields) => void;

export const logEvent: LogEvent = (event, fields = {}) => {
  Effect.runFork(Effect.logInfo({ component: "robot-arm-ui", event, ...fields }));
};
