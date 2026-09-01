const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

// Keep the candidate scores tied to concrete product evidence so the benchmark cannot drift into a self-awarded grade.
const regions = [
  ['saginaw-bay', 'Saginaw Bay'],
  ['houghton-lake', 'Houghton Lake'],
  ['lake-st-clair', 'Lake St. Clair'],
  ['little-bay-de-noc', 'Little Bay de Noc'],
  ['grand-traverse-bay', 'Grand Traverse Bay'],
  ['burt-mullett', 'Burt and Mullett Lakes'],
];

test('winter loss-function benchmark is a real merge gate', () => {
  const score = JSON.parse(read('benchmarks/winter-engine-scorecard.json'));
  assert.equal(score.scoring.maxScore, 100);
  assert.equal(score.baseline.ice.effectiveScore, 76);
  assert.equal(score.baseline.xc.effectiveScore, 61);
  assert.equal(score.candidate.ice.effectiveScore, 92);
  assert.equal(score.candidate.xc.rawScore, 94);
  assert.equal(score.candidate.xc.effectiveScore, 94);
  assert.equal(score.candidate.xc.penalties, 0, 'XC orphan penalty should remain removed only while source and Git deployment ownership stay recovered');
  assert.equal(score.candidate.xc.observed.sourceOwnershipRecovered, true);
  assert.equal(score.candidate.xc.observed.gitDeploymentRecovered, true);
  assert.equal(score.candidate.ice.fatalPenalty, false);
  assert.equal(score.candidate.xc.fatalPenalty, false);
  assert.match(read('package.json'), /benchmark:winter/);
});

test('Michigan Ice adds a generated water-behavior decision layer without weakening safety', () => {
  const hub = read('public/michigan-ice/index.html');
  assert.match(hub, /id="water-behavior"/);
  assert.match(hub, /Which Michigan ice water behaves like what\?/);
  assert.match(hub, /Depth, current, exposure/);
  assert.match(hub, /never a safety rating/i);
  assert.match(hub, /https:\/\/chrisizworski\.com\/michigan-cross-country-skiing\//);
  assert.match(hub, /https:\/\/xcski\.chrisizworski\.com\//);
});

test('all six generated Ice water pages have unique local questions and a winter handoff', () => {
  for (const [slug, name] of regions) {
    const html = read(`public/michigan-ice/regions/${slug}.html`);
    assert.ok(html.includes(`${name} ice questions`), slug);
    assert.match(html, /do not verify local thickness or safety/i, slug);
    assert.match(html, /Winter companion/, slug);
    assert.match(html, /https:\/\/chrisizworski\.com\/michigan-cross-country-skiing\//, slug);
    assert.match(html, /https:\/\/xcski\.chrisizworski\.com\//, slug);
    assert.match(html, /"dateModified":\s*"2026-09-01"/, slug);
  }
  assert.match(read('public/michigan-ice/regions/saginaw-bay.html'), /parent-lake context only/i);
  assert.match(read('public/michigan-ice/regions/houghton-lake.html'), /No comparable NOAA lake-ice product exists/i);
  assert.match(read('public/michigan-ice/regions/grand-traverse-bay.html'), /freeze pattern, not a safety rating/i);
});

test('XC planning hub adds comparison and source hierarchy while preserving live-conditions ownership', () => {
  const html = read('public/michigan-cross-country-skiing/index.html');
  assert.match(html, /<table class="xc-compare">/);
  for (const trail of ['Huron Meadows', 'Forbush Corner', 'Vasa Pathway', 'Tisdale Triangle', 'Cadillac Pathway', 'Wildwood Hills', 'Blueberry Ridge', 'Algonquin Pathway']) {
    assert.ok(html.includes(trail), trail);
  }
  assert.match(html, /How to verify a Michigan XC trail today/);
  assert.match(html, /Operator or groomer/);
  assert.ok(html.includes('https://nordicskiracer.com/'));
  assert.ok(html.includes('https://www.skimichigan.org/'));
  assert.ok(html.includes('https://xcski.chrisizworski.com/'));
  assert.match(html, /does not report today's grooming status/i);
  assert.doesNotMatch(html, /<img\b/i, 'static photo regression: keep the page utility-first');
  assert.match(html, /<title>Michigan Cross-Country Skiing: Trails &amp; Live Conditions<\/title>/);
  assert.match(html, /<h1>Michigan Cross-Country Skiing<\/h1>/);
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-cross-country-skiing/">'));
});

test('winter generator remains the source of truth and one-shot migration files are gone', () => {
  const generator = read('scripts/ice/gen_site.py');
  assert.match(generator, /REGION_DECISIONS/);
  assert.match(generator, /ICE_ROOT_DATE_MODIFIED = "2026-09-01"/);
  assert.equal(existsSync(path.join(root, 'scripts/apply-winter-engine-v2.mjs')), false);
  assert.equal(existsSync(path.join(root, 'scripts/run-winter-engine-migration.mjs')), false);
  assert.equal(existsSync(path.join(root, '.github/workflows/winter-engine-regenerate.yml')), false);
  const ignore = read('.gitignore');
  assert.match(ignore, /__pycache__\//);
  assert.match(ignore, /\*\.pyc/);
});
