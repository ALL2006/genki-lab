/* global console, process */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const outDir = path.join(projectRoot, "out", "stills");
await mkdir(outDir, { recursive: true });

const stills = [
  [36, "00-opening.png"],
  [144, "03-product-reveal.png"],
  [264, "06-grape.png"],
  [384, "09-jasmine.png"],
  [504, "12-flavor-fusion.png"],
  [660, "15-bubbles.png"],
  [828, "20-end-card.png"],
];

for (const [frame, filename] of stills) {
  const output = path.join("out", "stills", filename);
  console.log(`Rendering frame ${frame} -> ${output}`);
  const cli = path.join(
    projectRoot,
    "node_modules",
    "@remotion",
    "cli",
    "remotion-cli.js",
  );
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "still",
      "src/index.ts",
      "QingtiJasmineAd",
      output,
      `--frame=${frame}`,
    ],
    {
      cwd: projectRoot,
      stdio: "inherit",
      shell: false,
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
