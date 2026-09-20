import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const transportDirectory = join(process.cwd(), "src/robotics/transport");
const productionTransportSource = (): string =>
  readdirSync(transportDirectory)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .map((file) => readFileSync(join(transportDirectory, file), "utf8"))
    .join("\n");

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { recursive: true })
    .filter((file): file is string => typeof file === "string" && file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .filter((file) => !file.endsWith("roslib-rosbridge-client.ts") && !file.endsWith("roslib.d.ts"))
    .map((file) => readFileSync(join(directory, file), "utf8"));

describe("Requirement 19 architecture boundaries", () => {
  it("keeps RosTransport independent of robot semantics and UI", () => {
    const source = productionTransportSource();
    expect(source).not.toMatch(/RobotTarget|RobotState|HumanArmPose|MediaPipe|calibration|WorkspaceMapping|stabilization|OInK|JointTrajectory|clr_ws|src\/app/);
  });

  it("keeps roslibjs isolated to the concrete bridge client", () => {
    const source = sourceFiles(join(process.cwd(), "src")).join("\n");
    expect(source).not.toMatch(/ROSLIB|clr_ws/);
    const concreteClient = readFileSync(
      join(process.cwd(), "src/robotics/transport/roslib-rosbridge-client.ts"),
      "utf8",
    );
    expect(concreteClient).toMatch(/from [\"']roslib[\"']/);
  });
});
