#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const config = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
const globalRobotsHeader = config.headers?.find(
  (rule) =>
    rule.source === "/(.*)" &&
    rule.headers?.some((header) => String(header.key).toLowerCase() === "x-robots-tag"),
);

if (globalRobotsHeader) {
  process.stderr.write(
    "PRODUCTION BLOCKED: remove the preview-only global X-Robots-Tag and re-run all parity checks before attaching a live domain.\n",
  );
  process.exitCode = 1;
} else {
  process.stdout.write("Production SEO gate passed: no global X-Robots-Tag is configured.\n");
}
