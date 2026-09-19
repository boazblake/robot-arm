export type RobotStatePosition = Readonly<{ x: number; y: number; z: number }>;
export type RobotStateOrientation = Readonly<{ x: number; y: number; z: number; w: number }>;
export type RobotStateGripper = "open" | "close";
export type RobotArmState = Readonly<{
  position: RobotStatePosition;
  orientation?: RobotStateOrientation;
  gripper?: RobotStateGripper;
}>;
export type RobotState = Readonly<{
  observedAt: number;
  arms: Readonly<{ left: RobotArmState | null; right: RobotArmState | null }>;
}>;
export type RobotStateResult = Readonly<{ ok: true; state: RobotState }> | Readonly<{ ok: false; reason: "timestamp-invalid" | "arms-invalid" }>;

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const orientation = (value: unknown): RobotStateOrientation | null => {
  if (!record(value) || !finite(value.x) || !finite(value.y) || !finite(value.z) || !finite(value.w)) return null;
  const magnitude = Math.hypot(value.x, value.y, value.z, value.w);
  return magnitude === 0 ? null : Object.freeze({ x: value.x / magnitude, y: value.y / magnitude, z: value.z / magnitude, w: value.w / magnitude });
};
const arm = (value: unknown): RobotArmState | null => {
  if (!record(value) || !record(value.position) || !finite(value.position.x) || !finite(value.position.y) || !finite(value.position.z)) return null;
  const nextOrientation = value.orientation === undefined ? undefined : orientation(value.orientation);
  if (value.orientation !== undefined && nextOrientation === null) return null;
  if (value.gripper !== undefined && value.gripper !== "open" && value.gripper !== "close") return null;
  return Object.freeze({
    position: Object.freeze({ x: value.position.x, y: value.position.y, z: value.position.z }),
    ...(nextOrientation === undefined || nextOrientation === null ? {} : { orientation: nextOrientation }),
    ...(value.gripper === undefined ? {} : { gripper: value.gripper }),
  });
};

export const createRobotState = (input: unknown): RobotStateResult => {
  if (!record(input) || !finite(input.observedAt) || input.observedAt < 0) return Object.freeze({ ok: false, reason: "timestamp-invalid" });
  if (!record(input.arms)) return Object.freeze({ ok: false, reason: "arms-invalid" });
  const left = input.arms.left === null ? null : arm(input.arms.left);
  const right = input.arms.right === null ? null : arm(input.arms.right);
  if ((input.arms.left !== null && left === null) || (input.arms.right !== null && right === null)) return Object.freeze({ ok: false, reason: "arms-invalid" });
  return Object.freeze({ ok: true, state: Object.freeze({ observedAt: input.observedAt, arms: Object.freeze({ left, right }) }) });
};
