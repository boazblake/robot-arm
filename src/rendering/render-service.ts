import { diagnosticPoseWorldAngle, diagnosticPoseWorldSource, elements, features, previewFit, previewRotationDegrees, tracking } from "../app/session/store";
import { orthographicProject, rotatePoseWorld, poseHipCenter, type Point3D as WorldPoint3D } from "../tracking/model/pose-world-diagnostic";
import { alignHandDepthToPose } from "../shared/geometry/preview-depth";
import { rotatePreviewMesh, rotatePreviewPoint } from "../shared/geometry/preview-point";
import type { TrackingFrame } from "../tracking/model/tracking-frame";

const poseConnections: readonly [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 7],
  [0, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [24, 26],
  [25, 27],
  [26, 28],
];
const handConnections: readonly [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];

type RenderFlags = {
  readonly pose: boolean;
  readonly hands: boolean;
  readonly face: boolean;
};
type CanvasPoint = { readonly x: number; readonly y: number };
type Point3D = Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
type PointMapper = (point: Point3D) => CanvasPoint;
type DrawPoints = (
  ctx: CanvasRenderingContext2D,
  points: readonly Point3D[],
  color: string,
  radius: number,
  map: PointMapper
) => void;
type DrawSkeleton = (
  ctx: CanvasRenderingContext2D,
  points: readonly Point3D[],
  color: string,
  radius: number,
  map: PointMapper,
  links: readonly [number, number][]
) => void;
const drawPoints: DrawPoints = (ctx, points, color, radius, map) => {
  ctx.fillStyle = color;
  points.forEach((point) => {
    const target = map(point);
    ctx.beginPath();
    ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
};

const drawSkeleton: DrawSkeleton = (ctx, points, color, radius, map, links) => {
  drawPoints(ctx, points, color, radius, map);
  const mapped = points.map(map);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  links.forEach(([start, end]) => {
    if (!mapped[start] || !mapped[end]) return;
    ctx.beginPath();
    ctx.moveTo(mapped[start].x, mapped[start].y);
    ctx.lineTo(mapped[end].x, mapped[end].y);
    ctx.stroke();
  });
};

type DrawPose = (
  ctx: CanvasRenderingContext2D,
  points: readonly Point3D[],
  map: PointMapper
) => void;
const drawPose: DrawPose = (ctx, points, map) =>
  drawSkeleton(ctx, points, "#ef4444", 4, map, poseConnections);

const drawFrozenPoseWorld: (ctx: CanvasRenderingContext2D, source: readonly WorldPoint3D[], degrees: number) => void = (ctx, source, degrees) => {
  if (source.length < 29) return;
  const center = poseHipCenter(source);
  const rotated = rotatePoseWorld(source, "y", degrees, center);
  const scale = Math.min(ctx.canvas.width, ctx.canvas.height) * 0.8;
  const map: PointMapper = (point) => orthographicProject(point, ctx.canvas.width, ctx.canvas.height, scale);
  drawPose(ctx, rotated, map);
};

type DrawTrackingFrame = (
  ctx: CanvasRenderingContext2D,
  frame: TrackingFrame,
  flags?: RenderFlags,
  map?: PointMapper
) => void;
type DefaultMapper = (ctx: CanvasRenderingContext2D) => PointMapper;
const defaultMapper: DefaultMapper = (ctx) => (point) => ({
  x: point.x * ctx.canvas.width,
  y: point.y * ctx.canvas.height,
});


export const drawTrackingFrame: DrawTrackingFrame = (
  ctx,
  frame,
  flags = { pose: true, hands: true, face: true },
  map = defaultMapper(ctx)
) => {
  if (flags.pose) drawPose(ctx, frame.poseLandmarks, map);
  if (flags.hands) {
    drawSkeleton(
      ctx,
      frame.leftHandLandmarks,
      "#22c55e",
      4,
      map,
      handConnections
    );
    drawSkeleton(
      ctx,
      frame.rightHandLandmarks,
      "#22c55e",
      4,
      map,
      handConnections
    );
  }
  if (flags.face) drawPoints(ctx, frame.faceLandmarks, "#f8fafc", 2, map);
};

type NormalizedPoint = Point3D;
type PreviewMapper = (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement | null,
  fit: "cover" | "contain",
  rotationDegrees?: number,
) => (point: NormalizedPoint) => CanvasPoint;
const previewMapper: PreviewMapper = (canvas, video, fit, rotationDegrees = previewRotationDegrees()) => {
  const videoWidth = video?.videoWidth || canvas.width;
  const videoHeight = video?.videoHeight || canvas.height;
  const videoAspect = videoWidth / videoHeight;
  const canvasAspect = canvas.width / canvas.height;
  const isCover = fit === "cover";
  const renderedWidth = isCover
    ? videoAspect > canvasAspect ? canvas.height * videoAspect : canvas.width
    : videoAspect > canvasAspect ? canvas.width : canvas.height * videoAspect;
  const renderedHeight = isCover
    ? videoAspect > canvasAspect ? canvas.height : canvas.width / videoAspect
    : videoAspect > canvasAspect ? canvas.width / videoAspect : canvas.height;
  const offsetX = (canvas.width - renderedWidth) / 2;
  const offsetY = (canvas.height - renderedHeight) / 2;
  return (point) => {
    const rotated = rotatePreviewPoint(point, rotationDegrees);
    return {
      x: offsetX + rotated.x * renderedWidth,
      y: offsetY + rotated.y * renderedHeight,
    };
  };
};

type DrawPreviewFrame = (
  ctx: CanvasRenderingContext2D,
  frame: TrackingFrame,
  flags: RenderFlags,
  map: PointMapper,
) => void;
export const drawPreviewFrame: DrawPreviewFrame = (ctx, frame, flags, map) => {
  if (flags.pose) drawPose(ctx, frame.poseLandmarks, map);
  if (flags.hands) {
    drawSkeleton(ctx, frame.leftHandLandmarks, "#22c55e", 4, map, handConnections);
    drawSkeleton(ctx, frame.rightHandLandmarks, "#22c55e", 4, map, handConnections);
  }
  if (flags.face) {
    const rotatedFace = rotatePreviewMesh(frame.faceLandmarks, previewRotationDegrees());
    const faceMap = previewMapper(ctx.canvas, elements.video(), previewFit(), 0);
    drawPoints(ctx, rotatedFace, "#f8fafc", 2, faceMap);
  }
};

let active = false;
let animationFrame: number | null = null;
type StartRenderLoop = () => void;
const startRenderLoop: StartRenderLoop = () => {
  if (active) return;
  active = true;
  const loop = () => {
    if (!active) return;
    const canvas = elements.canvas();
    const context = elements.context() ?? canvas?.getContext("2d") ?? null;
    if (
      canvas &&
      context &&
      canvas.clientWidth > 0 &&
      canvas.clientHeight > 0
    ) {
      elements.context(context);
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);
      const frozenPose = diagnosticPoseWorldSource();
      if (frozenPose !== null) {
        drawFrozenPoseWorld(context, frozenPose, diagnosticPoseWorldAngle());
      } else {
        drawPreviewFrame(
          context,
          alignHandDepthToPose(tracking.frame()),
          features(),
          previewMapper(canvas, elements.video(), previewFit())
        );
      }
    }
    animationFrame = requestAnimationFrame(loop);
  };
  loop();
};

type StopRenderLoop = () => void;
const stopRenderLoop: StopRenderLoop = () => {
  active = false;
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
};

export const renderService = {
  startLoop: startRenderLoop,
  stopLoop: stopRenderLoop,
};
