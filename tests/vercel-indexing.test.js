const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const config = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8"));

test("noindex applies to Vercel preview hosts but not custom domains", () => {
  const robotsRules = config.headers.filter((rule) =>
    rule.headers?.some((header) => header.key.toLowerCase() === "x-robots-tag"),
  );
  const previewRule = robotsRules.find(
    (rule) => rule.source === "/(.*)" && rule.has?.some((condition) => condition.type === "host"),
  );
  assert.ok(previewRule, "preview-host robots rule is missing");
  assert.match(
    previewRule.headers.find((header) => header.key.toLowerCase() === "x-robots-tag").value,
    /noindex/i,
  );

  const hostValue = previewRule.has.find((condition) => condition.type === "host").value;
  const hostPattern = new RegExp(`^(?:${hostValue})$`, "i");
  assert.equal(hostPattern.test("chrisizworski-com-preview.vercel.app"), true);
  assert.equal(hostPattern.test("chrisizworski-com-preview-git-main.vercel.app"), true);
  assert.equal(hostPattern.test("chrisizworski.com"), false);
  assert.equal(hostPattern.test("www.chrisizworski.com"), false);

  const unscopedPageRobots = robotsRules.filter((rule) => rule.source !== "/api/(.*)" && !rule.has);
  assert.deepEqual(unscopedPageRobots, []);
});

test("security headers stay global and API routes stay noindex", () => {
  const globalRule = config.headers.find((rule) => rule.source === "/(.*)" && !rule.has);
  const globalKeys = new Set(globalRule.headers.map((header) => header.key.toLowerCase()));
  assert.ok(globalKeys.has("strict-transport-security"));
  assert.ok(globalKeys.has("x-content-type-options"));
  assert.ok(!globalKeys.has("x-robots-tag"));

  const apiRule = config.headers.find((rule) => rule.source === "/api/(.*)");
  const apiRobots = apiRule.headers.find((header) => header.key.toLowerCase() === "x-robots-tag");
  assert.match(apiRobots.value, /noindex/i);

  const robotsTxt = readFileSync(path.join(root, "public/robots.txt"), "utf8");
  assert.match(robotsTxt, /User-agent:\s*\*/i);
  assert.match(robotsTxt, /Allow:\s*\//i);
  assert.doesNotMatch(robotsTxt, /Disallow:\s*\//i);
});
