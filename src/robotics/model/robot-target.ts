export type ArmSide = "left" | "right";

export type RobotPosition = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
}>;

export type RobotOrientation = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}>;

export type GripperIntent = "open" | "close";

export type RobotTarget = Readonly<{
  readonly side: ArmSide;
  readonly position: RobotPosition;
  readonly orientation?: RobotOrientation;
  readonly gripper?: GripperIntent;
  readonly sourceTimestamp: number;
  readonly sequence: number;
}>;

export type RobotTargetInput = Readonly<{
  readonly side: ArmSide;
  readonly position?: Readonly<Partial<RobotPosition>>;
  readonly orientation?: Readonly<Partial<RobotOrientation>>;
  readonly gripper?: string;
  readonly sourceTimestamp: number;
  readonly sequence: number;
}>;

export type RobotTargetResult =
  | Readonly<{ readonly ok: true; readonly target: RobotTarget }>
  | Readonly<{
      readonly ok: false;
      readonly reason:
        | "side-invalid"
        | "position-invalid"
        | "orientation-invalid"
        | "timestamp-invalid"
        | "sequence-invalid"
        | "gripper-invalid";
    }>;

export { createRobotTarget } from "./robot-target-validation";
