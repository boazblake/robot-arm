import { createClrRobotAdapter, type ClrAdapterConfiguration, type ClrTargetMapper } from "../adapters/clr/clr-robot-adapter";
import type { RobotAdapter, TargetFreshnessPolicy } from "../ports/robot-adapter";
import { createRosTransport } from "../transport/ros-transport";
import { createRoslibRosBridgeClient } from "../transport/roslib-rosbridge-client";

export type RobotAdapterSelection = "clr";
export type RobotAdapterConfiguration = Readonly<{
  readonly kind: RobotAdapterSelection;
  readonly rosBridgeUrl: string;
  readonly clr: ClrAdapterConfiguration;
}>;
export type CreateApplicationRobotAdapterOptions = Readonly<{
  readonly configuration: RobotAdapterConfiguration;
  readonly mapper: ClrTargetMapper;
  readonly freshnessPolicy: TargetFreshnessPolicy;
}>;

export const createApplicationRobotAdapter = (
  options: CreateApplicationRobotAdapterOptions,
): RobotAdapter => {
  const transport = createRosTransport(
    createRoslibRosBridgeClient(options.configuration.rosBridgeUrl),
  );
  return createClrRobotAdapter({
    transport,
    mapper: options.mapper,
    configuration: options.configuration.clr,
    freshnessPolicy: options.freshnessPolicy,
  });
};
