import { elements, features, tracking } from "./store";
import type { Landmark, TrackingFrame } from "../../domain/tracking";

const connections: readonly [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24],
  [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
];

type RenderFlags = { readonly pose: boolean; readonly hands: boolean; readonly face: boolean };
type CanvasPoint = { readonly x: number; readonly y: number };
type PointMapper = (point: Landmark) => CanvasPoint;
type DrawPoints = (ctx: CanvasRenderingContext2D, points: readonly Landmark[], color: string, radius: number, map: PointMapper) => void;
type DrawPose = (ctx: CanvasRenderingContext2D, points: readonly Landmark[], map: PointMapper) => void;

const drawPoints: DrawPoints = (ctx, points, color, radius, map) => {
  ctx.fillStyle = color;
  points.forEach((point) => {
    const target = map(point);
    ctx.beginPath();
    ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
};

const drawPose: DrawPose = (ctx, points, map) => {
  drawPoints(ctx, points, "#ef4444", 4, map);
  const mapped = points.map(map);
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1;
  connections.forEach(([start, end]) => {
    if (!mapped[start] || !mapped[end]) return;
    ctx.beginPath();
    ctx.moveTo(mapped[start].x, mapped[start].y);
    ctx.lineTo(mapped[end].x, mapped[end].y);
    ctx.stroke();
  });
};

type DrawTrackingFrame = (ctx: CanvasRenderingContext2D, frame: TrackingFrame, flags?: RenderFlags, map?: PointMapper) => void;
type DefaultMapper = (ctx: CanvasRenderingContext2D) => PointMapper;
const defaultMapper: DefaultMapper = (ctx) => (point) => ({ x: point.x * ctx.canvas.width, y: point.y * ctx.canvas.height });

export const drawTrackingFrame: DrawTrackingFrame = (ctx, frame, flags = { pose: true, hands: true, face: true }, map = defaultMapper(ctx)) => {
  if (flags.pose) drawPose(ctx, frame.poseLandmarks, map);
  if (flags.hands) {
    drawPoints(ctx, frame.leftHandLandmarks, "#22c55e", 4, map);
    drawPoints(ctx, frame.rightHandLandmarks, "#22c55e", 4, map);
  }
  if (flags.face) drawPoints(ctx, frame.faceLandmarks, "#f8fafc", 2, map);
};

type CoverMapper = (canvas: HTMLCanvasElement, video: HTMLVideoElement | null) => PointMapper;
const coverMapper: CoverMapper = (canvas, video) => {
  const videoWidth = video?.videoWidth || canvas.width;
  const videoHeight = video?.videoHeight || canvas.height;
  const videoAspect = videoWidth / videoHeight;
  const canvasAspect = canvas.width / canvas.height;
  const renderedWidth = videoAspect > canvasAspect ? canvas.height * videoAspect : canvas.width;
  const renderedHeight = videoAspect > canvasAspect ? canvas.height : canvas.width / videoAspect;
  const offsetX = (canvas.width - renderedWidth) / 2;
  const offsetY = (canvas.height - renderedHeight) / 2;
  return (point) => ({ x: offsetX + point.x * renderedWidth, y: offsetY + point.y * renderedHeight });
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
    if (canvas && context && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
      elements.context(context);
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);
      drawTrackingFrame(context, tracking.frame(), features(), coverMapper(canvas, elements.video()));
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

export const renderService = { startLoop: startRenderLoop, stopLoop: stopRenderLoop };
