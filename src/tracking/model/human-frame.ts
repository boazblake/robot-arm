import {
  buildCanonicalHumanScene,
  type CanonicalArm,
  type CanonicalHumanScene,
  type CanonicalHumanSpace,
  type HandControlPoint,
  type VisualHandMesh,
} from "./canonical-coordinate-pipeline";

/** The single representation shared by rendering, calibration, and control. */
export type HumanFrame = CanonicalHumanScene;
export type HumanPoint = CanonicalHumanSpace;
export type HumanArm = CanonicalArm;
export type { HandControlPoint, VisualHandMesh };
export const createHumanFrame = buildCanonicalHumanScene;
export { projectHumanPoint, projectTsoding, uiTransform } from "./canonical-coordinate-pipeline";
export type { Vector3 } from "./canonical-coordinate-pipeline";
