export interface Point3D { x: number; y: number; z?: number }

export const distance = (a: Point3D, b: Point3D): number =>
  Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

export const angle = (a: Point3D, vertex: Point3D, c: Point3D): number => {
  const ab = { x: a.x - vertex.x, y: a.y - vertex.y, z: (a.z ?? 0) - (vertex.z ?? 0) };
  const cb = { x: c.x - vertex.x, y: c.y - vertex.y, z: (c.z ?? 0) - (vertex.z ?? 0) };
  const denominator = Math.hypot(ab.x, ab.y, ab.z) * Math.hypot(cb.x, cb.y, cb.z);
  if (denominator === 0) return 0;
  return Math.acos(Math.min(1, Math.max(-1, (ab.x * cb.x + ab.y * cb.y + ab.z * cb.z) / denominator))) * 180 / Math.PI;
};
