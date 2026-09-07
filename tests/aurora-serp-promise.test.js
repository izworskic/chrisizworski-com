const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(
  path.join(root, "public/northern-lights-michigan/index.html"),
  "utf8",
);
const ledger = JSON.parse(
  fs.readFileSync(path.join(root, "benchmarks/growth-experiments.json"), "utf8"),
);

const title = "Northern Lights Michigan: Visible Tonight? | Chris Izworski";
const description =
  "Can you see the northern lights in Michigan tonight? Check the live NOAA aurora borealis forecast, cloud cover, moonlight, timing, and regional outlooks.";

test("Aurora SERP promise is direct, branded, and within repository limits", () => {
  assert.ok(html.includes(`<title>${title}</title>`));
  assert.ok(html.includes(`<meta name="description" content="${description}">`));
  assert.ok(title.length <= 60);
  assert.ok(description.length <= 158);
  assert.ok(html.includes('<h1 class="page-title">Northern Lights Michigan Tonight</h1>'));
  assert.ok(html.includes('id="aurora-static-answer"'));
  assert.equal(
    (html.match(/<link rel="canonical" href="https:\/\/chrisizworski\.com\/northern-lights-michigan\/">/g) || [])
      .length,
    1,
  );
});

test("Aurora proposal is the only draft and cannot masquerade as a live experiment", () => {
  assert.deepEqual(ledger.activeExperiments, []);
  assert.equal(ledger.draftExperiments.length, 1);
  const experiment = ledger.draftExperiments[0];
  assert.equal(experiment.id, "2026-09-07-aurora-visible-tonight-ctr");
  assert.equal(experiment.status, "draft-owner-review");
  assert.equal(experiment.releaseDate, null);
  assert.equal(experiment.baseline.impressions, 10328);
  assert.equal(experiment.baseline.clicks, 110);
  assert.equal(experiment.baseline.averagePosition, 8.88);
  assert.equal(experiment.target.ctrAtOrAbove, 0.016);
  assert.equal(experiment.target.stretchCtrAtOrAbove, 0.025);
  assert.equal(experiment.target.evaluationWindowDays, 28);
  assert.equal(experiment.treatment.newTitle, title);
  assert.equal(experiment.treatment.newMetaDescription, description);
  assert.match(experiment.queryEvidenceCaveat, /not a page-query join/i);
  assert.match(experiment.measurementActivation, /owner-approved production release/i);
  assert.match(experiment.reversal, /Restore the old title and meta description exactly/);
});
