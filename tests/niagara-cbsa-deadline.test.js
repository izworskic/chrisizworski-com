const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "api", "niagara-border-crossings.js"), "utf8");

test("CBSA CSV and HTML authority surfaces are fetched concurrently", () => {
  assert.match(source, /cbsaHtmlResult/);
  assert.match(source, /Promise\.allSettled\([\s\S]*fetchSource\(URLS\.cbsa, "text"\)[\s\S]*fetchSource\(URLS\.cbsaHtml, "text"\)/);
  assert.match(source, /resolveCbsaPayload\(cbsaResult, cbsaHtmlResult\)/);
});

test("CBSA resolver does not start a sequential network request", () => {
  const match = source.match(/function resolveCbsaPayload\([\s\S]*?\n}\n\nfunction normalizeEcccAlerts/);
  assert.ok(match, "resolveCbsaPayload function must be present");
  assert.doesNotMatch(match[0], /fetchSource\(/);
  assert.doesNotMatch(match[0], /await\s+/);
});

test("upstream requests abort before the 10 second Vercel function budget", () => {
  assert.match(source, /AbortSignal\.timeout\(8_000\)/);
  assert.doesNotMatch(source, /AbortSignal\.timeout\((?:1[0-9]|[2-9][0-9])_000\)/);
});
