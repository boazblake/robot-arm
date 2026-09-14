import type { ArmSide } from "./arm-calibration";
import type { ArmDisplacement } from "./arm-calibration";

export type WorkspacePosition = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
}>;

export type WorkspaceMappingResult =
  | Readonly<{
      readonly ok: true;
      readonly position: WorkspacePosition;
    }>
  | Readonly<{
      readonly ok: false;
      readonly reason: "workspace-invalid";
    }>;

/** Requirement 14's pure spatial transformation boundary. */
export type WorkspaceMapping = Readonly<{
  readonly mapDisplacement: (
    side: ArmSide,
    displacement: ArmDisplacement,
  ) => WorkspaceMappingResult;
}>;
