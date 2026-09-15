import m from "mithril";
import type { ArmSide } from "../../robotics/model/robot-target";
import type { WorkspacePosition } from "../../teleoperation/mapping/workspace-mapping";
import {
  calibrateTrackingArm,
  pipeline,
  resetTrackingArmCalibration,
  type ArmPipelineSnapshot,
  type TrackingPipelineSnapshot,
} from "../session/teleop-session";

type HudStage = "pose" | "cal" | "valid" | "map" | "smooth" | "target" | "control" | "fresh";

let selectedStage: HudStage = "cal";

const number = (value: number | null): string => value === null ? "—" : value.toFixed(3);
const vector = (value: WorkspacePosition | null): string => value === null
  ? "—"
  : `${number(value.x)} / ${number(value.y)} / ${number(value.z)}`;
const armLabel = (side: ArmSide): string => side === "left" ? "LEFT" : "RIGHT";

const status = (value: boolean, label: string): m.Vnode =>
  m("span", { class: value ? "hud-ok" : "hud-muted" }, `${label} ${value ? "✓" : "—"}`);

const handAnchor = (arm: ArmPipelineSnapshot): WorkspacePosition | null =>
  arm.pose === null ? null : arm.pose.handAnchor;

const calibrationCard = (side: ArmSide, arm: ArmPipelineSnapshot): m.Children => {
  const reference = arm.calibration?.reference.handAnchor ?? null;
  const current = handAnchor(arm);
  const displacement = arm.displacement.available ? arm.displacement.displacement : null;
  return m("article.hud-calibration-card", [
    m("header", [
      m("strong", armLabel(side)),
      status(arm.calibration !== null, arm.calibration === null ? "NOT CALIBRATED" : "CALIBRATED"),
    ]),
    m("div.hud-calibration-grid", [
      m("span", [m("b", "Hand anchor"), m("code", vector(current))]),
      m("span", [m("b", "Reference"), m("code", vector(reference))]),
      m("span", [m("b", "Δ x / y / z"), m("code", vector(displacement))]),
    ]),
    m("div.hud-calibration-actions", [
      m("ion-button", { size: "small", fill: "solid", onclick: () => calibrateTrackingArm(side) }, `Calibrate ${armLabel(side)}`),
      m("ion-button", { size: "small", fill: "outline", onclick: () => resetTrackingArmCalibration(side) }, "Reset"),
    ]),
  ]);
};

const calibrationInspector = (snapshot: TrackingPipelineSnapshot): m.Children =>
  m("section.hud-inspector hud-inspector-calibration", [
    m("header.hud-inspector-header", [
      m("div", [m("span.hud-kicker", "ACTIVE INSPECTOR"), m("h2", "CALIBRATION")]),
      m("span.hud-help", "Capture a neutral arm reference")
    ]),
    m("div.hud-calibration-grid-columns", [
      calibrationCard("left", snapshot.arms.left),
      calibrationCard("right", snapshot.arms.right),
    ]),
  ]);

const validityInspector = (snapshot: TrackingPipelineSnapshot): m.Children =>
  m("section.hud-inspector", [
    m("header.hud-inspector-header", [m("h2", "VALIDITY"), m("span.hud-help", "Requirement 11")]),
    m("div.hud-observe-grid", (["left", "right"] as const).map((side) => {
      const arm = snapshot.arms[side];
      return m("div", [m("strong", armLabel(side)), status(arm.validity.valid, arm.validity.valid ? "VALID" : `INVALID · ${arm.validity.reason}`)]);
    })),
  ]);

const observeInspector = (title: string, detail: m.Children): m.Children =>
  m("section.hud-inspector", [
    m("header.hud-inspector-header", [m("h2", title), m("span.hud-help", "Observe")]),
    detail,
  ]);

const inspector = (snapshot: TrackingPipelineSnapshot): m.Children => {
  switch (selectedStage) {
    case "cal": return calibrationInspector(snapshot);
    case "valid": return validityInspector(snapshot);
    case "pose": return observeInspector("POSE", m("p", `${snapshot.frame.poseLandmarks.length} pose landmarks · ${snapshot.pose.left ? "left arm" : "no left arm"} · ${snapshot.pose.right ? "right arm" : "no right arm"}`));
    case "map": return observeInspector("MAPPING", m("p", `L ${vector(snapshot.arms.left.mapped)} · R ${vector(snapshot.arms.right.mapped)}`));
    case "smooth": return observeInspector("STABILIZATION", m("p", `L ${vector(snapshot.arms.left.stabilized)} · R ${vector(snapshot.arms.right.stabilized)}`));
    case "target": return observeInspector("TARGET", m("p", `L ${snapshot.arms.left.target ? "available" : "—"} · R ${snapshot.arms.right.target ? "available" : "—"}`));
    case "control": return observeInspector("CONTROL", m("p", "Control policy is not enabled in the tracking session."));
    case "fresh": return observeInspector("FRESHNESS", m("p", `L ${snapshot.freshness.left.status} · R ${snapshot.freshness.right.status}`));
  }
};

const stageReady = (stage: HudStage, snapshot: TrackingPipelineSnapshot): boolean => {
  const left = snapshot.arms.left;
  const right = snapshot.arms.right;
  switch (stage) {
    case "pose": return snapshot.pose.left !== null || snapshot.pose.right !== null;
    case "cal": return left.calibration !== null || right.calibration !== null;
    case "valid": return left.validity.valid || right.validity.valid;
    case "map": return left.mapped !== null || right.mapped !== null;
    case "smooth": return left.stabilized !== null || right.stabilized !== null;
    case "target": return left.target !== null || right.target !== null;
    case "control": return false;
    case "fresh": return left.freshness === "fresh" || right.freshness === "fresh";
  }
};

const pipelineStages: readonly HudStage[] = ["pose", "cal", "valid", "map", "smooth", "target", "control", "fresh"];
const stageLabel = (stage: HudStage): string => stage === "smooth" ? "SMOOTH" : stage.toUpperCase();

const pipelineStrip = (snapshot: TrackingPipelineSnapshot): m.Children =>
  m("nav.hud-pipeline", { "aria-label": "Development pipeline" }, pipelineStages.flatMap((stage, index) => [
    m("button.hud-stage", {
      class: `${selectedStage === stage ? "stage-active" : ""} ${stageReady(stage, snapshot) ? "stage-ready" : "stage-idle"}`,
      "aria-pressed": selectedStage === stage,
      onclick: () => { selectedStage = stage; },
    }, [m("span", stageLabel(stage)), m("small", stageReady(stage, snapshot) ? "✓" : "—")]),
    index === pipelineStages.length - 1 ? null : m("i", "→"),
  ]));

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
    return m("div.tracking-hud", [
      anchorOverlay(snapshot),
      pipelineStrip(snapshot),
      inspector(snapshot),
    ]);
  },
};

export default TrackingHud;
