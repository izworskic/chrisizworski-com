#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => readFile(path.join(root, rel), 'utf8');
const exists = async (rel) => { try { await access(path.join(root, rel)); return true; } catch { return false; } };

const iceRegions = [
  ['saginaw-bay', 'Saginaw Bay Ice Conditions Today'],
  ['houghton-lake', 'Houghton Lake Ice Conditions Today'],
  ['lake-st-clair', 'Lake St. Clair Ice Conditions Today'],
  ['little-bay-de-noc', 'Little Bay de Noc Ice Conditions Today'],
  ['grand-traverse-bay', 'Grand Traverse Bay Ice Conditions Today'],
  ['burt-mullett', 'Burt and Mullett Lakes Ice Conditions Today'],
];

const [doc, xc, tools, finalUx, fieldCamera, seasonalDesk, funnel, ownership, winterScore, ...regionHtml] = await Promise.all([
  read('benchmarks/winter-final-readiness.json').then(JSON.parse),
  read('public/michigan-cross-country-skiing/index.html'),
  read('public/tools/index.html'),
  read('public/assets/winter-final.js'),
  read('public/assets/field-camera.js'),
  read('public/assets/seasonal-field-desk.js'),
  read('public/assets/winter-funnel.js'),
  read('docs/winter-xc-ownership.md'),
  read('benchmarks/winter-engine-scorecard.json').then(JSON.parse),
  ...iceRegions.map(([slug]) => read(`public/michigan-ice/regions/${slug}.html`)),
]);

const checks = [];
const add = (category, points, pass, label) => checks.push({ category, points, pass: Boolean(pass), label });

// 20: ownership governance. Recovered source must be evidenced and remain outside the core repo.
add('ownershipGovernance', 5, ownership.includes('izworskic/xcski') && ownership.includes('052cae8410847373da34c2ec7955061d3de7cae2') && ownership.includes('78283130a996cf4d3268fc519743435b52464b56e61f221ce1f34b6555c78c95'), 'XC recovery repo, commit and production hash are documented');
add('ownershipGovernance', 5, winterScore.candidate?.xc?.penalties === 0 && winterScore.candidate?.xc?.observed?.sourceOwnershipRecovered === true && winterScore.candidate?.xc?.observed?.gitDeploymentRecovered === true, 'XC orphan penalty is removed only after source and Git deployment recovery');
add('ownershipGovernance', 5, ownership.includes('28171070eb3e2195af843e5e6e4e735c9ada8cc9') && ownership.includes('Post-merge GitHub status') && /screening signals/i.test(ownership) && /final trail-status source/i.test(ownership), 'hardened production merge, deployment evidence and model-vs-grooming boundary are recorded');
add('ownershipGovernance', 5, !(await exists('public/xcski/index.html')) && !(await exists('xcski/index.html')), 'core repo does not duplicate the XC production application');

// 20: daily decision flow on the controlled XC authority surface.
add('dailyDecisionFlow', 5, finalUx.includes('id="xc-decision-desk"') && finalUx.includes('Today’s Michigan XC decision desk'), 'XC authority gets a constraint-first decision desk');
add('dailyDecisionFlow', 5, ['Lower Peninsula snow is marginal', 'Grayling, Frederic or Roscommon', 'Traverse City', 'Upper Peninsula trip'].every((p) => finalUx.includes(p)), 'decision desk covers four practical drive constraints');
add('dailyDecisionFlow', 5, finalUx.includes('https://xcski.chrisizworski.com/') && /operator or groomer/i.test(finalUx), 'live snow handoff remains paired with trail-truth verification');
add('dailyDecisionFlow', 5, fieldCamera.includes('/assets/winter-final.js') && fieldCamera.includes('/michigan-cross-country-skiing'), 'existing XC bundle safely boots the final UX');

// 20: search capture. Preserve static owners and their existing local signals; create no thin URLs.
add('searchCapture', 5, xc.includes('<title>Michigan Cross-Country Skiing: Trails &amp; Live Conditions</title>') && xc.includes('<h1>Michigan Cross-Country Skiing</h1>') && xc.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-cross-country-skiing/">'), 'XC title, H1 and canonical keep statewide planning ownership');
add('searchCapture', 5, ['Brighton · Southeast Michigan', 'Frederic · Northern Lower Peninsula', 'Traverse City', 'Roscommon', 'Marquette · Upper Peninsula', 'Sault Ste. Marie · Upper Peninsula'].every((p) => xc.includes(p)), 'XC static source contains representative regional/location signals');
add('searchCapture', 5, regionHtml.every((html, i) => html.includes(`<title>${iceRegions[i][1]} | Chris Izworski</title>`) && html.includes(`rel="canonical" href="https://chrisizworski.com/michigan-ice/regions/${iceRegions[i][0]}.html"`)), 'all six existing Ice regional pages own exact local condition intent');
add('searchCapture', 5, tools.includes('href="/michigan-cross-country-skiing/"') && tools.includes('href="/michigan-ice/"') && !(await exists('public/winter-tools/index.html')), 'Tools routes into existing owners and no competing winter landing URL exists');

// 20: first-party measurement of the actual winter decision funnel.
add('measurement', 5, finalUx.includes('/assets/winter-funnel.js') && fieldCamera.includes('/assets/winter-final.js'), 'XC final UX loads the shared winter funnel');
add('measurement', 5, seasonalDesk.includes('/assets/winter-funnel.js') && seasonalDesk.includes('/michigan-ice/'), 'generated Ice surfaces load the shared winter funnel through their existing asset');
add('measurement', 8, ['Winter Surface View', 'Winter Decision Stage', 'Winter Handoff', 'Winter Verification Open'].every((event) => funnel.includes(event)), 'four stable winter funnel events are defined');
add('measurement', 2, !/localStorage|sessionStorage|document\.cookie|geolocation|getCurrentPosition|fingerprint/i.test(funnel + finalUx + seasonalDesk), 'measurement uses no browser storage, geolocation, cookies, or fingerprinting');

// 20: freeze discipline. Once merged, observed behavior becomes the loss function.
add('freezeDiscipline', 7, ownership.includes('## Winter freeze rule') && doc.reopenTriggers?.length === 5 && doc.reopenTriggers.includes('deployment ownership or control regression'), 'winter freeze rule and five current reopen triggers are explicit');
add('freezeDiscipline', 5, doc.outcomeMetrics?.principle?.includes('market loss function'), 'observed traffic and behavior supersede the build score');
add('freezeDiscipline', 4, Array.isArray(doc.outcomeMetrics?.funnel) && doc.outcomeMetrics.funnel.length === 4, 'post-launch funnel is explicitly defined');
add('freezeDiscipline', 4, doc.fatalPenalties?.some((x) => /feature churn/i.test(x)), 'continued unmeasured winter feature churn is a readiness failure');

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
