#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const config = JSON.parse(await read('benchmarks/beach-detail-page-one-ctr.json'));
const rootHtml = await read('public/great-lakes-beaches/index.html');
const overrideSource = await read('scripts/apply-beach-detail-search-overrides.mjs');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const htmlEscape = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

check(config.aggregateBaseline.impressions === 299, 'aggregate impressions must stay 299');
check(config.aggregateBaseline.clicks === 1, 'aggregate clicks must stay 1');
check(Math.abs(config.aggregateBaseline.ctr - (1 / 299)) < 1e-12, 'aggregate CTR baseline drifted');
check(config.aggregateBaseline.weightedAveragePosition > 8.98 && config.aggregateBaseline.weightedAveragePosition < 9.00, 'weighted position baseline drifted');
check(config.measurement.primaryWindowDays === 28, 'measurement window must remain 28 days');
check(config.measurement.targetAggregateCtr >= 0.015, 'aggregate CTR target was weakened');
check(config.measurement.stretchAggregateCtr >= 0.025, 'stretch CTR target was weakened');
check(config.measurement.weightedPositionGuardrail <= 10.5, 'rank guardrail was weakened');

check(rootHtml.includes('<title>Michigan Beach Conditions Today | Chris Izworski</title>'), 'protected statewide Beach Report title changed');
check(rootHtml.includes('<h1 id="page-title">Michigan Beach Conditions Today</h1>'), 'protected statewide Beach Report H1 changed');

for (const page of config.pages) {
  const slug = page.path.split('/').filter(Boolean).at(-1);
  const html = await read(`public/great-lakes-beaches/${slug}/index.html`);
  const expectedTitle = htmlEscape(page.title);
  const expectedH1 = htmlEscape(page.h1);
  check(html.includes(`<title>${expectedTitle}</title>`) || html.includes(`<title>${page.title}</title>`), `${slug}: title drift`);
  check(html.includes(`<h1 id="page-title">${expectedH1}</h1>`) || html.includes(`<h1 id="page-title">${page.h1}</h1>`), `${slug}: H1 drift`);
  check(html.includes(`<link rel="canonical" href="https://chrisizworski.com${page.path}">`), `${slug}: canonical drift`);
  check(html.includes('"dateModified": "2026-08-22"'), `${slug}: dateModified is not aligned to release`);
  check(html.includes('NWS swim risk is a forecast, not the posted flag'), `${slug}: posted-flag truth boundary missing`);
  check(overrideSource.includes(`'${slug}'`), `${slug}: durable generator override missing`);
}

check(overrideSource.includes('WebPage'), 'durable override does not keep WebPage schema aligned');
check(overrideSource.includes('dateModified'), 'durable override does not preserve freshness alignment');

console.log('\nBEACH DETAIL PAGE-ONE CTR EXPERIMENT');
console.log('='.repeat(72));
console.log(`Baseline: ${config.aggregateBaseline.impressions} impressions / ${config.aggregateBaseline.clicks} click / ${(config.aggregateBaseline.ctr * 100).toFixed(2)}% CTR / weighted position ${config.aggregateBaseline.weightedAveragePosition.toFixed(2)}`);
console.log(`Target CTR: ${(config.measurement.targetAggregateCtr * 100).toFixed(1)}% · stretch ${(config.measurement.stretchAggregateCtr * 100).toFixed(1)}% · rank guardrail ${config.measurement.weightedPositionGuardrail.toFixed(1)}`);

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log('benchmark:beach-detail-ctr PASS\n');
