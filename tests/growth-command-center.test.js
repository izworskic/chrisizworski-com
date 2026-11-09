const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../ops/growth-command-center/engine.js");

const url = (slug) => "https://chrisizworski.com/" + slug + "/";

test("GSC parser uses actual page rows, handles commas and normalizes query URLs", () => {
  const data = [
    "Top pages,Clicks,Impressions,CTR,Position",
    '"' + url("soo-locks") + '?utm_source=foo",10,"1,000",1.00%,8.5',
    url("soo-locks") + ",5,500,1.00%,7.5",
    "https://elsewhere.com/private/,200,1000,20%,2",
  ].join("\n");
  const result = engine.gsc(data);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].page, url("soo-locks"));
  assert.equal(result.records[0].clicks, 15);
  assert.equal(result.records[0].impressions, 1500);
  assert.equal(result.records[0].position, (8.5 * 1000 + 7.5 * 500) / 1500);
});

test("quoted CSV, empty revenue and corrupt CSV are handled without inventing values", () => {
  assert.deepEqual(engine.parseCSV('name,value\n"a,b","c""d"\n'), [["name", "value"], ["a,b", 'c"d']]);
  assert.throws(() => engine.parseCSV('name,value\n"unfinished'), /unmatched quote/);
  assert.throws(() => engine.adsense("Date,Clicks\n2026-11-01,3"), /Required column headers/);
  const a = engine.analyze({}, {});
  assert.equal(a.kpis.importedAdSenseEarnings, null);
  assert.equal(a.kpis.adsDaily, null);
  assert.equal(a.rows.length, 0);
});

test("sitewide AdSense CSV can measure daily earnings only with explicit complete scope and dates", () => {
  const ad = engine.adsense("Date,Estimated earnings\n2026-11-01,12.20\n2026-11-02,16.80\nTotal,29.00");
  assert.equal(ad.total, 29);
  assert.equal(ad.sitewide, true);
  assert.equal(ad.records.length, 0);
  const partial = engine.analyze({ adsense: ad }, { adsStart: "2026-11-01", adsEnd: "2026-11-02" });
  assert.equal(partial.kpis.importedAdSenseEarnings, 29);
  assert.equal(partial.kpis.adsDaily, null);
  const complete = engine.analyze({ adsense: ad }, { adsStart: "2026-11-01", adsEnd: "2026-11-02", adSenseComplete: true });
  assert.equal(complete.kpis.adsDaily, 14.5);
  assert.equal(complete.kpis.dailyGap, 285.5);
});

test("page-attributed AdSense is not inferred from GSC clicks or GA4 traffic", () => {
  const g = engine.gsc("Top pages,Clicks,Impressions,CTR,Position\n" + url("welland-canal") + ",12,500,2.4%,9");
  const ga = engine.ga4("Page path,Views,Sessions\n/welland-canal/,300,180");
  const noRevenue = engine.analyze({ gsc: g, ga4: ga }, {});
  assert.equal(noRevenue.rows[0].earnings, null);
  assert.equal(noRevenue.rows[0].views, 300);
  assert.equal(noRevenue.rows[0].sessions, 180);
  const ads = engine.adsense("Page URL,Estimated earnings,Page views\n" + url("welland-canal") + ",7.50,250");
  const actual = engine.analyze({ gsc: g, ga4: ga, adsense: ads }, {});
  assert.equal(actual.rows[0].earnings, 7.5);
  assert.equal(actual.rows[0].pageRpm, 30);
});

test("foreign AdSense URLs cannot contaminate site earnings or imply complete coverage", () => {
  const csv = [
    "Page URL,Estimated earnings,Page views",
    url("soo-locks") + ",3.00,100",
    "https://unrelated.example/other/,999.00,20000",
  ].join("\n");
  const result = engine.adsense(csv);
  assert.equal(result.total, 3);
  assert.equal(result.records.length, 1);
  assert.equal(result.partialAttribution, true);
  const report = engine.analyze({ adsense: result }, {
    adsStart: "2026-11-01", adsEnd: "2026-11-01", adSenseComplete: true,
  });
  assert.equal(report.kpis.adsDaily, null);
});

test("GSC growth is withheld unless dates are equal-length and consecutive", () => {
  const current = engine.gsc("Top pages,Clicks,Impressions,CTR,Position\n" + url("soo-locks") + ",80,1800,4.4%,6");
  const previous = engine.gsc("Top pages,Clicks,Impressions,CTR,Position\n" + url("soo-locks") + ",40,900,4.4%,6");
  const invalid = engine.analyze({ gsc: current, previous: previous }, { start: "2026-10-07", end: "2026-11-03", prevStart: "2026-09-25", prevEnd: "2026-10-22" });
  assert.equal(invalid.comparisonValid, false);
  assert.equal(invalid.rows[0].impressionChangePct, null);
  const valid = engine.analyze({ gsc: current, previous: previous }, { start: "2026-10-07", end: "2026-11-03", prevStart: "2026-09-09", prevEnd: "2026-10-06" });
  assert.equal(valid.comparisonValid, true);
  assert.equal(valid.rows[0].impressionChangePct, 100);
});

test("CTR opportunity needs enough real peers and remains descriptive, not a forecast", () => {
  const lines = [
    "Top pages,Clicks,Impressions,CTR,Position",
    url("great-lakes-freighter-tracking") + ",10,1000,1%,8",
    url("x-1") + ",50,1000,5%,8",
    url("x-2") + ",45,1000,4.5%,7",
    url("x-3") + ",55,1000,5.5%,7",
  ];
  const result = engine.analyze({ gsc: engine.gsc(lines.join("\n")) }, {});
  const tracker = result.rows.find((r) => r.page === url("great-lakes-freighter-tracking"));
  assert.equal(tracker.potentialClicks, 38);
  const alone = engine.analyze({ gsc: engine.gsc(lines.slice(0, 2).join("\n")) }, {});
  assert.equal(alone.rows[0].potentialClicks, null);
});

test("command center remains outside public/, contains no analytics scripts and no automatic persistence", () => {
  const directory = path.join(__dirname, "../ops/growth-command-center");
  const html = fs.readFileSync(path.join(directory, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(directory, "app.js"), "utf8");
  assert.match(html, /noindex,nofollow,noarchive/);
  assert.match(html, /LOCAL SESSION/);
  assert.doesNotMatch(html, /googletagmanager|adsbygoogle|gtag\(/);
  assert.doesNotMatch(app, /localStorage|sessionStorage|fetch\(/);
  assert.match(app, /snapshot/);
});


test("standalone bundler emits one private, script-complete HTML document", () => {
  const { execFileSync } = require("node:child_process");
  const os = require("node:os");
  const output = path.join(os.tmpdir(), "growth-command-center-ci-" + process.pid + ".html");
  try {
    execFileSync(process.execPath, ["scripts/build-growth-command-center.mjs", "--output=" + output],
      { cwd: path.join(__dirname, ".."), stdio: "pipe" });
    const bundled = fs.readFileSync(output, "utf8");
    assert.match(bundled, /Revenue Command Center/);
    assert.match(bundled, /window\.GrowthEngine/);
    assert.match(bundled, /source-guidance/);
    assert.doesNotMatch(bundled, /src="\.\/|href="\.\/|googletagmanager|adsbygoogle/);
  } finally {
    if (fs.existsSync(output)) fs.unlinkSync(output);
  }
});
