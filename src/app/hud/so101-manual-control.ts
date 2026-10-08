import m from "mithril";
import "./so101-manual-control.css";
import { logEvent } from "../../observability/effect-logger";
import { captureCap as captureCapValue, updateCap as updateCapValue } from "./so101-manual-control-policy";

type JointName = "shoulder_pan" | "shoulder_lift" | "elbow_flex" | "wrist_flex" | "wrist_roll" | "gripper";
type JoystickGroup = Readonly<{
  readonly name: string;
  readonly axes: readonly [JointName] | readonly [JointName, JointName];
  readonly zoned?: JointName;
  readonly invertHorizontal?: boolean;
}>;
type ManualView = "setup" | "preview" | "control";
type CapEnd = "min" | "max";

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
type ComponentState = {
  socket: WebSocket | null;
  bridge: BridgeState | null;
  error: string | null;
  view: ManualView;
  positions: Record<JointName, number>;
  previewPositions: Record<JointName, number>;
  joystickRatios: Record<string, readonly [number, number]>;
  joystickBases: Record<string, Record<JointName, number>>;
  activeJoystick: string | null;
};

const JOINT_LABELS: Readonly<Record<JointName, string>> = {
  shoulder_pan: "Shoulder pan",
  shoulder_lift: "Shoulder lift",
  elbow_flex: "Elbow flex",
  wrist_flex: "Wrist flex",
  wrist_roll: "Wrist roll",
  gripper: "Gripper",
};
const JOINTS: readonly JointName[] = Object.keys(JOINT_LABELS) as JointName[];
const JOYSTICK_GROUPS: readonly JoystickGroup[] = [
  { name: "Shoulder + elbow", axes: ["shoulder_lift", "shoulder_pan"], zoned: "elbow_flex" },
  { name: "Wrist", axes: ["wrist_flex", "wrist_roll"], invertHorizontal: true },
];
const bridgeUrl = (): string => import.meta.env.VITE_SO101_BRIDGE_URL ?? "ws://127.0.0.1:8765";
const initialPositions = (): Record<JointName, number> =>
  Object.fromEntries(JOINTS.map((joint) => [joint, 0])) as Record<JointName, number>;

const state: ComponentState = {
  socket: null,
  bridge: null,
  error: null,
  view: "setup",
  positions: initialPositions(),
  previewPositions: initialPositions(),
  joystickRatios: {},
  joystickBases: {},
  activeJoystick: null,
};
let heartbeatTimer: number | null = null;

const send = (message: Readonly<Record<string, unknown>>): void => {
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
const stopHeartbeat = (): void => {
  if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
  heartbeatTimer = null;
};
const startHeartbeat = (): void => {
  if (heartbeatTimer !== null) return;
  heartbeatTimer = window.setInterval(() => {
    if (state.bridge?.enabled && state.view === "control") send({ type: "set-target", positions: state.positions });
  }, 100);
};
const syncHeartbeat = (): void => {
  if (state.bridge?.enabled) startHeartbeat();
  else stopHeartbeat();
};
const clamp = (value: number, range: readonly [number, number]): number =>
  Math.min(range[1], Math.max(range[0], value));
const copyCaps = (bridge: BridgeState): Record<JointName, [number, number]> =>
  Object.fromEntries(JOINTS.map((joint) => [joint, [...bridge.limits[joint]]])) as Record<JointName, [number, number]>;
const displayedPositions = (): Record<JointName, number> =>
  state.view === "preview" ? state.previewPositions : state.positions;
const setDisplayedPosition = (joint: JointName, value: number): void => {
  if (state.view === "preview") state.previewPositions = { ...state.previewPositions, [joint]: value };
  else state.positions = { ...state.positions, [joint]: value };
};
const setView = (view: ManualView): void => {
  state.view = view;
  if (view === "preview") state.previewPositions = { ...state.positions };
  if (view !== "control") {
    state.activeJoystick = null;
    state.joystickBases = {};
    state.joystickRatios = {};
  }
};

const connectBridge = (): void => {
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
      if (state.activeJoystick === null) state.positions = { ...state.positions, ...next.positions };
      if (!next.connected) setView("setup");
      else if (next.enabled) setView("control");
      else if (state.view === "control") setView("preview");
      state.error = null;
      syncHeartbeat();
      logEvent("bridge-state", { connected: next.connected, enabled: next.enabled, live: next.live });
    } else if (error !== null) {
      state.error = error.message;
      if (error.message.includes("disconnected") || error.message.includes("control is disabled")) {
        state.bridge = state.bridge === null ? null : { ...state.bridge, connected: false, enabled: false };
        setView("setup");
        stopHeartbeat();
      }
      logEvent("bridge-error", { message: error.message });
    }
    m.redraw();
  };
  socket.onerror = () => { state.error = "Bridge unavailable"; logEvent("bridge-websocket-error"); m.redraw(); };
  socket.onclose = () => { state.bridge = null; setView("setup"); stopHeartbeat(); logEvent("bridge-websocket-closed"); m.redraw(); };
};

const setPosition = (joint: JointName, raw: string): void => {
  const bridge = state.bridge;
  if (bridge === null) return;
  const value = clamp(Number(raw), bridge.limits[joint]);
  setDisplayedPosition(joint, value);
  logEvent("joint-slider-changed", { joint, value });
  if (bridge.enabled && state.view === "control") send({ type: "set-target", positions: state.positions });
};
const updateCap = (joint: JointName, end: CapEnd, raw: string): void => {
  const bridge = state.bridge;
  if (bridge === null || !bridge.connected || bridge.enabled) return;
  const fullRange = bridge.calibration_limits[joint];
  const caps = copyCaps(bridge);
  const value = Number(raw);
  const result = updateCapValue(caps[joint], fullRange, end, value);
  if (!result.ok) {
    state.error = result.reason === "empty-range" ? `${JOINT_LABELS[joint]} caps must leave a usable range` : `${JOINT_LABELS[joint]} cap must be numeric`;
    return;
  }
  caps[joint] = result.caps;
  state.bridge = { ...bridge, limits: caps };
  state.error = null;
  logEvent("joint-cap-changed", { joint, end, value });
  send({ type: "set-caps", caps });
  m.redraw();
};
const captureCap = (joint: JointName, end: CapEnd): void => {
  const bridge = state.bridge;
  if (bridge === null || !bridge.connected || bridge.enabled) return;
  const current = displayedPositions()[joint];
  const caps = copyCaps(bridge);
  const result = captureCapValue(caps[joint], current, end);
  if (!result.ok) {
    state.error = end === "min" ? `${JOINT_LABELS[joint]} low capture must be below its high cap` : `${JOINT_LABELS[joint]} high capture must be above its low cap`;
    return;
  }
  caps[joint] = result.caps;
  state.bridge = { ...bridge, limits: caps };
  state.error = null;
  logEvent("joint-cap-captured", { joint, end, value: current });
  send({ type: "set-caps", caps });
  m.redraw();
};
const refreshArmPosition = (): void => {
  if (state.bridge === null || !state.bridge.connected || state.bridge.enabled) return;
  state.error = null;
  logEvent("bridge-position-refresh-requested");
  send({ type: "refresh" });
};
const resetCaps = (): void => {
  if (state.bridge === null || !state.bridge.connected || state.bridge.enabled) return;
  logEvent("joint-caps-reset");
  state.error = null;
  send({ type: "set-caps", caps: state.bridge.calibration_limits });
};

const applyJoystickTarget = (group: JoystickGroup): void => {
  const bridge = state.bridge;
  const base = state.joystickBases[group.name];
  if (bridge === null || base === undefined || (state.view === "control" && !bridge.enabled)) return;
  const [xRatio, yRatio] = state.joystickRatios[group.name] ?? [0, 0];
  const [verticalAxis, horizontalAxis] = group.axes;
  const next = { ...displayedPositions() };
  const setOffset = (joint: JointName, ratio: number): void => {
    const caps = bridge.limits[joint];
    const halfRange = (caps[1] - caps[0]) / 2;
    next[joint] = clamp(base[joint] + ratio * halfRange, caps);
  };
  if (group.zoned !== undefined) {
    const radius = Math.min(1, Math.hypot(xRatio, yRatio));
    const innerZone = 0.5;
    if (radius <= innerZone) setOffset(verticalAxis, -yRatio / innerZone);
    else setOffset(group.zoned, yRatio === 0 ? 0 : -Math.sign(yRatio) * ((radius - innerZone) / (1 - innerZone)));
    if (horizontalAxis !== undefined) setOffset(horizontalAxis, xRatio);
  } else {
    setOffset(verticalAxis, yRatio);
    if (horizontalAxis !== undefined) setOffset(horizontalAxis, group.invertHorizontal ? -xRatio : xRatio);
  }
  if (state.view === "preview") state.previewPositions = next;
  else state.positions = next;
  if (state.view === "control") send({ type: "set-target", positions: next });
  m.redraw();
};
const nudgeJoystick = (group: JoystickGroup, key: string): void => {
  const bridge = state.bridge;
  if (bridge === null || state.view === "setup" || (state.view === "control" && !bridge.enabled)) return;
  state.joystickBases[group.name] = { ...displayedPositions() };
  const [x, y] = state.joystickRatios[group.name] ?? [0, 0];
  const step = 0.08;
  const next: readonly [number, number] = key === "ArrowLeft" ? [x - step, y]
    : key === "ArrowRight" ? [x + step, y]
      : key === "ArrowUp" ? [x, y - step]
        : [x, y + step];
  state.joystickRatios[group.name] = [clamp(next[0], [-1, 1]), clamp(next[1], [-1, 1])];
  applyJoystickTarget(group);
};
const stopGroupJog = (group: JoystickGroup, move: (event: PointerEvent) => void, stop: () => void): void => {
  window.removeEventListener("pointermove", move);
  window.removeEventListener("pointerup", stop);
  window.removeEventListener("pointercancel", stop);
  state.activeJoystick = null;
  delete state.joystickBases[group.name];
  state.joystickRatios[group.name] = [0, 0];
  m.redraw();
};
const startGroupJog = (group: JoystickGroup, event: PointerEvent): void => {
  const bridge = state.bridge;
  if (bridge === null || state.view === "setup" || (state.view === "control" && !bridge.enabled)) return;
  const joystick = event.currentTarget as HTMLElement;
  const move = (nextEvent: PointerEvent): void => {
    const bounds = joystick.getBoundingClientRect();
    const xRatio = group.axes.length === 1 ? 0 : clamp((nextEvent.clientX - (bounds.left + bounds.width / 2)) / (bounds.width / 2), [-1, 1]);
    const yRatio = clamp((nextEvent.clientY - (bounds.top + bounds.height / 2)) / (bounds.height / 2), [-1, 1]);
    state.joystickRatios[group.name] = [xRatio, yRatio];
    applyJoystickTarget(group);
  };
  const stop = (): void => stopGroupJog(group, move, stop);
  event.preventDefault();
  state.activeJoystick = group.name;
  state.joystickBases[group.name] = { ...displayedPositions() };
  state.joystickRatios[group.name] = [0, 0];
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
  window.addEventListener("pointercancel", stop, { once: true });
};

const capPercent = (value: number, range: readonly [number, number]): string =>
  `${((value - range[0]) / (range[1] - range[0])) * 100}%`;
const directionCue = (bridge: BridgeState, group: JoystickGroup): m.Children => {
  const positions = displayedPositions();
  const positionRatio = (joint: JointName): number => {
    const [low, high] = bridge.limits[joint];
    return clamp((positions[joint] - (low + high) / 2) / ((high - low) / 2), [-1, 1]);
  };
  const [activeX, activeY] = state.joystickRatios[group.name] ?? [0, 0];
  const horizontal = group.invertHorizontal ? -activeX : activeX;
  const radius = Math.min(1, Math.hypot(activeX, activeY));
  const innerZone = 0.5;
  const shoulderMove = group.zoned === undefined
    ? activeY
    : radius <= innerZone ? -activeY / innerZone : 0;
  const elbowMove = group.zoned === undefined
    ? activeY
    : radius > innerZone ? -Math.sign(activeY) * ((radius - innerZone) / (1 - innerZone)) : 0;
  const armAngle = -22 + positionRatio(group.axes[1] ?? group.axes[0]) * 10 + positionRatio(group.axes[0]) * 8;
  const shoulderAngle = -18 + positionRatio(group.axes[0]) * 24;
  const elbowAngle = -24 + positionRatio(group.zoned ?? group.axes[0]) * 42;
  const ghost = (angle: number, move: number, scale: number): { style: { transform: string } } => ({ style: { transform: `rotate(${angle + move * scale}deg)` } });
  return m("div.so101-motion-cues", { "aria-label": "Expected arm movement" }, [
    m("span.so101-motion-cue", [m("span.so101-arm-solid", { style: { transform: `rotate(${armAngle}deg)` } }), m("span.so101-arm-ghost", ghost(armAngle, horizontal + shoulderMove, 18))]),
    m("span.so101-motion-cue", [m("span.so101-shoulder-solid", { style: { transform: `rotate(${shoulderAngle}deg)` } }), m("span.so101-shoulder-ghost", ghost(shoulderAngle, shoulderMove, 28))]),
    m("span.so101-motion-cue", [m("span.so101-elbow-solid", { style: { transform: `rotate(${elbowAngle}deg)` } }), m("span.so101-elbow-ghost", ghost(elbowAngle, elbowMove, 44))]),
    m("small", group.zoned === undefined ? "solid = current · ghost = expected" : "solid = now · ghost = result"),
  ]);
};
const joystickCard = (bridge: BridgeState, group: JoystickGroup): m.Vnode => {
  const positions = displayedPositions();
  const [verticalAxis, horizontalAxis] = group.axes;
  const verticalCaps = bridge.limits[verticalAxis] ?? bridge.calibration_limits[verticalAxis];
  const horizontalCaps = horizontalAxis === undefined ? null : bridge.limits[horizontalAxis] ?? bridge.calibration_limits[horizontalAxis];
  const positionY = (positions[verticalAxis] - verticalCaps[0]) / (verticalCaps[1] - verticalCaps[0]);
  const positionX = horizontalAxis === undefined || horizontalCaps === null ? 0.5 : (positions[horizontalAxis] - horizontalCaps[0]) / (horizontalCaps[1] - horizontalCaps[0]);
  const [activeX, activeY] = state.joystickRatios[group.name] ?? [0, 0];
  const disabled = state.view === "setup" || (state.view === "control" && !bridge.enabled);
  return m("article.so101-joystick-card", [
    m("div.so101-joint-heading", [m("strong", group.name), m("span", [...group.axes, ...(group.zoned === undefined ? [] : [group.zoned])].map((axis) => `${JOINT_LABELS[axis]} ${positions[axis].toFixed(1)}`).join(" · "))]),
    m("div.so101-joystick-layout", [
      m("div.so101-joystick", {
        onpointerdown: (event: PointerEvent) => startGroupJog(group, event),
        role: "group",
        tabindex: disabled ? -1 : 0,
        "aria-label": `${group.name} direct position control; use arrow keys or touch; the adjacent arm diagram predicts movement`,
        "aria-disabled": disabled,
        onkeydown: (event: KeyboardEvent) => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault();
          nudgeJoystick(group, event.key);
        },
      }, [
        m("span.so101-joystick-zone"),
        m("span.so101-position-indicator", { style: { left: `${positionX * 100}%`, top: `${(1 - positionY) * 100}%` } }),
        m("span.so101-joystick-knob", { style: { left: `${(horizontalAxis === undefined ? 0 : activeX) * 50 + 50}%`, top: `${50 + activeY * 50}%` } }),
      ]),
      directionCue(bridge, group),
    ]),
  ]);
};
const capRow = (bridge: BridgeState, joint: JointName): m.Vnode => {
  const canConfigure = bridge.connected && !bridge.enabled;
  const fullRange = bridge.calibration_limits[joint] ?? [-180, 180];
  const caps = bridge.limits[joint] ?? fullRange;
  const position = displayedPositions()[joint];
  return m("article.so101-cap-row", [
    m("div.so101-joint-heading", [m("strong", JOINT_LABELS[joint]), m("output", position.toFixed(1))]),
    m("div.so101-cap-track", [
      m("span.so101-cap-segment", { style: { left: capPercent(caps[0], fullRange), width: `${((caps[1] - caps[0]) / (fullRange[1] - fullRange[0])) * 100}%` } }),
      m("span.so101-cap-current", { style: { left: capPercent(position, fullRange) } }),
    ]),
    m("div.so101-cap-inputs", [
      m("label", ["LOW", m("input", { type: "range", min: fullRange[0], max: fullRange[1], step: 0.1, value: caps[0], disabled: !canConfigure, oninput: (event: Event) => updateCap(joint, "min", (event.target as HTMLInputElement).value) })]),
      m("button", { disabled: !canConfigure, onclick: () => captureCap(joint, "min") }, "Capture low"),
      m("button", { disabled: !canConfigure, onclick: () => captureCap(joint, "max") }, "Capture high"),
      m("label", ["HIGH", m("input", { type: "range", min: fullRange[0], max: fullRange[1], step: 0.1, value: caps[1], disabled: !canConfigure, oninput: (event: Event) => updateCap(joint, "max", (event.target as HTMLInputElement).value) })]),
    ]),
    m("small", `caps ${caps[0].toFixed(1)} … ${caps[1].toFixed(1)} · hardware ${fullRange[0].toFixed(1)} … ${fullRange[1].toFixed(1)}`),
  ]);
};

const ManualControl: m.Component = {
  view: () => {
    const bridge = state.bridge;
    const ready = bridge?.connected === true;
    return m("section.so101-manual-control", [
      m("header", [m("div.so101-heading", [m("small", "TELEOPERATION / MOBILE CONTROL"), m("h1", "SO—101")]), m("small", bridge?.live ? "LIVE / BRIDGE" : "DRY-RUN / BRIDGE")]),
      m("div.so101-operator-bar", [
        m("div.so101-actions", [
          m("button", { onclick: connectBridge }, "Connect bridge"),
          m("button", { disabled: bridge === null, onclick: () => { logEvent("robot-connect-requested"); send({ type: "connect" }); } }, "Connect robot"),
          m("button.so101-stop", { disabled: bridge === null, onclick: () => { logEvent("stop-requested"); setView("setup"); send({ type: "stop" }); } }, "STOP"),
        ]),
      ]),
      state.error === null ? null : m("p.so101-error", { role: "alert" }, state.error),
      bridge === null ? m("div.so101-empty", [m("strong", "Connect the local bridge"), m("p", "Setup stays disabled until the bridge and robot report state."), m("button", { onclick: connectBridge }, "Connect bridge")]) : m("div.so101-control-surface", [
        state.view === "setup" ? m("section.so101-setup", [
          m("div.so101-setup-heading", [m("div", [m("small", "CONTROL DISABLED"), m("h2", "Capture safe travel")]), m("button", { disabled: !bridge.connected || bridge.enabled, onclick: refreshArmPosition }, "Sync arm position")]),
          m("div.so101-cap-grid", JOINTS.map((joint) => capRow(bridge, joint))),
          m("div.so101-setup-actions", [m("button", { disabled: !bridge.connected || bridge.enabled, onclick: resetCaps }, "Reset caps"), m("button.so101-primary", { disabled: !ready || bridge.enabled, onclick: () => setView("preview") }, "Review movement →")]),
        ]) : m("section.so101-operation", [
          m("div.so101-operation-heading", [m("div", [m("small", state.view === "preview" ? "NO TARGET" : "TARGET LIVE"), m("h2", state.view === "preview" ? "Preview the arm" : "Control is armed")]), m("div.so101-actions", [m("button", { onclick: () => { if (state.view === "control") send({ type: "disable" }); setView("setup"); } }, "Setup"), state.view === "preview" ? m("button.so101-primary", { disabled: !ready, onclick: () => send({ type: "enable" }) }, "Enable control") : m("button", { onclick: () => { setView("preview"); send({ type: "disable" }); } }, "Disable")])]),
          m("div.so101-joysticks", JOYSTICK_GROUPS.map((group) => joystickCard(bridge, group))),
          m("label.so101-gripper-slider", [m("div.so101-joint-heading", [m("strong", "Gripper"), m("output", displayedPositions().gripper.toFixed(1))]), m("input", { type: "range", min: bridge.limits.gripper[0], max: bridge.limits.gripper[1], step: 0.1, value: displayedPositions().gripper, disabled: state.view === "control" ? !bridge.enabled : false, oninput: (event: Event) => setPosition("gripper", (event.target as HTMLInputElement).value) })]),
        ]),
      ]),
    ]);
  },
};
export default ManualControl;
