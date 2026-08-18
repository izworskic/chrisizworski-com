#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => readFile(path.join(root, rel), 'utf8');
const exists = async (rel) => { try { await access(path.join(root, rel)); return true; } catch { return false; } };

const [doc, xc, xcCss, ice, iceChrome, funnel, ownership, winterScore] = await Promise.all([
  read('benchmarks/winter-final-readiness.json').then(JSON.parse),
  read('public/michigan-cross-country-skiing/index.html'),
  read('public/assets/michigan-xc-skiing.css'),
  read('public/michigan-ice/index.html'),
  read('scripts/ice/gen_chrome.py'),
  read('public/assets/winter-funnel.js'),
  read('docs/winter-xc-ownership.md'),
  read('benchmarks/winter-engine-scorecard.json').then(JSON.parse),
]);

const checks = [];
const add = (category, points, pass, label) => checks.push({ category, points, pass: Boolean(pass), label });

// Ownership governance: score the honesty/control boundary, not false recovery.
add('ownershipGovernance', 5, ownership.includes('source/deployment ownership is **not recovered') && ownership.includes('f8e408903e28ffa7dbb669fbe7174a6bb5efe882'), 'unrecovered ownership is documented with provenance');
add('ownershipGovernance', 5, winterScore.candidate?.xc?.penalties === 15 && /ownership/i.test(winterScore.candidate?.xc?.penaltyReason || ''), 'XC operability penalty remains in full');
add('ownershipGovernance', 5, ownership.includes('Do not change, replace, redeploy') && ownership.includes('until its source and deployment owner are recovered'), 'unowned-production stop loss is explicit');
add('ownershipGovernance', 5, !(await exists('public/xcski/index.html')) && !(await exists('xcski/index.html')), 'core repo does not invent a replacement XC production app');

// Daily decision flow.
add('dailyDecisionFlow', 5, xc.includes('id="xc-decision-desk"') && xc.includes('Today’s Michigan XC decision desk'), 'XC authority surface has a daily decision desk');
add('dailyDecisionFlow', 5, xc.includes('Lower Peninsula snow is marginal') && xc.includes('Grayling, Frederic or Roscommon') && xc.includes('Traverse City') && xc.includes('Upper Peninsula'), 'decision desk covers four practical trip constraints');
add('dailyDecisionFlow', 5, xc.includes('https://xcski.chrisizworski.com/') && xc.includes('operator or groomer'), 'live snow handoff and operator truth remain paired');
add('dailyDecisionFlow', 5, xcCss.includes('.xc-decision-desk') && xcCss.includes('.region-grid'), 'decision and regional layers are responsive first-class UI');

// Search capture on existing owners only.
for (const phrase of ['Cross-country skiing near Traverse City', 'Cross-country skiing near Grayling, Frederic and Roscommon', 'Cross-country skiing near Marquette and in the Upper Peninsula', 'Cross-country skiing in southeast Michigan']) {
  add('searchCapture', 3, xc.includes(phrase), `XC visible regional phrase: ${phrase}`);
}
add('searchCapture', 4, ['Saginaw Bay ice conditions', 'Houghton Lake ice conditions', 'Lake St. Clair ice conditions', 'Little Bay de Noc ice conditions', 'Grand Traverse Bay ice conditions', 'Burt and Mullett ice conditions'].every((p) => ice.includes(p)), 'Ice hub exposes exact water-specific condition intent');
add('searchCapture', 2, xc.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-cross-country-skiing/">') && ice.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-ice/">'), 'existing search owners keep canonical control');
add('searchCapture', 2, !(await exists('public/winter-tools/index.html')), 'no competing winter landing URL exists');

// Measurement.
add('measurement', 5, xc.includes('/assets/winter-funnel.js') && iceChrome.includes('/assets/winter-funnel.js'), 'funnel instrumentation loads across XC and generated Ice surfaces');
for (const event of ['Winter Surface View', 'Winter Decision Stage', 'Winter Handoff', 'Winter Verification Open']) {
  add('measurement', 3, funnel.includes(event), `measurement event exists: ${event}`);
}
add('measurement', 3, !/localStorage|sessionStorage|document\.cookie|geolocation|getCurrentPosition|fingerprint/i.test(funnel), 'measurement uses no browser storage, geolocation, cookies, or fingerprinting');

// Freeze discipline.
add('freezeDiscipline', 7, ownership.includes('## Winter freeze rule') && doc.reopenTriggers?.length === 5, 'winter freeze rule and reopen triggers are explicit');
add('freezeDiscipline', 5, doc.outcomeMetrics?.principle?.includes('market loss function'), 'observed traffic/behavior supersedes build score');
add('freezeDiscipline', 4, Array.isArray(doc.outcomeMetrics?.funnel) && doc.outcomeMetrics.funnel.length === 4, 'post-launch funnel is defined');
add('freezeDiscipline', 4, doc.fatalPenalties?.some((x) => /feature churn/i.test(x)), 'continued unmeasured feature churn is a fatal readiness failure');

const score = checks.reduce((sum, c) => sum + (c.pass ? c.points : 0), 0);
const loss = doc.scoring.maxScore - score;
const misses = checks.filter((c) => !c.pass);

console.log(`Winter final readiness baseline: ${doc.baseline.score}/100 (loss ${doc.baseline.loss})`);
console.log(`Winter final readiness candidate: ${score}/100 (loss ${loss})`);
for (const m of misses) console.log(`MISS ${String(m.points).padStart(2)} ${m.category}: ${m.label}`);

if (process.argv.includes('--check') && (score < doc.target.minimumScore || loss > doc.target.maximumLoss)) {
  console.error('WINTER FINAL READINESS: FAIL');
  process.exit(1);
}
console.log('WINTER FINAL READINESS: PASS');
