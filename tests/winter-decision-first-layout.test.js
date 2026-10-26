const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = p => fs.readFileSync(path.join(root,p), "utf8");
const aurora = read("public/northern-lights-michigan/index.html");
const bridge = read("public/mackinac-bridge-live/index.html");
const lake = read("public/lake-effect-snow/index.html");
const winterSitemap = read("public/sitemap-winter.xml");

function answerZone(html, comment) {
 const start=html.indexOf('class="priority-decision-group" data-no-ads');
 const end=html.indexOf(comment, start);
 assert.ok(start>=0 && end>start, "Uninterrupted first decision section is declared and closed");
 return html.slice(start,end);
}

test("Aurora groups the user's immediate region selection and forecast into one semantic block",()=>{
 const zone=answerZone(aurora, "<!-- /priority-decision-group:");
 assert.match(zone, /id="aurora-decision"/);
 assert.match(zone, /id="regionSelect"/);
 assert.match(zone, /id="localHeadline"/);
 assert.match(zone, /Northern Lights Michigan Tonight/);
 assert.ok(!zone.includes("adsbygoogle"), "No injected ad markup in decision wrapper");
 assert.match(aurora, /<title>Northern Lights Michigan Tonight: Can You See Them\?<\/title>/);
 assert.match(aurora, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/northern-lights-michigan\/">/);
});
test("Bridge groups primary question and actual Authority card before Gazette feature",()=>{
 const zone=answerZone(bridge, "<!-- /priority-decision-group:");
 assert.match(zone, /id="mackinac-conditions-answer"/);
 assert.match(zone, /id="statusCard"/);
 assert.match(zone, /id="officialStatusHeading"/);
 assert.ok(bridge.indexOf('id="statusCard"')<bridge.indexOf('class="gazette-daily"'));
 assert.ok(!zone.includes("adsbygoogle"), "No ad iframe is inserted by source");
 assert.match(bridge, /"dateModified": "2026-10-26"/);
});
test("Lake effect offers visible, crawlable, intent-separated winter next decisions",()=>{
 const navStart=lake.indexOf('<nav class="winter-next-decisions"');
 const guideStart=lake.indexOf('<section class="panel"><h2>How forecasts and reported snowfall differ');
 assert.ok(navStart>0 && guideStart>navStart);
 const chunk=lake.slice(navStart,guideStart);
 assert.ok(!chunk.includes('hidden'),'Handoff never depends on live weather API success');
 for(const p of [
  "michigan-snow-totals","michigan-snow-depth","michigan-cross-country-skiing",
  "michigan-ski-hills","snowmobile","michigan-ice","michigan-ice-caves",
  "national-tools/white-christmas/forecast"
 ])assert.ok(chunk.includes('href="/'+p+'/"'),"Evidence-linked page "+p);
 assert.match(chunk,/not forecast totals/);
 assert.match(chunk,/never safe-ice certification/);
 assert.match(chunk,/Historical December 25 odds/);
 assert.match(lake, /"dateModified":"2026-10-26"/);
 assert.match(winterSitemap, /<loc>https:\/\/chrisizworski\.com\/lake-effect-snow\/<\/loc>\s*<lastmod>2026-10-26<\/lastmod>/);
});
