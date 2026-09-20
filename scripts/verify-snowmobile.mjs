import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const read = async p => fs.readFile(new URL(p, root), "utf8");

const files = {
  html: "public/snowmobile/index.html",
  css: "public/snowmobile/assets/snowmobile.css",
  client: "public/snowmobile/assets/snowmobile.js",
  api: "api/snowmobile-conditions.js",
  drive: "api/snowmobile-drive.js",
  engine: "lib/snowmobile-engine.js",
  sources: "lib/snowmobile-sources.js",
  harness: "lib/snowmobile-harness.js"
};

const content = Object.fromEntries(await Promise.all(
  Object.entries(files).map(async ([k,p]) => [k, await read(p)])
));

const checks = [];
function check(name, pass, detail="") {
  checks.push({name, pass:Boolean(pass), detail});
}

for (const p of [files.client,files.api,files.drive,files.engine,files.sources,files.harness]) {
  const r = spawnSync(process.execPath, ["--check", new URL(p, root).pathname], {encoding:"utf8"});
  check(`syntax:${p}`, r.status === 0, r.stderr || r.stdout || "");
}

check("canonical", content.html.includes('<link rel="canonical" href="https://chrisizworski.com/snowmobile/">'));
check("decision-before-map", content.html.indexOf('id="primaryDecision"') > 0 && content.html.indexOf('id="primaryDecision"') < content.html.indexOf('id="mapSection"'));
check("no-decorative-hero-before-decision", !content.html.slice(0,content.html.indexOf('id="primaryDecision"')).match(/<img|hero-image|background-image/i));
check("condition-and-confidence", content.html.includes('id="conditionLabel"') && content.html.includes('id="confidenceValue"'));
check("origin-personalization", content.html.includes('id="originForm"') && content.drive.includes("NOMINATIM") && content.drive.includes("router.project-osrm.org"));
check("official-dnr-backbone", content.sources.includes("DNRTrailsOPENDATA") && content.sources.includes("arcgisUrl(15"));
check("closure-reroute-layers", content.sources.includes("arcgisUrl(0") && content.sources.includes("arcgisUrl(1"));
check("trail7-route-gate", content.engine.includes("isTrail7Segment") && content.engine.includes("ROUTE_BROKEN"));
check("missing-route-is-unknown", content.engine.includes('state: "UNKNOWN"') && content.engine.includes("openness is not inferred"));
check("freshness-is-report-time", content.engine.includes("sourceFreshnessMinutes(r.reportedAt, now)") && !content.engine.includes("r.reportedAt || r.retrievedAt"));
check("weather-alone-cannot-score", content.engine.includes("weatherAloneCreatesTrailCondition: false") && content.engine.includes("if (rs.score == null) return null"));
check("snow-depth-semantics", content.engine.includes("naturalSnowDepthIsTrailBase: false") && content.html.includes("Natural snow depth is <strong>not</strong> trail base"));
check("nws-three-points", content.sources.includes('id: "grayling"') && content.sources.includes('id: "frederic"') && content.sources.includes('id: "gaylord"'));
check("nohrsc-disclosed-gap", content.html.includes("NOHRSC") && content.html.includes("point feed is not yet connected"));
check("private-jev-server-only", content.harness.includes("getVercelOidcToken") && !content.client.includes("agentbase-registry"));
check("injection-screen", content.harness.includes('action: "screen_evidence"') && content.harness.includes("injectionProbability"));
check("closed-jev-options", content.harness.includes("CONDITION_CHOICES") && content.harness.includes("Choose only a supplied option or NONE"));
check("deterministic-jev-fallback", content.harness.includes('mode: "deterministic"'));
check("camera-is-supporting-evidence", content.html.includes("local visual check, not proof of the whole corridor"));
check("lazy-map", content.client.includes("IntersectionObserver") && content.client.includes("loadLeaflet"));
check("analytics-decision-path", [
  "snowmobile_decision_view","snowmobile_route_open","snowmobile_segment_open",
  "snowmobile_origin_set","snowmobile_drive_verdict_view","snowmobile_map_interact",
  "snowmobile_webcam_open","snowmobile_source_verify","snowmobile_service_open"
].every(x=>content.client.includes(x)));
check("mobile-layout", content.css.includes("@media(max-width:420px)") && content.css.includes("@media(max-width:760px)"));
check("schema", content.html.includes('"@type":"WebApplication"') && content.html.includes('"@type":"BreadcrumbList"'));
check("crawlable-source-copy", content.html.includes("WHAT THIS ACTUALLY DOES") && content.html.includes("Where the answer comes from"));

const failures = checks.filter(x=>!x.pass);
console.log(JSON.stringify({ok:failures.length===0,checks,failures},null,2));
if (failures.length) process.exit(1);
