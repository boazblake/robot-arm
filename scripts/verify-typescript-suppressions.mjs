import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const sourceFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });

const violations = sourceFiles("src").flatMap((filePath) => {
  const lines = readFileSync(filePath, "utf8").split("\n");
  return lines.flatMap((line, index) => {
    if (/@ts-(?:no-check|ignore)\b/.test(line)) {
      return [`${filePath}:${index + 1}: forbidden TypeScript suppression`];
    }
    if (
      /@ts-expect-error\b/.test(line) &&
      !/@ts-expect-error\b.*(?:reason|because|test)/i.test(line)
    ) {
      return [`${filePath}:${index + 1}: @ts-expect-error requires an inline reason`];
    }
    return [];
  });
});

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("TypeScript suppression check: PASS");
}
