import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const sourceOwnedPrefixes = [
  "src/",
  "public/",
  "bdd/",
  "ios/",
  "android/",
  "scripts/",
  ".github/",
];
const datasetExtensions = new Set([".json", ".csv", ".ndjson", ".yaml", ".yml"]);

const trackedFiles = () =>
  execFileSync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);

const isSourceOwned = (filePath) =>
  sourceOwnedPrefixes.some((prefix) => filePath.startsWith(prefix));

const findDuplicateDatasets = (files) => {
  const hashes = new Map();
  files
    .filter(
      (filePath) =>
        isSourceOwned(filePath) && datasetExtensions.has(extname(filePath))
    )
    .forEach((filePath) => {
      const hash = createHash("sha256")
        .update(readFileSync(resolve(repositoryRoot, filePath)))
        .digest("hex");
      const matches = hashes.get(hash) ?? [];
      hashes.set(hash, [...matches, filePath]);
    });
  return [...hashes.values()].filter((matches) => matches.length > 1);
};

const verifyRepositoryCleanup = () => {
  const files = trackedFiles();
  const metadataFiles = files.filter((filePath) => filePath.endsWith(".DS_Store"));
  const duplicateDatasets = findDuplicateDatasets(files);
  if (metadataFiles.length > 0) {
    throw new Error(`tracked .DS_Store files: ${metadataFiles.join(", ")}`);
  }
  if (duplicateDatasets.length > 0) {
    throw new Error(`duplicate datasets: ${duplicateDatasets.map((files) => files.join(" = ")).join("; ")}`);
  }
  const routes = readFileSync(resolve(repositoryRoot, "src/app/routes.ts"), "utf8");
  const routePaths = [...routes.matchAll(/["'](\/[^"']*)["']/g)].map(
    ([, routePath]) => routePath
  );
  const retainedRoutes = new Set(["/", "/tracking"]);
  if (!routePaths.includes("/tracking")) {
    throw new Error("tracking route is missing");
  }
  if (routePaths.some((routePath) => !retainedRoutes.has(routePath))) {
    throw new Error(`unexpected application route: ${routePaths.join(", ")}`);
  }
  console.log("Repository cleanup: PASS");
};

try {
  verifyRepositoryCleanup();
} catch (error) {
  console.error(`Repository cleanup: FAILED (${error instanceof Error ? error.message : String(error)})`);
  process.exitCode = 1;
}
