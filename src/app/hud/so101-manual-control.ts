import m from "mithril";
import "./so101-manual-control.css";
import { logEvent } from "../../observability/effect-logger";

type JointName = "shoulder_pan" | "shoulder_lift" | "elbow_flex" | "wrist_flex" | "wrist_roll" | "gripper";
type JoystickGroup = Readonly<{ readonly name: string; readonly axes: readonly [JointName] | readonly [JointName, JointName]; readonly zoned?: JointName; readonly invertHorizontal?: boolean }>;
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
type ComponentState = { socket: WebSocket | null; bridge: BridgeState | null; error: string | null; positions: Record<JointName, number>; configOpen: boolean; jogSpeed: number; joystickRatios: Record<string, readonly [number, number]>; activeJoystick: string | null };

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

const state: ComponentState = { socket: null, bridge: null, error: null, positions: initialPositions(), configOpen: false, jogSpeed: 20, joystickRatios: {}, activeJoystick: null };
let heartbeatTimer: number | null = null;
let joystickFrame: number | null = null;
let lastJoystickFrameAt = 0;
const stopHeartbeat = (): void => {
  if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
  heartbeatTimer = null;
};
const startHeartbeat = (): void => {
  if (heartbeatTimer !== null) return;
  heartbeatTimer = window.setInterval(() => {
    if (state.bridge?.enabled && state.activeJoystick === null) send(state, { type: "set-target", positions: state.positions });
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
          if (state.activeJoystick === null) state.positions = { ...state.positions, ...next.positions };
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
    const updateSlider = (joint: JointName, kind: "min" | "value" | "max", value: number): void => {
      const currentBridge = state.bridge;
      if (currentBridge === null) return;
      const fullRange = currentBridge.calibration_limits[joint] ?? [-180, 180];
      const caps = Object.fromEntries(JOINTS.map((name) => [name, [...currentBridge.limits[name]]])) as Record<JointName, [number, number]>;
      const bounded = Math.min(fullRange[1], Math.max(fullRange[0], value));
      if (kind === "value") {
        const nextValue = Math.min(caps[joint][1], Math.max(caps[joint][0], bounded));
        setPosition(joint, String(nextValue));
        return;
      }
      if (currentBridge.enabled) return;
      const nextCaps = kind === "min"
        ? [Math.min(bounded, caps[joint][1] - 0.1), caps[joint][1]] as [number, number]
        : [caps[joint][0], Math.max(bounded, caps[joint][0] + 0.1)] as [number, number];
      caps[joint] = nextCaps;
      state.bridge = { ...currentBridge, limits: caps };
      logEvent("joint-cap-changed", { joint, kind, value: bounded });
      send(state, { type: "set-caps", caps });
      m.redraw();
    };
    const dragHandle = (joint: JointName, kind: "min" | "value" | "max", event: PointerEvent): void => {
      const handle = event.currentTarget as HTMLElement;
      const track = handle.parentElement;
      if (track === null) return;
      event.preventDefault();
      const updateFromPointer = (move: PointerEvent): void => {
        const bounds = track.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (move.clientX - bounds.left) / bounds.width));
        const range = state.bridge?.calibration_limits[joint] ?? [-180, 180];
        updateSlider(joint, kind, range[0] + ratio * (range[1] - range[0]));
      };
      const stop = (): void => {
        window.removeEventListener("pointermove", updateFromPointer);
        window.removeEventListener("pointerup", stop);
      };
      window.addEventListener("pointermove", updateFromPointer);
      window.addEventListener("pointerup", stop, { once: true });
    };
    const keyboardHandle = (joint: JointName, kind: "min" | "value" | "max", event: KeyboardEvent): void => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const range = state.bridge?.calibration_limits[joint] ?? [-180, 180];
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const step = (range[1] - range[0]) / 100;
      const current = kind === "value" ? state.positions[joint] : state.bridge?.limits[joint][kind === "min" ? 0 : 1] ?? range[0];
      updateSlider(joint, kind, current + direction * step);
    };
    const applyJoystickControl = (group: JoystickGroup, elapsedSeconds: number): void => {
      const currentBridge = state.bridge;
      if (currentBridge === null || !currentBridge.enabled) return;
      const [xRatio, yRatio] = state.joystickRatios[group.name] ?? [0, 0];
      if (xRatio === 0 && yRatio === 0) return;
      const [verticalAxis, horizontalAxis] = group.axes;
      const delta = state.jogSpeed * elapsedSeconds;
      const next = { ...state.positions };
      const advance = (joint: JointName, amount: number): void => {
        const caps = currentBridge.limits[joint];
        next[joint] = Math.min(caps[1], Math.max(caps[0], next[joint] + amount));
      };
      if (group.zoned !== undefined) {
        const radius = Math.min(1, Math.hypot(xRatio, yRatio));
        const blend = radius * radius * (3 - 2 * radius);
        const elbowStrength = 0.5 + 0.5 * blend;
        advance(verticalAxis, yRatio * delta);
        advance(group.zoned, yRatio * elbowStrength * delta);
        if (horizontalAxis !== undefined) advance(horizontalAxis, xRatio * delta);
      } else {
        advance(verticalAxis, yRatio * delta);
        if (horizontalAxis !== undefined) advance(horizontalAxis, (group.invertHorizontal ? -xRatio : xRatio) * delta);
      }
      state.positions = next;
      send(state, { type: "set-target", positions: next });
      m.redraw();
    };
    const stopGroupJog = (group: JoystickGroup, move: (event: PointerEvent) => void, stop: () => void): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      if (joystickFrame !== null) window.cancelAnimationFrame(joystickFrame);
      joystickFrame = null;
      state.activeJoystick = null;
      state.joystickRatios[group.name] = [0, 0];
      m.redraw();
    };
    const startGroupJog = (group: JoystickGroup, event: PointerEvent): void => {
      if (state.bridge === null || !state.bridge.enabled) return;
      const joystick = event.currentTarget as HTMLElement;
      const move = (nextEvent: PointerEvent): void => {
        const bounds = joystick.getBoundingClientRect();
        const xRatio = group.axes.length === 1 ? 0 : Math.min(1, Math.max(-1, (nextEvent.clientX - (bounds.left + bounds.width / 2)) / (bounds.width / 2)));
        const yRatio = Math.min(1, Math.max(-1, (nextEvent.clientY - (bounds.top + bounds.height / 2)) / (bounds.height / 2)));
        state.joystickRatios[group.name] = [xRatio, yRatio];
        m.redraw();
      };
      const stop = (): void => stopGroupJog(group, move, stop);
      event.preventDefault();
      state.activeJoystick = group.name;
      state.joystickRatios[group.name] = [0, 0];
      lastJoystickFrameAt = performance.now();
      const frame = (now: number): void => {
        if (state.activeJoystick !== group.name) return;
        const elapsedSeconds = Math.min(.05, Math.max(0, (now - lastJoystickFrameAt) / 1000));
        lastJoystickFrameAt = now;
        applyJoystickControl(group, elapsedSeconds);
        joystickFrame = window.requestAnimationFrame(frame);
      };
      joystickFrame = window.requestAnimationFrame(frame);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop, { once: true });
      window.addEventListener("pointercancel", stop, { once: true });
    };
    const resetCaps = (): void => {
      if (state.bridge === null || state.bridge.enabled) return;
      logEvent("joint-caps-reset");
      send(state, { type: "set-caps", caps: state.bridge.calibration_limits });
    };
    const bridge = state.bridge;
    return m("section.so101-manual-control", [
      m("header", [m("div.so101-heading", [m("small", "TELEOPERATION / MANUAL OVERRIDE"), m("h1", "SO—101")]), m("small", bridge?.live ? "LIVE / BRIDGE" : "DRY-RUN / BRIDGE")]),
      m("p.so101-safety", "Set caps while disabled. Enable control only when the arm is clear."),
      m("div.so101-actions", [
        m("button", { onclick: connect }, "Connect bridge"),
        m("button", { disabled: bridge === null, onclick: () => { logEvent("robot-connect-requested"); send(state, { type: "connect" }); } }, "Connect robot"),
        m("button", { disabled: bridge === null || !bridge.connected, onclick: () => { const type = bridge?.enabled ? "disable" : "enable"; logEvent(type === "enable" ? "control-enable-requested" : "control-disable-requested"); send(state, { type }); } }, bridge?.enabled ? "Disable control" : "Enable control"),
        m("button.so101-stop", { disabled: bridge === null, onclick: () => { logEvent("stop-requested"); send(state, { type: "stop" }); } }, "STOP"),
      ]),
      state.error === null ? null : m("p.so101-error", state.error),
      bridge === null ? m("p", "Start the bridge, then connect.") : m("div.so101-control-surface", [
        m("div.so101-jog-toolbar", [
          m("span", "Hold the center nub and drag. Distance from center controls speed."),
          m("label", ["Max speed", m("select", { value: state.jogSpeed, disabled: !bridge.enabled, onchange: (event: Event) => { state.jogSpeed = Number((event.target as HTMLSelectElement).value); } }, [5, 10, 20, 40, 80].map((speed) => m("option", { value: speed }, `${speed}°/s`)))])
        ]),
        m("div.so101-joysticks", JOYSTICK_GROUPS.map((group) => {
          const axes: readonly JointName[] = group.axes;
          const [verticalAxis, horizontalAxis] = axes;
          const verticalCaps = bridge.limits[verticalAxis] ?? bridge.calibration_limits[verticalAxis];
          const horizontalCaps = horizontalAxis === undefined ? null : bridge.limits[horizontalAxis] ?? bridge.calibration_limits[horizontalAxis];
          const positionY = (state.positions[verticalAxis] - verticalCaps[0]) / (verticalCaps[1] - verticalCaps[0]);
          const positionX = horizontalCaps === null ? 0.5 : (state.positions[horizontalAxis] - horizontalCaps[0]) / (horizontalCaps[1] - horizontalCaps[0]);
          const [activeX, activeY] = state.joystickRatios[group.name] ?? [0, 0];
          return m("article.so101-joystick-card", [
            m("div.so101-joint-heading", [m("strong", group.name), m("span", [...axes, ...(group.zoned === undefined ? [] : [group.zoned])].map((axis) => `${JOINT_LABELS[axis]} ${state.positions[axis].toFixed(1)}`).join(" · "))]),
            m(`div.so101-joystick${horizontalAxis === undefined ? ".is-single-axis" : ""}${group.zoned === undefined ? "" : ".is-zoned"}`, {
              onpointerdown: (event: PointerEvent) => startGroupJog(group, event),
              role: "application",
              "aria-label": `${group.name} joystick for ${axes.map((axis) => JOINT_LABELS[axis]).join(" and ")}${group.zoned === undefined ? "" : `; radial travel continuously blends toward ${JOINT_LABELS[group.zoned]}`}`,
              "aria-disabled": !bridge.enabled,
            }, [m("span.so101-joystick-guide"), m("span.so101-position-indicator", { style: { left: `${positionX * 100}%`, top: `${(1 - positionY) * 100}%` } }), m("span.so101-joystick-knob", { style: { left: `${(horizontalAxis === undefined ? 0 : activeX) * 50 + 50}%`, top: `${50 + activeY * 50}%` } })])
          ]);
        })),
        m("label.so101-gripper-slider", [
          m("div.so101-joint-heading", [m("strong", "Gripper"), m("output", state.positions.gripper.toFixed(1))]),
          m("span.so101-gripper-labels", [m("span", "Open"), m("span", "Close")]),
          m("input", {
            type: "range",
            min: bridge.limits.gripper[0],
            max: bridge.limits.gripper[1],
            step: 0.1,
            value: state.positions.gripper,
            disabled: !bridge.enabled,
            oninput: (event: Event) => setPosition("gripper", (event.target as HTMLInputElement).value),
          }),
        ]),
        m("small.so101-jog-hint", `Shoulder + elbow: X pans. Vertical direction flexes or extends; radial travel smoothly blends from shoulder toward elbow. Release to stop. Release to stop. Max speed: ${state.jogSpeed}°/s.`),
        m("details.so101-config", { open: state.configOpen, ontoggle: (event: Event) => { state.configOpen = (event.target as HTMLDetailsElement).open; } }, [
          m("summary", "Configuration: caps and sliders"),
          m("div.so101-joints", [
        JOINTS.map((joint) => {
          const fullRange = bridge.calibration_limits[joint] ?? [-180, 180];
          const caps = bridge.limits[joint] ?? fullRange;
          const position = state.positions[joint];
          const percent = (value: number): string => `${((value - fullRange[0]) / (fullRange[1] - fullRange[0])) * 100}%`;
          const handle = (kind: "min" | "value" | "max", value: number, disabled: boolean): m.Vnode => m("button.so101-handle", {
            class: `so101-handle-${kind}`,
            style: { left: percent(value) },
            role: "slider",
            "aria-label": `${JOINT_LABELS[joint]} ${kind}`,
            "aria-valuemin": fullRange[0],
            "aria-valuemax": fullRange[1],
            "aria-valuenow": value,
            disabled,
            onpointerdown: (event: PointerEvent) => dragHandle(joint, kind, event),
            onkeydown: (event: KeyboardEvent) => keyboardHandle(joint, kind, event),
          });
          return m("article.so101-joint", [
            m("div.so101-joint-heading", [m("strong", JOINT_LABELS[joint]), m("output", position.toFixed(1))]),
            m("div.so101-slider", [
              m("div.so101-track"),
              handle("min", caps[0], bridge.enabled),
              handle("max", caps[1], bridge.enabled),
              handle("value", position, !bridge.enabled),
            ]),
            m("small", `caps ${caps[0].toFixed(1)} … ${caps[1].toFixed(1)}`),
          ]);
        }),
            m("button", { disabled: bridge.enabled, onclick: resetCaps }, "Reset all caps"),
          ]),
        ]),
      ]),
    ]);
  },
};
export default ManualControl;
