import m from "mithril";
import type { ArmSide } from "../../domain/robot-target";
import type { WorkspacePosition } from "../../domain/workspace-mapping";
import {
  calibrateTrackingArm,
  pipeline,
  resetTrackingArmCalibration,
  type ArmPipelineSnapshot,
  type TrackingPipelineSnapshot,
} from "./tracking-pipeline";

const number = (value: number | null): string => value === null ? "—" : value.toFixed(2);
const degrees = (value: number | null): string => value === null ? "—" : `${value.toFixed(0)}°`;
const vector = (value: WorkspacePosition | null): string => value === null
  ? "—"
  : `${number(value.x)} ${number(value.y)} ${number(value.z)}`;

const status = (value: boolean, label: string): m.Vnode =>
  m("span", { class: value ? "hud-ok" : "hud-muted" }, `${label} ${value ? "✓" : "—"}`);

const armLabel = (side: ArmSide): string => side === "left" ? "LEFT" : "RIGHT";

const targetBlock = (arm: ArmPipelineSnapshot, side: ArmSide): m.Children => {
  const target = arm.target;
  return m("div.hud-target", [
    m("strong", `TARGET ${armLabel(side)}`),
    target === null
      ? m("span.hud-muted", "Unavailable")
      : [
          m("span", `x ${number(target.position.x)} · y ${number(target.position.y)} · z ${number(target.position.z)}`),
          m("span", `sequence ${target.sequence}`),
          m("span", `sourceTimestamp ${target.sourceTimestamp}`),
        ],
  ]);
};

const armCard = (side: ArmSide, arm: ArmPipelineSnapshot): m.Children => {
  const labels = ["shoulder", "elbow", "pose wrist", "hand anchor"];
  return m("article.hud-arm", [

    m("header", [m("strong", armLabel(side)), status(arm.pose !== null, "POSE")]),
    m("div.hud-status-row", [
      status(arm.calibration !== null, arm.calibration === null ? "NOT CALIBRATED" : "CALIBRATED"),
      status(arm.validity.valid, arm.validity.valid ? "VALID" : `INVALID ${arm.validity.reason}`),
      m("span", { class: arm.freshness === "fresh" ? "hud-ok" : "hud-warning" }, `INPUT ${arm.freshness.toUpperCase()}`),
    ]),
    m("div.hud-landmarks", labels.map((label, index) => {
      const landmark = arm.pose === null ? null : [arm.pose.shoulder, arm.pose.elbow, arm.pose.wrist, arm.pose.handAnchor][index];
      const visibility = arm.visibility[index]?.visibility;
      return m("span", { class: arm.validity.valid ? "" : "hud-invalid-landmark" }, [
        m("b", label),
        landmark === null ? " —" : ` ${number(landmark.x)},${number(landmark.y)},${number(landmark.z)}`,
        visibility === undefined ? "" : ` v${visibility.toFixed(2)}`,
      ]);
    })),
    m("div.hud-angles", [
      m("span", `elbow ${degrees(arm.elbowAngle)}`),
      m("span", `shoulder ${degrees(arm.shoulderAngle)}`),
    ]),
    m("div.hud-calibration-values", [
      m("span", `Human Δ: ${vector(arm.displacement.available ? arm.displacement.displacement : null)}`),
      m("span", `Workspace: ${vector(arm.mapped)}`),
    ]),
    m("div.hud-actions", [
      m("ion-button", { size: "small", fill: "outline", onclick: () => calibrateTrackingArm(side) }, "Calibrate"),
      m("ion-button", { size: "small", fill: "clear", onclick: () => resetTrackingArmCalibration(side) }, "Reset"),
    ]),
    targetBlock(arm, side),
  ]);
};

const project = (position: WorkspacePosition): Readonly<{ readonly x: number; readonly y: number }> => ({
  x: 50 + (position.x - position.z) * 18,
  y: 52 - position.y * 24 - (position.x + position.z) * 9,
});

const workspace = (snapshot: TrackingPipelineSnapshot): m.Children => {
  const left = snapshot.arms.left;
  const right = snapshot.arms.right;
  const raw = left.mapped ?? right.mapped;
  const smooth = left.stabilized ?? right.stabilized;
  const rawPoint = raw === null ? null : project(raw);
  const smoothPoint = smooth === null ? null : project(smooth);
  const center = project({ x: 0, y: 0, z: 0 });
  const trail = left.trail.length > 0 ? left.trail : right.trail;
  const clamped = raw === null ? [] : (["x", "y", "z"] as const).filter((axis) => Math.abs(raw[axis]) >= 1);
  return m("div.hud-workspace", [
    m("strong", "WORKSPACE [-1, 1]³"),
    m("svg", { viewBox: "0 0 100 100", "aria-label": "Normalized workspace" }, [
      m("path", { d: "M20 70 L50 85 L80 70 L50 55 Z M20 70 L20 40 L50 25 L50 55 M80 70 L80 40 L50 25", class: "workspace-cube" }),
      m("line", { x1: center.x, y1: center.y, x2: 82, y2: center.y, class: "axis-x" }),
      m("line", { x1: center.x, y1: center.y, x2: center.x, y2: 18, class: "axis-y" }),
      m("line", { x1: center.x, y1: center.y, x2: 18, y2: 68, class: "axis-z" }),
      trail.map((item) => { const point = project(item); return m("circle", { cx: point.x, cy: point.y, r: 1, class: "workspace-trail" }); }),
      m("circle", { cx: center.x, cy: center.y, r: 2, class: "workspace-center" }),
      rawPoint === null ? null : m("circle", { cx: rawPoint.x, cy: rawPoint.y, r: 2.5, class: "workspace-raw" }),
      smoothPoint === null ? null : m("circle", { cx: smoothPoint.x, cy: smoothPoint.y, r: 2.5, class: "workspace-smooth" }),
    ]),
    m("span", `raw ${vector(raw)} · smooth ${vector(smooth)}`),
    m("span", `α ${snapshot.stabilization.alpha} · dead zone ${vector(snapshot.stabilization.deadZone)}`),
    m("span", clamped.length === 0 ? "dead zone: none" : `clamped: ${clamped.join(" / ")}`),
  ]);
};

const stage = (label: string, ready: boolean): m.Children => m("span", { class: ready ? "stage-ready" : "stage-idle" }, label);

const anchorOverlay = (snapshot: TrackingPipelineSnapshot): m.Children => {
  const marks = (["left", "right"] as const).flatMap((side) => {
    const arm = snapshot.arms[side];
    if (arm.pose === null || arm.calibration === null) return [];
    const current = arm.pose.handAnchor;
    const reference = arm.calibration.reference.handAnchor;
    return [
      m("line", { x1: reference.x, y1: reference.y, x2: current.x, y2: current.y, class: "calibration-line" }),
      m("circle", { cx: reference.x, cy: reference.y, r: ".012", class: "calibration-marker" }),
      m("circle", { cx: current.x, cy: current.y, r: ".009", class: "current-anchor" }),
    ];
  });
  return m("svg.calibration-overlay", { viewBox: "0 0 1 1", preserveAspectRatio: "none", "aria-hidden": "true" }, marks);
};

const TrackingHud: m.Component = {
  view: () => {
    const snapshot = pipeline();
    const left = snapshot.arms.left;
    const right = snapshot.arms.right;
    return m("div.tracking-hud", [
      anchorOverlay(snapshot),
      m("div.hud-pipeline", [
        stage("POSE", snapshot.pose.left !== null || snapshot.pose.right !== null), m("i", "→"),
        stage("CAL", left.calibration !== null || right.calibration !== null), m("i", "→"),
        stage("VALID", left.validity.valid || right.validity.valid), m("i", "→"),
        stage("MAP", left.mapped !== null || right.mapped !== null), m("i", "→"),
        stage("SMOOTH", left.stabilized !== null || right.stabilized !== null), m("i", "→"),
        stage("TARGET", left.target !== null || right.target !== null),
      ]),
      m("div.hud-arm-grid", [armCard("left", left), armCard("right", right)]),
      workspace(snapshot),
    ]);
  },
};

export default TrackingHud;
