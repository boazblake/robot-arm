import m from "mithril";
import "./so101-manual-control.css";
import { logEvent } from "../../observability/effect-logger";

type JointName = "shoulder_pan" | "shoulder_lift" | "elbow_flex" | "wrist_flex" | "wrist_roll" | "gripper";
type BridgeState = Readonly<{
  readonly type: "state";
  readonly connected: boolean;
  readonly enabled: boolean;
  readonly live: boolean;
  readonly joints: readonly JointName[];
  readonly limits: Readonly<Record<JointName, readonly [number, number]>>;
  readonly calibration_limits: Readonly<Record<JointName, readonly [number, number]>>;
  readonly positions: Readonly<Record<JointName, number>>;
}>;
type BridgeError = Readonly<{ readonly type: "error"; readonly message: string }>;
type ComponentState = { socket: WebSocket | null; bridge: BridgeState | null; error: string | null; positions: Record<JointName, number> };

const JOINT_LABELS: Readonly<Record<JointName, string>> = {
  shoulder_pan: "Shoulder pan",
  shoulder_lift: "Shoulder lift",
  elbow_flex: "Elbow flex",
  wrist_flex: "Wrist flex",
  wrist_roll: "Wrist roll",
  gripper: "Gripper",
};
const JOINTS: readonly JointName[] = Object.keys(JOINT_LABELS) as JointName[];
const bridgeUrl = (): string => import.meta.env.VITE_SO101_BRIDGE_URL ?? "ws://127.0.0.1:8765";
const initialPositions = (): Record<JointName, number> => Object.fromEntries(JOINTS.map((joint) => [joint, 0])) as Record<JointName, number>;

const send = (state: ComponentState, message: Readonly<Record<string, unknown>>): void => {
  if (state.socket?.readyState === WebSocket.OPEN) state.socket.send(JSON.stringify(message));
};
const parseState = (value: unknown): BridgeState | null => {
  if (typeof value !== "object" || value === null || (value as { type?: unknown }).type !== "state") return null;
  return value as BridgeState;
};
const parseError = (value: unknown): BridgeError | null => {
  if (typeof value !== "object" || value === null || (value as { type?: unknown }).type !== "error") return null;
  return value as BridgeError;
};

const state: ComponentState = { socket: null, bridge: null, error: null, positions: initialPositions() };
let heartbeatTimer: number | null = null;
const stopHeartbeat = (): void => {
  if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
  heartbeatTimer = null;
};
const startHeartbeat = (): void => {
  if (heartbeatTimer !== null) return;
  heartbeatTimer = window.setInterval(() => {
    if (state.bridge?.enabled) send(state, { type: "set-target", positions: state.positions });
  }, 100);
};
const syncHeartbeat = (): void => {
  if (state.bridge?.enabled) startHeartbeat();
  else stopHeartbeat();
};
const ManualControl: m.Component = {
  view: () => {
    const connect = (): void => {
      logEvent("bridge-connect-requested", { url: bridgeUrl() });
      state.socket?.close();
      const socket = new WebSocket(bridgeUrl());
      state.socket = socket;
      socket.onopen = () => logEvent("bridge-websocket-open");
      socket.onmessage = (event) => {
        const value: unknown = JSON.parse(String(event.data));
        const next = parseState(value);
        const error = parseError(value);
        if (next !== null) {
          state.bridge = next;
          state.positions = { ...state.positions, ...next.positions };
          state.error = null;
          syncHeartbeat();
          logEvent("bridge-state", { connected: next.connected, enabled: next.enabled, live: next.live });
        } else if (error !== null) {
          state.error = error.message;
          logEvent("bridge-error", { message: error.message });
        }
        m.redraw();
      };
      socket.onerror = () => { state.error = "Bridge unavailable"; logEvent("bridge-websocket-error"); m.redraw(); };
      socket.onclose = () => { state.bridge = null; stopHeartbeat(); logEvent("bridge-websocket-closed"); m.redraw(); };
    };
    const setPosition = (joint: JointName, raw: string): void => {
      state.positions = { ...state.positions, [joint]: Number(raw) };
      logEvent("joint-slider-changed", { joint, value: state.positions[joint] });
      if (state.bridge?.enabled) send(state, { type: "set-target", positions: state.positions });
    };
    const setCap = (joint: JointName, side: "min" | "max"): void => {
      if (state.bridge === null || state.bridge.enabled) return;
      const current = state.positions[joint];
      const caps = Object.fromEntries(JOINTS.map((name) => [name, [...state.bridge!.limits[name]]])) as Record<JointName, number[]>;
      if (side === "min") caps[joint][0] = current;
      else caps[joint][1] = current;
      if (caps[joint][0] >= caps[joint][1]) return;
      logEvent("joint-cap-changed", { joint, side, value: current });
      send(state, { type: "set-caps", caps });
    };
    const resetCaps = (): void => {
      if (state.bridge === null || state.bridge.enabled) return;
      logEvent("joint-caps-reset");
      send(state, { type: "set-caps", caps: state.bridge.calibration_limits });
    };
    const bridge = state.bridge;
    return m("section.so101-manual-control", [
      m("header", [m("strong", "SO-101 manual control"), m("small", bridge?.live ? "LIVE bridge" : "Dry-run bridge")]),
      m("p.so101-safety", "Set caps while disabled. Enable control only when the arm is clear."),
      m("div.so101-actions", [
        m("button", { onclick: connect }, "Connect bridge"),
        m("button", { disabled: bridge === null, onclick: () => { logEvent("robot-connect-requested"); send(state, { type: "connect" }); } }, "Connect robot"),
        m("button", { disabled: bridge === null || !bridge.connected, onclick: () => { const type = bridge?.enabled ? "disable" : "enable"; logEvent(type === "enable" ? "control-enable-requested" : "control-disable-requested"); send(state, { type }); } }, bridge?.enabled ? "Disable control" : "Enable control"),
        m("button.so101-stop", { disabled: bridge === null, onclick: () => { logEvent("stop-requested"); send(state, { type: "stop" }); } }, "STOP"),
      ]),
      state.error === null ? null : m("p.so101-error", state.error),
      bridge === null ? m("p", "Start the bridge, then connect.") : m("div.so101-joints", [
        JOINTS.map((joint) => {
          const bounds = bridge.limits[joint] ?? [-180, 180];
          return m("article.so101-joint", [
            m("div.so101-joint-heading", [m("strong", JOINT_LABELS[joint]), m("output", state.positions[joint].toFixed(1))]),
            m("input", { type: "range", min: bounds[0], max: bounds[1], step: 0.1, value: state.positions[joint], disabled: !bridge.enabled, oninput: (event: Event) => setPosition(joint, (event.target as HTMLInputElement).value) }),
            m("small", `cap ${bounds[0].toFixed(1)} … ${bounds[1].toFixed(1)}`),
            m("div.so101-cap-actions", [
              m("button", { disabled: bridge.enabled, onclick: () => setCap(joint, "min") }, "Set min here"),
              m("button", { disabled: bridge.enabled, onclick: () => setCap(joint, "max") }, "Set max here"),
            ]),
          ]);
        }),
        m("button", { disabled: bridge.enabled, onclick: resetCaps }, "Reset all caps"),
      ]),
    ]);
  },
};
export default ManualControl;
