"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const controller = fs.readFileSync(path.join(root, "public/assets/gatlinburg-winter-personas.js"), "utf8");
const route11 = fs.readFileSync(path.join(root, "lib/gatlinburg-winter/route-v11.js"), "utf8");

test("production health badge is driven by decisionHealth, not raw degraded diagnostics", () => {
  assert.match(controller, /function authoritativeHealth\(/);
  assert.match(controller, /data\.decisionHealth\.label/);
  assert.match(controller, /data\.decisionHealth\.state === "check"/);
  assert.match(controller, /new MutationObserver\(\(\) => authoritativeHealth\(\)\)/);
});

test("v11 production wrapper runs the v12 persona engine and aligns legacy degraded diagnostics", () => {
  assert.match(route11, /require\("\.\/route-v12\.js"\)/);
  assert.match(route11, /degradedSources: criticalSources/);
  assert.match(route11, /Cache-Control", "no-store, max-age=0"/);
});
