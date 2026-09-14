import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const deterministicTestFiles = [
  "domain/tracking.test.ts",
  "domain/rendering.test.ts",
  "integration/normalize.test.ts",
];

const readTestSources = (): string =>
  deterministicTestFiles
    .map((fileName) => readFileSync(resolve(sourceRoot, fileName), "utf8"))
    .join("\n");

describe("deterministic test isolation", () => {
  it("does not import hardware, native, robot, or network boundaries", () => {
    const sources = readTestSources();

    expect(sources).not.toMatch(
      /from ["'](?:@capacitor|@mediapipe|capacitor-media-pipe)/
    );
    expect(sources).not.toContain("navigator.mediaDevices");
    expect(sources).not.toContain("fetch(");
    expect(sources).not.toMatch(/clr_ws|robot adapter|CameraPreview/);
  });
});
