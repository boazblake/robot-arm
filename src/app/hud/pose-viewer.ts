import m from "mithril";
import {
  comparison,
  elements,
  freezeComparisonFrame,
  clearComparisonFrame,
  previewFit,
  previewRotationDegrees,
  rotatePreview,
  startupError,
  tracking,
  isFrontCamera,
  freezePoseWorldDiagnostic,
  setDiagnosticPoseWorldAngle,
  clearPoseWorldDiagnostic,
  diagnosticPoseWorldAngle,
  diagnosticPoseWorldFrameId,
  diagnosticPoseWorldSource,
} from "../session/store";
import TrackingHud from "./tracking-hud";
import { alignHandDepthToPose } from "../../shared/geometry/preview-depth";
import { rotatePreviewMesh, rotatePreviewPoint } from "../../shared/geometry/preview-point";
import { trackingSession } from "../session/session-lifecycle";
import { createPoseDiagnosticSeries, createPoseDiagnosticSnapshot, poseWorldPoints } from "../../tracking/model/pose-world-diagnostic";
import { pipeline } from "../session/teleop-session";
import "./pose.css";

type CompactPoint = (point: { readonly x: number; readonly y: number; readonly z: number }) => readonly [number, number, number];
const compactPoint: CompactPoint = (point) => [
  Number(point.x.toFixed(4)),
  Number(point.y.toFixed(4)),
  Number(point.z.toFixed(4)),
];

type CompactPoints = (points: readonly { readonly x: number; readonly y: number; readonly z: number }[]) => readonly (readonly [number, number, number])[];
const compactPoints: CompactPoints = (points) => points.map(compactPoint);

type CompactIndexedPoints = (
  points: readonly { readonly x: number; readonly y: number; readonly z: number }[],
  indices: readonly number[],
) => Readonly<Record<string, readonly [number, number, number] | null>>;
type PreviewSnapshotPoint = Readonly<{
  readonly canvas: readonly [number, number, number];
  readonly displayed: readonly [number, number, number];
}>;
type CompactPreviewPoints = (
  points: readonly { readonly x: number; readonly y: number; readonly z: number }[],
  rotationDegrees: number,
  frontCamera: boolean,
) => readonly PreviewSnapshotPoint[];
type CompactTransformedPoints = (
  points: readonly { readonly x: number; readonly y: number; readonly z: number }[],
  frontCamera: boolean,
) => readonly PreviewSnapshotPoint[];
const compactIndexedPoints: CompactIndexedPoints = (points, indices) =>
  Object.fromEntries(indices.map((index) => [
    index,
    points[index] === undefined ? null : compactPoint(points[index]),
  ]));
const compactTransformedPoints: CompactTransformedPoints = (points, frontCamera) =>
  points.map((point) => ({
    canvas: compactPoint(point),
    displayed: compactPoint({ ...point, x: frontCamera ? 1 - point.x : point.x }),
  }));
const compactPreviewPoints: CompactPreviewPoints = (points, rotationDegrees, frontCamera) =>
  compactTransformedPoints(points.map((point) => rotatePreviewPoint(point, rotationDegrees)), frontCamera);

type SnapshotTrackingPoses = () => void;
const diagnosticProjection = () => {
  const canvas = elements.canvas();
  const width = canvas?.width ?? 1;
  const height = canvas?.height ?? 1;
  return { width, height, scale: Math.min(width, height) * 0.8 };
};
const snapshotPoseWorldDiagnostic: () => void = () => {
  const source = diagnosticPoseWorldSource();
  if (source === null) return;
  const snapshot = createPoseDiagnosticSnapshot(
    diagnosticPoseWorldFrameId(),
    source,
    "y",
    diagnosticPoseWorldAngle(),
    diagnosticProjection(),
  );
  console.log("[pose world diagnostic snapshot]", JSON.stringify(snapshot));
};
const snapshotAllPoseWorldAngles: () => void = () => {
  const source = diagnosticPoseWorldSource();
  if (source === null) return;
  const snapshots = createPoseDiagnosticSeries(diagnosticPoseWorldFrameId(), source, diagnosticProjection());
  console.log("[pose world diagnostic snapshots]", JSON.stringify(snapshots));
};
const freezePoseWorld: () => void = () => {
  const source = poseWorldPoints(tracking.frame());
  if (source.length < 29) {
    console.warn("[pose diagnostic] pose world landmarks are unavailable; this adapter only supplied image landmarks");
    return;
  }
  freezePoseWorldDiagnostic(source, tracking.frame().timestamp);
  freezeComparisonFrame();
};
const snapshotTrackingPoses: SnapshotTrackingPoses = () => {
  const frame = tracking.frame();
  const renderedFrame = alignHandDepthToPose(frame);
  const currentPipeline = pipeline();
  const compactOptionalPoint = (point: { readonly x: number; readonly y: number; readonly z: number } | null) =>
    point === null ? null : compactPoint(point);
  const compactArmControl = (side: "left" | "right") => {
    const arm = currentPipeline.arms[side];
    const handPoints = side === "left" ? frame.leftHandLandmarks : frame.rightHandLandmarks;
    const palmPoints = [0, 5, 9, 13, 17].map((index) => handPoints[index]).filter((point): point is typeof handPoints[number] => point !== undefined);
    const rawPalm = palmPoints.length === 0 ? null : {
      x: palmPoints.reduce((sum, point) => sum + point.x, 0) / palmPoints.length,
      y: palmPoints.reduce((sum, point) => sum + point.y, 0) / palmPoints.length,
      z: palmPoints.reduce((sum, point) => sum + point.z, 0) / palmPoints.length,
    };

    return {
      rotationDegrees: previewRotationDegrees(),
      camera: isFrontCamera() === "web-camera-front" ? "front" : "rear",
      calibrated: arm.calibration !== null,
      trackingValidity: arm.validity.valid ? "valid" : arm.validity.reason,
      rawAnchors: {
        poseWrist: compactOptionalPoint(frame.poseLandmarks[side === "left" ? 15 : 16] ?? null),
        handWrist: compactOptionalPoint((side === "left" ? frame.leftHandLandmarks : frame.rightHandLandmarks)[0] ?? null),
        handPalm: rawPalm === null ? null : compactPoint(rawPalm),
      },
      canonical: null,
      displacement: arm.displacement.available ? compactPoint(arm.displacement.displacement) : null,
      uiFrameDisplacement: null,
      mapped: compactOptionalPoint(arm.mapped),
      stabilized: compactOptionalPoint(arm.stabilized),
      target: arm.target === null ? null : compactPoint(arm.target.position),
    };
  };
  const snapshot = {
    rotation: previewRotationDegrees(),
    face: compactIndexedPoints(frame.faceLandmarks, [0, 1]),
    hands: {
      left: compactPoints(frame.leftHandLandmarks),
      right: compactPoints(frame.rightHandLandmarks),
    },
    body: compactIndexedPoints(frame.poseLandmarks, [0, 11, 12, 15, 16]),
    rendered: {
      face: compactTransformedPoints(
        rotatePreviewMesh(renderedFrame.faceLandmarks, previewRotationDegrees()),
        isFrontCamera() === "web-camera-front",
      ),
      hands: {
        left: compactPreviewPoints(renderedFrame.leftHandLandmarks, previewRotationDegrees(), isFrontCamera() === "web-camera-front"),
        right: compactPreviewPoints(renderedFrame.rightHandLandmarks, previewRotationDegrees(), isFrontCamera() === "web-camera-front"),
      },
      body: compactPreviewPoints(
        [0, 11, 12, 15, 16].map((index) => renderedFrame.poseLandmarks[index]).filter((point): point is typeof renderedFrame.poseLandmarks[number] => point !== undefined),
        previewRotationDegrees(),
        isFrontCamera() === "web-camera-front",
      ),
    },
    control: {
      left: compactArmControl("left"),
      right: compactArmControl("right"),
    },
  };
  console.log("[tracking pose snapshot]", JSON.stringify(snapshot));
};

const TrackingViewer: m.Component = {
  oncreate: ({ dom }) => {
    elements.video(dom.querySelector("video"));
    elements.canvas(dom.querySelector("canvas.holistic-canvas"));
    elements.comparisonCanvas(dom.querySelector("canvas.separate-canvas"));
    void trackingSession.start().catch((error) =>
      console.error("[tracking] failed to start session", error)
    );
  },
  onremove: () => {
    void trackingSession
      .stop()
      .catch((error) =>
        console.error("[tracking] failed to stop session", error)
      );
  },
  view: () => {
    const frame = tracking.frame();
    return m(
      `section.tracking-viewer.preview-${previewFit()} ${isFrontCamera()}`,
      [
        m("video", { playsinline: true, autoplay: true, muted: true }),
        m("div.landmark-comparison", [
          m("div.landmark-pane", [
            m("span.landmark-pane-label", `Holistic · face ${frame.faceLandmarks.length}`),
            m("canvas.holistic-canvas", { "aria-label": "Holistic landmarks" }),
          ]),
          m("div.landmark-pane", [
            m("span.landmark-pane-label", `Pose + Hands + Face · face ${comparison.frame().faceLandmarks.length}`),
            m("canvas.separate-canvas", { "aria-label": "Separate Pose, Hand, and Face landmarks" }),
          ]),
        ]),
        m("div.tracking-toolbar", [
          m("strong", "Human-motion tracking"),
          m(
            "span",
            `Pose ${frame.poseLandmarks.length} · Hands ${
              frame.leftHandLandmarks.length + frame.rightHandLandmarks.length
            } · Face ${frame.faceLandmarks.length}`
          ),
          m(
            "ion-button",
            {
              size: "small",
              onclick: () => rotatePreview(-1),
              "aria-label": `Rotate left (${previewRotationDegrees()} degrees)`,
            },
            "← Rotate left"
          ),
          m(
            "ion-button",
            {
              size: "small",
              onclick: () => rotatePreview(1),
              "aria-label": `Rotate right (${previewRotationDegrees()} degrees)`,
            },
            "Rotate right →"
          ),
          m(
            "ion-button",
            {
              size: "small",
              fill: "outline",
              onclick: snapshotTrackingPoses,
            },
            "Snapshot poses"
          ),
          m(
            "ion-button",
            {
              size: "small",
              onclick: () =>
                previewFit(previewFit() === "cover" ? "contain" : "cover"),
            },
            previewFit() === "cover" ? "Zoom out" : "Fill"
          ),
          m(
            "ion-button",
            {
              size: "small",
              disabled: !tracking.ready(),
              onclick: () =>
                tracking.paused()
                  ? trackingSession.resume()
                  : trackingSession.pause(),
            },
            tracking.paused()
              ? "Resume Tracking"
              : tracking.ready()
              ? "Pause Tracking"
              : "Starting…"
          ),
        ]),
        m("section.pose-world-diagnostic", [
          m("strong", "Pose World Diagnostic"),
          m("span", `Status: ${diagnosticPoseWorldSource() === null ? "LIVE" : "FROZEN"}`),
          m("span", "Axis: Y · Projection: Orthographic · Origin: Hip midpoint"),
          m("span", `Angle: ${diagnosticPoseWorldAngle()}°`),
          m("div.pose-world-diagnostic-controls", [
            m("ion-button", {
              size: "small",
              fill: "outline",
              disabled: (frame.poseWorldLandmarks?.length ?? 0) < 29,
              onclick: freezePoseWorld,
            }, "Freeze Pose"),
            m("ion-button", {
              size: "small",
              fill: "outline",
              disabled: diagnosticPoseWorldSource() === null,
              onclick: () => {
                clearComparisonFrame();
                clearPoseWorldDiagnostic();
              },
            }, "Resume Live"),
            ...[0, 45, 90, 180, 270, 360].map((angle) => m("ion-button", {
              size: "small",
              fill: diagnosticPoseWorldAngle() === angle ? "solid" : "outline",
              disabled: diagnosticPoseWorldSource() === null,
              "aria-pressed": diagnosticPoseWorldAngle() === angle ? "true" : "false",
              "aria-label": `Set Y rotation to ${angle} degrees`,
              onclick: () => setDiagnosticPoseWorldAngle(angle),
            }, diagnosticPoseWorldAngle() === angle ? `${angle}° ✓` : `${angle}°`)),
            m("ion-button", {
              size: "small",
              fill: "outline",
              disabled: diagnosticPoseWorldSource() === null,
              onclick: snapshotPoseWorldDiagnostic,
            }, "Snapshot"),
            m("ion-button", {
              size: "small",
              fill: "outline",
              disabled: diagnosticPoseWorldSource() === null,
              onclick: snapshotAllPoseWorldAngles,
            }, "Snapshot All Angles"),
          ]),
        ]),
        startupError() ? m("p.tracking-error", startupError()) : null,
        m(TrackingHud),
      ]
    );
  },
};
export default TrackingViewer;
