import type { RobotTarget } from "../model/robot-target";

export type AdapterStatus = "disconnected" | "connected" | "stopped";

export type AdapterConnectionResult =
  | Readonly<{ ok: true; status: "connected" }>
  | Readonly<{ ok: false; reason: "transport-failed" | "timeout" }>;

export type AdapterResult =
  | Readonly<{ ok: true; status: "disconnected" | "stopped" }>
  | Readonly<{ ok: false; reason: "transport-failed" | "timeout" | "robot-rejected" }>;

export type TargetFreshness = "fresh" | "stale";
export type TargetFreshnessPolicy = (target: RobotTarget) => TargetFreshness;

export type SendTargetResult =
  | Readonly<{ ok: true; status: "accepted" }>
  | Readonly<{
      ok: false;
      reason:
        | "not-connected"
        | "target-invalid"
        | "target-stale"
        | "transport-failed"
        | "timeout"
        | "robot-rejected"
        | "adapter-stopped"
        | "unsupported-intent";
    }>;

export type StopResult =
  | Readonly<{ ok: true; status: "stop-request-accepted" | "stopped" }>
  | Readonly<{ ok: false; reason: "transport-failed" | "timeout" | "robot-rejected" }>;

export type RobotAdapter = Readonly<{
  connect: () => Promise<AdapterConnectionResult>;
  disconnect: () => Promise<AdapterResult>;
  sendTarget: (target: unknown) => Promise<SendTargetResult>;
  stop: () => Promise<StopResult>;
  status: () => AdapterStatus;
}>;
