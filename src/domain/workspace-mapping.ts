import type { ArmDisplacement, ArmSide } from "./arm-calibration";

export type WorkspacePosition = Readonly<{
  readonly x: number;
  readonly y: number;
  readonly z: number;
}>;

export type AxisSource = "x" | "y" | "z";
export type AxisDirection = 1 | -1;

export type AxisMapping = Readonly<{
  readonly source: AxisSource;
  readonly direction: AxisDirection;
  readonly range: number;
}>;

export type WorkspaceMappingConfig = Readonly<{
  readonly x: AxisMapping;
  readonly y: AxisMapping;
  readonly z: AxisMapping;
}>;

export type WorkspaceMappingConfigInput = Readonly<{
  readonly x: Readonly<{
    readonly source: string;
    readonly direction: number;
    readonly range: number;
  }>;
  readonly y: Readonly<{
    readonly source: string;
    readonly direction: number;
    readonly range: number;
  }>;
  readonly z: Readonly<{
    readonly source: string;
    readonly direction: number;
    readonly range: number;
  }>;
}>;

export type WorkspaceMappingConfigResult =
  | Readonly<{
      readonly ok: true;
      readonly mapping: WorkspaceMapping;
    }>
  | Readonly<{
      readonly ok: false;
      readonly reason:
        | "source-axis-invalid"
        | "direction-invalid"
        | "range-invalid"
        | "duplicate-source-axis";
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

export type WorkspaceMapping = Readonly<{
  readonly config: WorkspaceMappingConfig;
  readonly mapDisplacement: (
    side: ArmSide,
    displacement: ArmDisplacement,
  ) => WorkspaceMappingResult;
}>;

type IsAxisSource = (value: string) => value is AxisSource;

const isAxisSource: IsAxisSource = (value): value is AxisSource =>
  value === "x" || value === "y" || value === "z";

type IsAxisDirection = (value: number) => value is AxisDirection;

const isAxisDirection: IsAxisDirection = (value): value is AxisDirection =>
  value === 1 || value === -1;

type IsFiniteNumber = (value: unknown) => value is number;

const isFiniteNumber: IsFiniteNumber = (value): value is number =>
  typeof value === "number" && Number.isFinite(value);

type ReadAxisMapping = (
  value: WorkspaceMappingConfigInput["x"],
) => AxisMapping | "source-axis-invalid" | "direction-invalid" | "range-invalid";

const readAxisMapping: ReadAxisMapping = (value) => {
  if (!isAxisSource(value.source)) return "source-axis-invalid";
  if (!isAxisDirection(value.direction)) return "direction-invalid";
  if (!isFiniteNumber(value.range) || value.range <= 0) return "range-invalid";
  return Object.freeze({
    source: value.source,
    direction: value.direction,
    range: value.range,
  });
};

type CreateWorkspaceMapping = (
  config: WorkspaceMappingConfigInput,
) => WorkspaceMappingConfigResult;

export const createWorkspaceMapping: CreateWorkspaceMapping = (config) => {
  const axes = [config.x, config.y, config.z].map(readAxisMapping);
  const invalidReason = axes.find(
    (axis): axis is "source-axis-invalid" | "direction-invalid" | "range-invalid" =>
      typeof axis === "string",
  );
  if (invalidReason !== undefined) return Object.freeze({ ok: false, reason: invalidReason });

  const validAxes = axes as readonly AxisMapping[];
  const sources = validAxes.map((axis) => axis.source);
  if (new Set(sources).size !== sources.length) {
    return Object.freeze({ ok: false, reason: "duplicate-source-axis" });
  }

  const frozenConfig: WorkspaceMappingConfig = Object.freeze({
    x: validAxes[0],
    y: validAxes[1],
    z: validAxes[2],
  });
  return Object.freeze({
    ok: true,
    mapping: Object.freeze({
      config: frozenConfig,
      mapDisplacement: (
        _side: ArmSide,
        displacement: ArmDisplacement,
      ): WorkspaceMappingResult => mapDisplacement(frozenConfig, displacement),
    }),
  });
};

type ReadDisplacementAxis = (
  displacement: ArmDisplacement,
  source: AxisSource,
) => number;

const readDisplacementAxis: ReadDisplacementAxis = (displacement, source) =>
  displacement[source];

type ClampWorkspaceValue = (value: number) => number;

const clampWorkspaceValue: ClampWorkspaceValue = (value) =>
  Math.min(1, Math.max(-1, value));

type MapAxis = (
  mapping: AxisMapping,
  displacement: ArmDisplacement,
) => number;

const mapAxis: MapAxis = (mapping, displacement) =>
  clampWorkspaceValue(
    (readDisplacementAxis(displacement, mapping.source) / mapping.range) *
      mapping.direction,
  );

type IsFiniteDisplacement = (value: ArmDisplacement) => boolean;

const isFiniteDisplacement: IsFiniteDisplacement = (value) =>
  isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.z);

type MapDisplacement = (
  config: WorkspaceMappingConfig,
  displacement: ArmDisplacement,
) => WorkspaceMappingResult;

const mapDisplacement: MapDisplacement = (config, displacement) => {
  if (!isFiniteDisplacement(displacement)) {
    return Object.freeze({ ok: false, reason: "workspace-invalid" });
  }

  return Object.freeze({
    ok: true,
    position: Object.freeze({
      x: mapAxis(config.x, displacement),
      y: mapAxis(config.y, displacement),
      z: mapAxis(config.z, displacement),
    }),
  });
};
