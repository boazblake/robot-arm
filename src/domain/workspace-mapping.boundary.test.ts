import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(fileURLToPath(new URL(".", import.meta.url)), "workspace-mapping.ts"),
  "utf8",
);

describe("workspace mapping boundary", () => {
  it("depends only on domain mapping types", () => {
    expect(source).toContain('from "./arm-calibration"');
    expect(source).not.toMatch(/from ["'][^"']*(tracking|camera|ui|platform|adapter)[^"']*["']/i);
    expect(source).not.toMatch(/HumanArm|armLength|arm-length/);
  });
});
