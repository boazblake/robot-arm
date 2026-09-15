import type { RobotTarget } from "../model/robot-target";

export type AdapterStatus = "disconnected" | "connecting" | "connected" | "disconnecting";
export type AdapterConnectionFailure = "transport-failed" | "timeout";
export type AdapterLifecycleFailure = "transport-failed" | "timeout" | "robot-rejected";
export type AdapterStopFailure = "transport-failed" | "timeout" | "robot-rejected";
export type SendTargetFailure =
  | "not-connected"
  | "target-invalid"
  | "target-stale"
  | "transport-failed"
  | "timeout"
  | "robot-rejected"
  | "unsupported-intent";

export type ConnectResult =
  | Readonly<{ ok: true; status: "connected" }>
  | Readonly<{ ok: false; reason: AdapterConnectionFailure }>;

export type DisconnectResult =
  | Readonly<{ ok: true; status: "disconnected" }>
  | Readonly<{ ok: false; reason: AdapterLifecycleFailure }>;

export type StopResult =
  | Readonly<{ ok: true; status: "stop-request-accepted" }>
  | Readonly<{ ok: false; reason: AdapterStopFailure }>;

export type SendTargetResult =
  | Readonly<{ ok: true; status: "accepted" }>
  | Readonly<{ ok: false; reason: SendTargetFailure }>;

export type RobotAdapterCapabilities = Readonly<{
  readonly position: true;
  readonly orientation: boolean;
  readonly gripper: boolean;
}>;

export type TargetFreshnessPolicy = (target: RobotTarget) => "fresh" | "stale";

export type RobotAdapterEvent =
  | Readonly<{ type: "connected" | "disconnected" }>
  | Readonly<{ type: "target-accepted"; sequence: number }>
  | Readonly<{ type: "target-rejected"; sequence?: number; reason: SendTargetFailure }>
  | Readonly<{ type: "stop-requested" | "stop-accepted" }>
  | Readonly<{ type: "stop-failed"; reason: AdapterStopFailure }>;

export type RobotAdapter = Readonly<{
  readonly connect: () => Promise<ConnectResult>;
  readonly disconnect: () => Promise<DisconnectResult>;
  readonly sendTarget: (target: RobotTarget) => Promise<SendTargetResult>;
  readonly stop: () => Promise<StopResult>;
  readonly status: () => AdapterStatus;
  readonly capabilities: () => RobotAdapterCapabilities;
}>;
