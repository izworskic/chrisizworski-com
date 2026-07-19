#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const config = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
const rules = config.headers || [];
const failures = [];
const robotsRules = rules.filter((rule) =>
  rule.headers?.some((header) => String(header.key).toLowerCase() === "x-robots-tag"),
);
const nonApiRobotsRules = robotsRules.filter((rule) => rule.source !== "/api/(.*)");
const previewRule = nonApiRobotsRules.find((rule) => rule.source === "/(.*)");
const previewHost = previewRule?.has?.find((condition) => condition.type === "host");
const previewRobots = previewRule?.headers?.find(
  (header) => String(header.key).toLowerCase() === "x-robots-tag",
);

if (!previewRule || !previewHost || !String(previewRobots?.value).toLowerCase().includes("noindex")) {
  failures.push("Vercel preview hosts are missing their host-scoped noindex header");
}
if (nonApiRobotsRules.length !== 1) {
  failures.push("A non-API X-Robots-Tag rule exists outside the single preview-host rule");
}

if (previewHost) {
  try {
    const hostPattern = new RegExp(`^(?:${previewHost.value})$`, "i");
    for (const host of ["chrisizworski-com-preview.vercel.app", "chrisizworski-com-preview-git-main.vercel.app"]) {
      if (!hostPattern.test(host)) failures.push(`Preview host pattern does not match ${host}`);
    }
    for (const host of ["chrisizworski.com", "www.chrisizworski.com", "vercel.app.example.com"]) {
      if (hostPattern.test(host)) failures.push(`Preview host pattern incorrectly matches production host ${host}`);
    }
  } catch (error) {
    failures.push(`Preview host pattern is invalid: ${error.message}`);
  }
}

const apiRule = robotsRules.find(
  (rule) =>
    rule.source === "/api/(.*)" &&
    rule.headers?.some(
      (header) =>
        String(header.key).toLowerCase() === "x-robots-tag" &&
        String(header.value).toLowerCase().includes("noindex"),
    ),
);
if (!apiRule) failures.push("API routes are missing their noindex header");

const globalSecurityRule = rules.find(
  (rule) =>
    rule.source === "/(.*)" &&
    !rule.has &&
    rule.headers?.some((header) => String(header.key).toLowerCase() === "strict-transport-security") &&
    rule.headers?.some((header) => String(header.key).toLowerCase() === "x-content-type-options"),
);
if (!globalSecurityRule) failures.push("Global HSTS and X-Content-Type-Options protections are missing");

if (failures.length) {
  process.stderr.write(`PRODUCTION BLOCKED:\n- ${failures.join("\n- ")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    "Production SEO gate passed: custom domains are indexable, Vercel preview hosts are noindex, and APIs remain noindex.\n",
  );
}
