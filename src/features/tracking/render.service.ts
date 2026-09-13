import { elements, features, tracking } from "./store";
import type { Landmark } from "../../domain/tracking";

const connections: number[][] = [[0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[24,26],[25,27],[26,28]];
let active = false;
let frame: number | null = null;
const draw = (ctx: CanvasRenderingContext2D, points: Landmark[], color: string, radius: number) => {
  ctx.fillStyle = color; ctx.strokeStyle = color;
  points.forEach((point) => { if (point.visibility !== undefined && point.visibility < .3) return; ctx.beginPath(); ctx.arc(point.x * ctx.canvas.width, point.y * ctx.canvas.height, radius, 0, Math.PI * 2); ctx.fill(); });
  connections.forEach(([a, b]) => { if (!points[a] || !points[b]) return; ctx.beginPath(); ctx.moveTo(points[a].x * ctx.canvas.width, points[a].y * ctx.canvas.height); ctx.lineTo(points[b].x * ctx.canvas.width, points[b].y * ctx.canvas.height); ctx.stroke(); });
};
export const renderService = {
  startLoop: () => { if (active) return; active = true; const loop = () => { if (!active) return; const canvas = elements.canvas(); const ctx = elements.context() ?? canvas?.getContext("2d") ?? null; if (canvas && ctx) { elements.context(ctx); canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; ctx.clearRect(0, 0, canvas.width, canvas.height); const data = tracking.frame(); if (features().pose) draw(ctx, data.poseLandmarks, "#ef4444", 4); if (features().hands) { draw(ctx, data.leftHandLandmarks, "#22c55e", 4); draw(ctx, data.rightHandLandmarks, "#22c55e", 4); } if (features().face) draw(ctx, data.faceLandmarks, "#f8fafc", 1); } frame = requestAnimationFrame(loop); }; loop(); },
  stopLoop: () => { active = false; if (frame !== null) cancelAnimationFrame(frame); frame = null; },
};
