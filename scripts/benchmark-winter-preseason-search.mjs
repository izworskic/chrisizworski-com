#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => readFile(path.join(root, p), 'utf8');
const config = JSON.parse(await read('benchmarks/winter-preseason-search-expansion.json'));
const generator = await read('scripts/ice/gen_site.py');
const ice = await read('public/michigan-ice/index.html');
const xc = await read('public/michigan-cross-country-skiing/index.html');
const pkg = JSON.parse(await read('package.json'));

let score = 0;
const failures = [];
function check(name, ok, points, detail='') {
  if (ok) score += points;
  else failures.push(detail ? `${name}: ${detail}` : name);
}

check('Fresh Search Console evidence is recorded',
  config.evidence?.spreadsheetId === '1lrFEAxYT7whMAx2Gnrq-IRfUHr7cjshU542FWwJ7Kfw' &&
  config.evidence?.exportedThrough === '2026-08-19' &&
  config.evidence?.windowDays === 7 &&
  config.evidence?.pages?.michiganIce?.averagePosition === 46.35 &&
  config.evidence?.querySignals?.some(x => x.query === 'saginaw bay ice conditions' && x.averagePosition === 18.33), 15);

check('Treatment is authority-first rather than a premature CTR rewrite',
  config.treatment?.snippetPolicy?.includes('Do not rewrite title') &&
  config.measurement?.primaryMetrics?.includes('average position') &&
  config.measurement?.primaryWindowDays === 28, 10);

check('Ice generator remains source of truth for the new winter answer',
  generator.includes('Saginaw Bay ice conditions and Great Lakes ice coverage') &&
  generator.includes('ICE_ROOT_DATE_MODIFIED = "2026-08-22"'), 15);

check('Generated Michigan Ice hub exposes the Saginaw Bay and Great Lakes query wedge',
  ice.includes('Saginaw Bay ice conditions and Great Lakes ice coverage') &&
  ice.includes('/michigan-ice/regions/saginaw-bay.html') &&
  ice.includes('Great Lakes ice conditions') &&
  ice.includes('lake-wide ice coverage') &&
  ice.includes('not a safety rating'), 15);

check('Ice safety truth remains explicit',
  ice.includes('No ice is safe ice.') &&
  ice.includes('/michigan-ice/ice-safety.html') &&
  config.measurement?.guardrails?.noSafetyRatingClaims === true, 10);

check('XC planning snippet and canonical remain unchanged',
  xc.includes('<title>Michigan Cross-Country Skiing: Trails &amp; Live Conditions</title>') &&
  xc.includes('<h1>Michigan Cross-Country Skiing</h1>') &&
  xc.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-cross-country-skiing/">'), 10);

check('XC owner gains crawlable region-first authority',
  xc.includes('Where to cross-country ski in Michigan by region') &&
  xc.includes('Southeast Michigan') &&
  xc.includes('Northern Lower Peninsula') &&
  xc.includes('Traverse City') &&
  xc.includes('Upper Peninsula') &&
  xc.includes('cross-country ski trail report'), 10);

check('XC live and operator truth ownership remain separate',
  xc.includes('https://xcski.chrisizworski.com/') &&
  xc.includes('operator') &&
  xc.includes('grooming') &&
  config.measurement?.guardrails?.xcLiveDistinctOwner === true, 5);

check('No doorway expansion is authorized',
  config.measurement?.guardrails?.noNewDoorwayCanonicals === true &&
  config.treatment?.xcPlanning?.some(x => x.includes('Do not create regional keyword-doorway URLs')), 5);

check('Winter search benchmark is part of the full release gate',
  pkg.scripts?.['benchmark:winter-search'] === 'node scripts/benchmark-winter-preseason-search.mjs' &&
  pkg.scripts?.['verify:all']?.includes('benchmark:winter-search'), 5);

console.log('\nWINTER PRESEASON SEARCH AUTHORITY BENCHMARK');
console.log('='.repeat(72));
console.log(`Score: ${score}/100`);
console.log('Primary wedge: Saginaw Bay ice conditions');
console.log('Secondary wedge: Michigan cross-country skiing by region');
if (failures.length) {
  console.log('Failures:');
  for (const f of failures) console.log(` - ${f}`);
}
if (process.argv.includes('--check')) {
  if (score < 100 || failures.length) process.exitCode = 1;
  else console.log('benchmark:winter-search PASS\n');
}
