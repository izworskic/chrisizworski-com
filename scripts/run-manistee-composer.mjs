#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/compose-manistee-page-one.mjs";
let source = readFileSync(path, "utf8");
source = source.replace(
  'console.log(`Baseline: ${benchmark.baseline.impressions} impressions, ${benchmark.baseline.clicks} clicks, position ${benchmark.baseline.averagePosition}`);',
  'console.log("Baseline: " + benchmark.baseline.impressions + " impressions, " + benchmark.baseline.clicks + " clicks, position " + benchmark.baseline.averagePosition);'
);
source = source.replace(
  'console.log(`Target: top ${benchmark.targets.averagePositionAtOrBetterThan}, CTR >= ${(benchmark.targets.ctrAtOrAbove * 100).toFixed(1)}%`);',
  'console.log("Target: top " + benchmark.targets.averagePositionAtOrBetterThan + ", CTR >= " + (benchmark.targets.ctrAtOrAbove * 100).toFixed(1) + "%");'
);
source = source.replace(
  'for (const failure of failures) console.log(` - ${failure}`);',
  'for (const failure of failures) console.log(" - " + failure);'
);
source = source.replace(
  'unlinkSync("scripts/compose-manistee-page-one.mjs");',
  'unlinkSync("scripts/compose-manistee-page-one.mjs");\nunlinkSync("scripts/run-manistee-composer.mjs");'
);
writeFileSync(path, source);
await import("./compose-manistee-page-one.mjs?fixed=1");
