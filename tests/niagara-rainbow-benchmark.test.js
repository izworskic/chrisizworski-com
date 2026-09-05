const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const page = read('public/national-tools/niagara-rainbow/index.html');
const ui = read('public/assets/niagara-rainbow.js');
const css = read('public/assets/niagara-rainbow.css');
const engine = read('lib/niagara-rainbow-engine.mjs');
const ga4 = read('scripts/inject-ga4.mjs');
const benchmark = JSON.parse(read('benchmarks/niagara-rainbow-v1.json'));

function count(checks, points) {
  const passed = checks.filter(Boolean).length;
  return points * passed / checks.length;
}

function scoreBuild() {
  const hardVetoes = [];
  const hasBestTime = /id="bestWindow"/.test(page) && /peakAt/.test(engine);
  const hasBestViewpoint = /id="bestViewpoint"/.test(page) && /bestViewpoint/.test(engine);
  const noFakeScore = !/id="todayScore">\s*\d+/.test(page);
  const hasGa4 = /G-Y5D2V2W7HN/.test(ga4);
  const mobile = /@media\(max-width:640px\)/.test(css);
  const degraded = /noSyntheticFallback:\s*true/.test(engine) && /No synthetic forecast is being shown/.test(ui);
  const rounded = /round5/.test(engine) && /Experimental model estimate/i.test(page);

  if (!noFakeScore) hardVetoes.push('fake live score');
  if (!hasBestTime) hardVetoes.push('missing best time');
  if (!hasBestViewpoint) hardVetoes.push('missing best viewpoint');
  if (!hasGa4) hardVetoes.push('missing GA4');
  if (!mobile) hardVetoes.push('missing mobile treatment');
  if (!degraded) hardVetoes.push('missing degraded-data state');
  if (!rounded) hardVetoes.push('unsupported precise probability');

  const dimensions = {};
  dimensions.decisionClarity = count([
    /Will there be a rainbow at Niagara Falls today\?/.test(page),
    hasBestTime,
    hasBestViewpoint,
    /recommendation/.test(engine) && /id="confidence"/.test(page),
  ], 20);

  const physicsRaw = count([
    /api\.weather\.gov\/points/.test(engine) && /forecastGridData/.test(engine),
    /primaryRainbowAngleDeg:\s*42/.test(engine) && /antisolarAz/.test(engine),
    /plumeShiftM/.test(engine) && /downwind/.test(engine),
    /Terrapin Point/.test(engine) && /Table Rock/.test(engine) && /Queen Victoria Park/.test(engine),
    /Horseshoe Falls/.test(engine) && /American Falls/.test(engine) && /Bridal Veil Falls/.test(engine),
  ], 25);
  dimensions.dataPhysicsIntegrity = Math.min(22, physicsRaw);

  dimensions.usefulness = count([
    /id="timeline"/.test(page) && /renderTimeline/.test(ui),
    /id="viewpointGrid"/.test(page) && /renderViewpoints/.test(ui),
    /5-day rainbow outlook/.test(page) && /renderOutlook/.test(ui),
  ], 15);

  dimensions.mobileAccessibility = count([
    /class="skip-link"/.test(page) && /role="alert"/.test(page) && /aria-live="polite"/.test(page),
    mobile && /prefers-reduced-motion:reduce/.test(css) && /:focus-visible/.test(css),
  ], 10);

  dimensions.visualQuality = count([
    /class="hero-image"/.test(page) && /Wikimedia Commons/.test(page),
    /min-height:min\(76vh,760px\)/.test(css) && /linear-gradient/.test(css) && /var\(--serif\)/.test(css),
  ], 10);

  dimensions.resilienceFreshness = count([
    degraded && /stale-while-revalidate=900/.test(engine),
    /AbortController/.test(ui) && /15000/.test(ui) && /fetchedAt/.test(engine),
  ], 10);

  const title = page.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
  const description = page.match(/<meta name="description" content="([^"]+)"/i)?.[1] || '';
  dimensions.seoSchemaAnalytics = count([
    /rel="canonical" href="https:\/\/chrisizworski\.com\/national-tools\/niagara-rainbow\//.test(page),
    title.length > 0 && title.length <= 60 && description.length > 0 && description.length <= 158,
    /"@type":"Person","@id":"https:\/\/chrisizworski\.com\/#person"/.test(page),
    /"@type":"WebApplication"/.test(page) && /"@type":"FAQPage"/.test(page),
    hasGa4,
  ], 10);

  const score = Object.values(dimensions).reduce((sum, value) => sum + value, 0);
  return { score, dimensions, hardVetoes };
}

test('Niagara Rainbow v1 clears its release value function with no hard vetoes', () => {
  const result = scoreBuild();
  console.log(`NIAGARA_RAINBOW_BENCHMARK ${JSON.stringify(result)}`);
  assert.deepEqual(result.hardVetoes, []);
  assert.ok(result.score >= benchmark.releaseTarget, `score ${result.score} is below target ${benchmark.releaseTarget}`);
  assert.equal(result.dimensions.dataPhysicsIntegrity, 22, 'uncalibrated v1 physics score must remain capped at 22/25');
});
