import type { TrackingFrame } from "./tracking-frame";
import { rotateIntoPreviewFrame } from "../../shared/geometry/rotation";
import {
  readDetectorObservations,
  type DetectorObservations,
  type HandObservation,
  type PoseObservation,
} from "./detector-observations";

export type ImagePoint = Readonly<{ readonly x: number; readonly y: number }>;
export type Vector3 = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
}>;
declare const detectorLandmarkBrand: unique symbol;
declare const canonicalPointBrand: unique symbol;
declare const canonicalVectorBrand: unique symbol;
declare const displacementBrand: unique symbol;
declare const uiFrameBrand: unique symbol;
declare const workspaceBrand: unique symbol;
export type DetectorLandmarkSpace = Vector3 &
  Readonly<{ readonly [detectorLandmarkBrand]: "detector-landmark" }>;
export type CanonicalHumanSpace = Vector3 &
  Readonly<{ readonly [canonicalPointBrand]: "canonical-point" }>;
export type CanonicalPoint = CanonicalHumanSpace;
export type CanonicalVector = Vector3 &
  Readonly<{ readonly [canonicalVectorBrand]: "canonical-vector" }>;
export type CalibratedDisplacementSpace = Vector3 &
  Readonly<{ readonly [displacementBrand]: "calibrated-displacement" }>;
export type CalibratedDisplacement = CalibratedDisplacementSpace;
export type UiFrameSpace = Vector3 &
  Readonly<{ readonly [uiFrameBrand]: "ui-frame" }>;
export type RobotWorkspaceSpace = Vector3 &
  Readonly<{ readonly [workspaceBrand]: "robot-workspace" }>;
export type RobotWorkspacePosition = RobotWorkspaceSpace;
export type CameraKind = "front" | "rear";

export type VisualHandMesh = Readonly<{
  readonly points: readonly CanonicalHumanSpace[];
  readonly wrist: CanonicalHumanSpace;
}>;
export type HandControlPoint = Readonly<{
  readonly palm: CanonicalHumanSpace;
  readonly wrist: CanonicalHumanSpace;
  readonly localScale: number;
}>;
export type CanonicalArm = Readonly<{
  readonly shoulder: CanonicalHumanSpace;
  readonly elbow: CanonicalHumanSpace;
  readonly wrist: CanonicalHumanSpace;
  readonly hand: HandControlPoint | null;
  readonly visualHand: VisualHandMesh | null;
}>;
export type CanonicalHumanScene = Readonly<{
  readonly timestamp: number;
  readonly origin: CanonicalHumanSpace;
  readonly axes: Readonly<{
    readonly horizontal: Vector3;
    readonly vertical: Vector3;
    readonly depth: Vector3;
  }>;
  readonly body: readonly CanonicalHumanSpace[];
  readonly face: readonly CanonicalHumanSpace[];
  readonly faceAnchor: CanonicalHumanSpace | null;
  /** Detector-space torso origin used only as the rendering translation pivot. */
  readonly renderAnchor: Readonly<{ readonly x: number; readonly y: number }>;
  readonly renderScale: number;
  readonly arms: Readonly<{
    readonly left: CanonicalArm | null;
    readonly right: CanonicalArm | null;
  }>;
}>;

const vector = (x: number, y: number, z: number): Vector3 =>
  Object.freeze({ x, y, z });
type BrandVector = <T extends Vector3>(point: Vector3) => T;
const brandVector: BrandVector = <T extends Vector3>(point: Vector3) =>
  Object.freeze({ x: point.x, y: point.y, z: point.z }) as T;
const detector = (
  point: ImagePoint & Readonly<{ readonly z: number }>
): DetectorLandmarkSpace => brandVector<DetectorLandmarkSpace>(point);
const canonical = (point: Vector3): CanonicalHumanSpace =>
  brandVector<CanonicalHumanSpace>(point);
const sub = (a: Vector3, b: Vector3): Vector3 =>
  vector(a.x - b.x, a.y - b.y, a.z - b.z);
const add = (a: Vector3, b: Vector3): Vector3 =>
  vector(a.x + b.x, a.y + b.y, a.z + b.z);
const scale = (a: Vector3, amount: number): Vector3 =>
  vector(a.x * amount, a.y * amount, a.z * amount);
const dot = (a: Vector3, b: Vector3): number =>
  a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vector3, b: Vector3): Vector3 =>
  vector(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const magnitude = (a: Vector3): number => Math.hypot(a.x, a.y, a.z);
const unit = (a: Vector3, fallback: Vector3): Vector3 => {
  const length = magnitude(a);
  return length > 1e-6 ? scale(a, 1 / length) : fallback;
};
const midpoint = (a: Vector3, b: Vector3): Vector3 => scale(add(a, b), 0.5);
const finitePose = (
  point: PoseObservation | undefined
): DetectorLandmarkSpace | null =>
  point !== undefined &&
  Number.isFinite(point.x) &&
  Number.isFinite(point.y) &&
  Number.isFinite(point.poseDepth)
    ? detector({ x: point.x, y: point.y, z: point.poseDepth })
    : null;
const posePoint = (
  observations: DetectorObservations,
  index: number
): DetectorLandmarkSpace | null => finitePose(observations.pose[index]);

/**
 * The canonical axes are: +x from anatomical left shoulder to right shoulder,
 * +y upwards along the torso, and +z = +x × +y. If shoulders or hips are
 * absent, the image axes (x right, y up, z toward the camera) are used; this
 * keeps the sign deterministic and marks no synthetic hand depth as body z.
 */
const bodyBasis = (observations: DetectorObservations) => {
  const leftShoulder = posePoint(observations, 11);
  const rightShoulder = posePoint(observations, 12);
  const leftHip = posePoint(observations, 23);
  const rightHip = posePoint(observations, 24);
  const shoulderMid =
    leftShoulder && rightShoulder
      ? midpoint(leftShoulder, rightShoulder)
      : null;
  const hipMid = leftHip && rightHip ? midpoint(leftHip, rightHip) : null;
  const origin =
    shoulderMid && hipMid
      ? midpoint(shoulderMid, hipMid)
      : shoulderMid ?? hipMid ?? vector(0.5, 0.5, 0);
  const horizontal =
    leftShoulder && rightShoulder
      ? unit(sub(rightShoulder, leftShoulder), vector(1, 0, 0))
      : vector(1, 0, 0);
  const vertical =
    hipMid && shoulderMid
      ? unit(sub(shoulderMid, hipMid), vector(0, -1, 0))
      : vector(0, -1, 0);
  const orthogonalVertical = unit(
    sub(vertical, scale(horizontal, dot(vertical, horizontal))),
    vector(0, -1, 0)
  );
  const depth = unit(cross(horizontal, orthogonalVertical), vector(0, 0, -1));
  const measuredShoulderWidth =
    leftShoulder && rightShoulder
      ? magnitude(sub(rightShoulder, leftShoulder))
      : 0;
  return {
    origin,
    horizontal,
    vertical: orthogonalVertical,
    depth,
    shoulderWidth: measuredShoulderWidth > 1e-6 ? measuredShoulderWidth : 1,
  };
};

const toCanonical = (
  point: DetectorLandmarkSpace,
  basis: ReturnType<typeof bodyBasis>
): CanonicalHumanSpace => {
  const relative = sub(point, basis.origin);
  return canonical(
    vector(
      dot(relative, basis.horizontal) / basis.shoulderWidth,
      dot(relative, basis.vertical) / basis.shoulderWidth,
      dot(relative, basis.depth) / basis.shoulderWidth
    )
  );
};

const handMesh = (
  hand: readonly HandObservation[],
  poseWrist: CanonicalHumanSpace,
  basis: ReturnType<typeof bodyBasis>
): {
  readonly visualHand: VisualHandMesh;
  readonly control: HandControlPoint;
} | null => {
  const wrist = hand[0];
  if (wrist === undefined || hand.length === 0) return null;
  const palmWidthPoints = [hand[5], hand[17]].filter(
    (point): point is HandObservation => point !== undefined
  );
  const palmWidth =
    palmWidthPoints.length === 2
      ? Math.hypot(
          palmWidthPoints[0].x - palmWidthPoints[1].x,
          palmWidthPoints[0].y - palmWidthPoints[1].y
        )
      : 0;
  const localScale = palmWidth > 1e-6 ? basis.shoulderWidth / palmWidth : 1;
  const local = (point: HandObservation): Vector3 =>
    vector(
      (point.x - wrist.x) * localScale,
      -(point.y - wrist.y) * localScale,
      (point.wristRelativeDepth - wrist.wristRelativeDepth) * localScale
    );
  const points = hand.map((point) => canonical(add(poseWrist, local(point))));
  const palmPoints = [0, 5, 9, 13, 17]
    .map((index) => hand[index])
    .filter((point): point is HandObservation => point !== undefined);
  const palmOffset =
    palmPoints.length === 0
      ? vector(0, 0, 0)
      : scale(
          palmPoints.map(local).reduce(add, vector(0, 0, 0)),
          1 / palmPoints.length
        );
  const palm = canonical(add(poseWrist, palmOffset));
  return {
    visualHand: Object.freeze({
      points: Object.freeze(points),
      wrist: poseWrist,
    }),
    control: Object.freeze({ palm, wrist: poseWrist, localScale }),
  };
};

const arm = (
  observations: DetectorObservations,
  side: "left" | "right",
  basis: ReturnType<typeof bodyBasis>
): CanonicalArm | null => {
  const indices = side === "left" ? [11, 13, 15] : [12, 14, 16];
  const shoulder = posePoint(observations, indices[0]);
  const elbow = posePoint(observations, indices[1]);
  const wrist = posePoint(observations, indices[2]);
  if (!shoulder || !elbow || !wrist) return null;
  const canonicalWrist = toCanonical(wrist, basis);
  const hand = side === "left" ? observations.leftHand : observations.rightHand;
  const handData = handMesh(hand, canonicalWrist, basis);
  return Object.freeze({
    shoulder: toCanonical(shoulder, basis),
    elbow: toCanonical(elbow, basis),
    wrist: canonicalWrist,
    hand: handData?.control ?? null,
    visualHand: handData?.visualHand ?? null,
  });
};

export type BuildCanonicalHumanScene = (
  frame: TrackingFrame
) => CanonicalHumanScene;
export const buildCanonicalHumanScene: BuildCanonicalHumanScene = (frame) => {
  const observations = readDetectorObservations(frame);
  const basis = bodyBasis(observations);
  const body = observations.pose.map((point) =>
    toCanonical(detector({ x: point.x, y: point.y, z: point.poseDepth }), basis)
  );
  const face = observations.face.map((point) =>
    toCanonical(detector({ x: point.x, y: point.y, z: point.faceDepth }), basis)
  );
  return Object.freeze({
    timestamp: observations.timestamp,
    origin: canonical(vector(0, 0, 0)),
    axes: Object.freeze({
      horizontal: basis.horizontal,
      vertical: basis.vertical,
      depth: basis.depth,
    }),
    body: Object.freeze(body),
    face: Object.freeze(face),
    faceAnchor: face[1] ?? face[0] ?? null,
    renderAnchor: Object.freeze({ x: basis.origin.x, y: basis.origin.y }),
    renderScale: basis.shoulderWidth,
    arms: Object.freeze({
      left: arm(observations, "left", basis),
      right: arm(observations, "right", basis),
    }),
  });
};

export type UiFrameTransform = Readonly<{
  readonly rotationDegrees: number;
  readonly camera: CameraKind;
}>;
export const uiTransform = (
  transform: UiFrameTransform,
  point: Vector3
): UiFrameSpace => {
  const rotated = rotateIntoPreviewFrame(transform.rotationDegrees, point);
  return brandVector<UiFrameSpace>({
    x: transform.camera === "front" ? -rotated.x : rotated.x,
    y: rotated.y,
    z: rotated.z,
  });
};
export const projectTsoding = (
  point: UiFrameSpace,
  cameraDistance: number
): Readonly<{ readonly x: number; readonly y: number }> => ({
  x: point.x / (point.z + cameraDistance),
  y: point.y / (point.z + cameraDistance),
});

export type ProjectHumanPoint = (
  scene: CanonicalHumanScene,
  point: Vector3,
  transform: UiFrameTransform,
  cameraDistance: number
) => ImagePoint;
export const projectHumanPoint: ProjectHumanPoint = (
  scene,
  point,
  transform,
  cameraDistance
) => {
  const projected = projectTsoding(
    uiTransform(transform, point),
    cameraDistance
  );
  const horizontal = scale(
    scene.axes.horizontal,
    projected.x * cameraDistance * scene.renderScale
  );
  const vertical = scale(
    scene.axes.vertical,
    projected.y * cameraDistance * scene.renderScale
  );
  const anchorX =
    transform.camera === "front"
      ? 1 - scene.renderAnchor.x
      : scene.renderAnchor.x;
  return Object.freeze({
    x: anchorX + horizontal.x,
    y: scene.renderAnchor.y + vertical.y,
  });
};

export const rotateVectorPreservingDistance = (
  transform: UiFrameTransform,
  point: Vector3
): UiFrameSpace => uiTransform(transform, point);

export const calibratedDisplacement = (
  current: CanonicalHumanSpace,
  neutral: CanonicalHumanSpace
): CalibratedDisplacementSpace =>
  brandVector<CalibratedDisplacementSpace>({
    x: current.x - neutral.x,
    y: current.y - neutral.y,
    z: current.z - neutral.z,
  });
export const mapUiFrameToWorkspace = (
  point: UiFrameSpace,
  camera: CameraKind
): RobotWorkspaceSpace =>
  brandVector<RobotWorkspaceSpace>({
    x: camera === "front" ? -point.x : point.x,
    y: point.y,
    z: point.z,
  });
