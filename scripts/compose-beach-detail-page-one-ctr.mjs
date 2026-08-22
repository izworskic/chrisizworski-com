#!/usr/bin/env node

import { readFile, writeFile, unlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => readFile(path.join(root, file), 'utf8');
const write = (file, content) => writeFile(path.join(root, file), content);
const release = '2026-08-22';

const targets = [
  {
    slug: 'warren-dunes-state-park',
    name: 'Warren Dunes State Park',
    impressions: 124,
    clicks: 1,
    ctr: 0.0081,
    position: 9.28,
    title: 'Warren Dunes Beach Conditions Today: Waves & Swim Risk',
    h1: 'Warren Dunes Beach Conditions Today',
    schemaName: 'Warren Dunes Beach Conditions Today',
    description: 'Check Warren Dunes beach conditions today: NWS swim risk, Lake Michigan waves and water temperature, BeachGuard notices, wind and weather.',
    heroLede: "Check today's NWS swim risk, Lake Michigan waves, water temperature, wind, weather, and BeachGuard notices before you go. The physical posted flag must still be checked at the beach."
  },
  {
    slug: 'luna-pier',
    name: 'Luna Pier Beach',
    impressions: 56,
    clicks: 0,
    ctr: 0,
    position: 9.59,
    title: 'Luna Pier Beach Water Quality & Conditions Today',
    h1: 'Luna Pier Beach Water Quality & Conditions Today',
    schemaName: 'Luna Pier Beach Water Quality & Conditions Today',
    description: 'Check Luna Pier Beach water quality context and conditions today: BeachGuard notices, NWS swim risk, Lake Erie waves, water temperature and weather.',
    heroLede: 'Check Michigan BeachGuard notices and sampling history, NWS swim risk, Lake Erie waves and water temperature, and weather for Luna Pier. This page does not certify the water as safe; check posted signs and flags onsite.'
  },
  {
    slug: 'new-buffalo-beach',
    name: 'New Buffalo Beach',
    impressions: 46,
    clicks: 0,
    ctr: 0,
    position: 9.04,
    title: 'New Buffalo Beach Conditions Today: Swim Risk & Waves',
    h1: 'New Buffalo Beach Conditions Today',
    schemaName: 'New Buffalo Beach Conditions Today',
    description: 'Check New Buffalo Beach conditions today: NWS swim risk, Lake Michigan waves and water temperature, BeachGuard notices and weather. Confirm the posted flag onsite.',
    heroLede: "Looking for today's flag? Check current NWS swim risk, BeachGuard notices, Lake Michigan waves, water temperature, and weather here, then confirm the physical posted flag when you arrive."
  },
  {
    slug: 'pj-hoffmaster-state-park',
    name: 'P.J. Hoffmaster State Park',
    impressions: 37,
    clicks: 0,
    ctr: 0,
    position: 8.46,
    title: 'P.J. Hoffmaster Beach Conditions Today: Waves & Water',
    h1: 'P.J. Hoffmaster Beach Conditions Today',
    schemaName: 'P.J. Hoffmaster Beach Conditions Today',
    description: 'Check P.J. Hoffmaster beach conditions today: NWS swim risk, Lake Michigan waves, water temperature, BeachGuard notices, wind and weather.',
    heroLede: "Check today's NWS swim risk, Lake Michigan waves, water temperature, wind, weather, and BeachGuard notices for P.J. Hoffmaster before heading to the beach. Confirm posted flags and signs onsite."
  },
  {
    slug: 'oscoda-beach-park',
    name: 'Oscoda Beach Park',
    impressions: 36,
    clicks: 0,
    ctr: 0,
    position: 7.53,
    title: 'Oscoda Beach Park Conditions Today: Waves & Water',
    h1: 'Oscoda Beach Park Conditions Today',
    schemaName: 'Oscoda Beach Park Conditions Today',
    description: 'Check Oscoda Beach Park conditions today: Lake Huron waves and water temperature, BeachGuard notices, NWS alerts, wind and weather.',
    heroLede: "Check today's Lake Huron waves, water temperature, wind, weather, BeachGuard notices, and NWS alerts for Oscoda Beach Park before you go. Confirm posted flags and shoreline conditions onsite."
  }
];

const aggregate = {
  impressions: targets.reduce((sum, page) => sum + page.impressions, 0),
  clicks: targets.reduce((sum, page) => sum + page.clicks, 0),
  ctr: targets.reduce((sum, page) => sum + page.clicks, 0) / targets.reduce((sum, page) => sum + page.impressions, 0),
  weightedAveragePosition: targets.reduce((sum, page) => sum + page.impressions * page.position, 0) / targets.reduce((sum, page) => sum + page.impressions, 0)
};

// Make the generator own the treatment so future beach rebuilds cannot erase it.
let generator = await read('scripts/generate-beach-pages.mjs');
if (!generator.includes('const DETAIL_SEARCH_OVERRIDES =')) {
  const marker = 'const DESCRIPTION_LIMIT = 158;\n';
  const overrides = `\nconst DETAIL_SEARCH_OVERRIDES = ${JSON.stringify(Object.fromEntries(targets.map((page) => [page.slug, {
    title: page.title,
    h1: page.h1,
    schemaName: page.schemaName,
    description: page.description,
    heroLede: page.heroLede,
  }])), null, 2)};\n`;
  if (!generator.includes(marker)) throw new Error('Could not locate beach generator override insertion point');
  generator = generator.replace(marker, marker + overrides);
}

generator = generator.replace(
  'function detailTitle(name) {\n  const base = `${name} Conditions Today`;',
  'function detailTitle(beach) {\n  const override = DETAIL_SEARCH_OVERRIDES[beach.slug];\n  if (override?.title) return override.title;\n  const name = beach.name;\n  const base = `${name} Conditions Today`;'
);
generator = generator.replace(
  'function detailDescription(beach) {\n  const candidates = [',
  'function detailDescription(beach) {\n  const override = DETAIL_SEARCH_OVERRIDES[beach.slug];\n  if (override?.description) return override.description;\n  const candidates = ['
);
generator = generator.replace('  const title = detailTitle(beach.name);', '  const title = detailTitle(beach);');
generator = generator.replace(
  '  const detailModified = beach.camera ? "2026-08-17" : catalog.version;',
  `  const searchOverride = DETAIL_SEARCH_OVERRIDES[beach.slug];\n  const detailModified = searchOverride ? "${release}" : (beach.camera ? "2026-08-17" : catalog.version);`
);
generator = generator.replace(
  '        name: `${beach.name} Conditions Today`,',
  '        name: searchOverride?.schemaName || `${beach.name} Conditions Today`,'
);
generator = generator.replace(
  '      <h1 id="page-title">${html(beach.name)}</h1>\n      <p class="hero-lede">${html(beach.summary)}</p>',
  '      <h1 id="page-title">${html(searchOverride?.h1 || beach.name)}</h1>\n      <p class="hero-lede">${html(searchOverride?.heroLede || beach.summary)}</p>'
);
await write('scripts/generate-beach-pages.mjs', generator);

const generated = spawnSync(process.execPath, [path.join(root, 'scripts', 'generate-beach-pages.mjs')], { cwd: root, stdio: 'inherit' });
if ((generated.status ?? 1) !== 0) throw new Error('Beach generator failed');

const benchmark = {
  version: '1.0.0',
  updated: release,
  timezone: 'America/Detroit',
  id: 'beach-detail-page-one-ctr-2026-08-22',
  status: 'ready-for-production-release',
  source: 'Google Search Console export chrisizworski.com-Performance-on-Search-2026-08-21, exported through 2026-08-19',
  hypothesis: 'Five individual Michigan beach pages already rank on page one but their static opening copy describes the place instead of answering the conditions intent Google is showing. Query-specific titles, H1s and direct first answers should lift CTR while the statewide Beach Report root remains unchanged.',
  aggregateBaseline: aggregate,
  pages: targets.map((page) => ({
    path: `/great-lakes-beaches/${page.slug}/`,
    impressions: page.impressions,
    clicks: page.clicks,
    ctr: page.ctr,
    averagePosition: page.position,
    treatment: {
      title: page.title,
      h1: page.h1,
      firstAnswer: page.heroLede,
    }
  })),
  measurement: {
    primaryWindowDays: 28,
    windowStarts: 'first complete America/Detroit day after production release',
    primaryMetric: 'aggregate and page-level Search Console CTR',
    targetAggregateCtr: 0.015,
    stretchAggregateCtr: 0.025,
    weightedPositionGuardrail: 10.5,
    decisionRule: 'Keep the treatment if aggregate CTR materially improves while the five-page weighted average position remains at or better than 10.5. Evaluate page-level outliers separately rather than reverting the whole cluster for one weak page.'
  },
  truthBoundary: 'Never claim a physical posted beach flag is known remotely or that BeachGuard/NWS data certifies a beach safe to swim. Posted signs, flags, lifeguards, official closures and onsite conditions remain authoritative.',
  rootGuardrail: 'Do not change /great-lakes-beaches/ while its statewide Beach Conditions CTR experiment is protected.',
  freeze: ['title', 'metaDescription', 'h1', 'firstAnswer', 'structuredData', 'canonical', 'indexability']
};
await write('benchmarks/beach-detail-page-one-ctr.json', JSON.stringify(benchmark, null, 2) + '\n');

const benchmarkScript = `#!/usr/bin/env node\n\nimport { readFile } from 'node:fs/promises';\nimport path from 'node:path';\n\nconst root = path.resolve(import.meta.dirname, '..');\nconst config = JSON.parse(await readFile(path.join(root, 'benchmarks/beach-detail-page-one-ctr.json'), 'utf8'));\nconst rootHtml = await readFile(path.join(root, 'public/great-lakes-beaches/index.html'), 'utf8');\nconst generator = await readFile(path.join(root, 'scripts/generate-beach-pages.mjs'), 'utf8');\nconst failures = [];\nconst fail = (condition, message) => { if (!condition) failures.push(message); };\n\nfail(config.aggregateBaseline.impressions === 299, 'aggregate impression baseline drift');\nfail(config.aggregateBaseline.clicks === 1, 'aggregate click baseline drift');\nfail(Math.abs(config.aggregateBaseline.ctr - (1 / 299)) < 1e-9, 'aggregate CTR baseline drift');\nfail(config.aggregateBaseline.weightedAveragePosition > 8.98 && config.aggregateBaseline.weightedAveragePosition < 9.00, 'weighted position baseline drift');\nfail(config.measurement.primaryWindowDays === 28, 'decision window must remain 28 days');\nfail(config.measurement.targetAggregateCtr >= 0.015, 'CTR target weakened');\nfail(config.measurement.weightedPositionGuardrail <= 10.5, 'rank guardrail weakened');\nfail(rootHtml.includes('<title>Michigan Beach Conditions Today | Chris Izworski</title>'), 'protected statewide beach root title changed');\nfail(rootHtml.includes('<h1>Michigan Beach Conditions Today</h1>'), 'protected statewide beach root H1 changed');\nfail(generator.includes('const DETAIL_SEARCH_OVERRIDES ='), 'generator does not own detail treatments');\n\nfor (const page of config.pages) {\n  const slug = page.path.split('/').filter(Boolean).at(-1);\n  const html = await readFile(path.join(root, 'public', 'great-lakes-beaches', slug, 'index.html'), 'utf8');\n  fail(html.includes(\`<title>\${page.treatment.title}</title>\`), \`\${slug}: title drift\`);\n  fail(html.includes(\`<h1 id="page-title">\${page.treatment.h1}</h1>\`), \`\${slug}: H1 drift\`);\n  fail(html.includes(page.treatment.firstAnswer.replaceAll('&', '&amp;').replaceAll("'", '&#039;')) || html.includes(page.treatment.firstAnswer), \`\${slug}: first answer drift\`);\n  fail(html.includes(\`<link rel="canonical" href="https://chrisizworski.com\${page.path}">\`), \`\${slug}: canonical drift\`);\n  fail(html.includes('NWS swim risk is a forecast, not the posted flag'), \`\${slug}: posted-flag truth boundary missing\`);\n  fail(html.includes('"dateModified": "2026-08-22"'), \`\${slug}: freshness stamp not aligned\`);\n}\n\nconsole.log('\\nBEACH DETAIL PAGE-ONE CTR EXPERIMENT');\nconsole.log('='.repeat(72));\nconsole.log(\`Baseline: \${config.aggregateBaseline.impressions} impressions / \${config.aggregateBaseline.clicks} click / \${(config.aggregateBaseline.ctr * 100).toFixed(2)}% CTR / weighted position \${config.aggregateBaseline.weightedAveragePosition.toFixed(2)}\`);\nconsole.log(\`Target CTR: \${(config.measurement.targetAggregateCtr * 100).toFixed(1)}% · stretch \${(config.measurement.stretchAggregateCtr * 100).toFixed(1)}%\`);\nif (failures.length) { for (const failure of failures) console.error(\`FAIL: \${failure}\`); process.exit(1); }\nconsole.log('benchmark:beach-detail-ctr PASS\\n');\n`;
await write('scripts/benchmark-beach-detail-page-one-ctr.mjs', benchmarkScript);

// Register each page separately so search-facing freezes remain page-specific.
const ledgerPath = 'benchmarks/growth-experiments.json';
const ledger = JSON.parse(await read(ledgerPath));
for (const page of targets) {
  const id = `2026-08-22-${page.slug}-detail-ctr`;
  if (ledger.experiments.some((experiment) => experiment.id === id)) continue;
  ledger.experiments.push({
    id,
    path: `/great-lakes-beaches/${page.slug}/`,
    hypothesis: 'A query-specific conditions title/H1 and direct first answer will convert existing page-one visibility into clicks without changing the statewide Beach Report root.',
    primaryMetric: 'Search Console page CTR',
    baseline: { impressions: page.impressions, clicks: page.clicks, ctr: page.ctr, averagePosition: page.position },
    target: { ctr: 0.015, averagePositionMax: 11.5 },
    status: 'pending-clean-window',
    releaseDate: null,
    evaluationWindow: null,
    lastSearchFacingChangeDate: release,
    decisionDate: null,
    result: null,
    stopCondition: 'Canonical/indexability changes, truthful BeachGuard/NWS/posted-flag boundaries regress, or average position materially falls beyond the page-specific guardrail.'
  });
}
ledger.ledgerVersion = '1.13.0';
await write(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');

// Add the measured cluster to portfolio protection without changing the root beach experiment.
const authorityPath = 'benchmarks/search-authority-portfolio.json';
const authority = JSON.parse(await read(authorityPath));
if (!authority.focusPortfolio.some((item) => item.id === 'beach-detail-page-one')) {
  authority.focusPortfolio.push({
    id: 'beach-detail-page-one',
    surface: 'five high-impression /great-lakes-beaches/ detail pages',
    priorityScore: 89,
    action: 'PROTECT',
    next: 'Measure the August 22 local-intent CTR treatment for Warren Dunes, Luna Pier, New Buffalo, P.J. Hoffmaster and Oscoda for a clean 28-day window; keep the statewide Beach Report root experiment untouched.',
    observed: { impressions: aggregate.impressions, clicks: aggregate.clicks, ctr: aggregate.ctr, weightedPosition: Number(aggregate.weightedAveragePosition.toFixed(2)) }
  });
}
const protectedLabel = 'Five beach detail page-one CTR treatments — 299 impressions combined, 0.33% CTR, weighted position 8.99; statewide root untouched';
if (!authority.protectedQueue.includes(protectedLabel)) authority.protectedQueue.push(protectedLabel);
authority.version = '1.2.0';
authority.updated = release;
await write(authorityPath, JSON.stringify(authority, null, 2) + '\n');

// Wire benchmark into the full repository gate.
const packagePath = 'package.json';
const pkg = JSON.parse(await read(packagePath));
pkg.scripts['benchmark:beach-detail-ctr'] = 'node scripts/benchmark-beach-detail-page-one-ctr.mjs';
if (!pkg.scripts['verify:all'].includes('benchmark:beach-detail-ctr')) {
  pkg.scripts['verify:all'] += ' && npm run benchmark:beach-detail-ctr -- --check';
}
await write(packagePath, JSON.stringify(pkg, null, 2) + '\n');

// Declare only the five generated pages as intentional live-source changes.
const verifyPath = 'scripts/verify-source.mjs';
let verify = await read(verifyPath);
const declaration = `  // Aug 22 2026: page-one CTR treatment on five individual beach detail pages. The statewide Beach Report root remains frozen. Re-crawl after production release, then remove.\n${targets.map((page) => `  "/great-lakes-beaches/${page.slug}/",`).join('\n')}\n`;
if (!verify.includes('/great-lakes-beaches/warren-dunes-state-park/')) {
  verify = verify.replace('const intentionalChanges = new Set([\n', 'const intentionalChanges = new Set([\n' + declaration);
}
await write(verifyPath, verify);

// Keep page freshness and both relevant sitemap signals aligned to the real search-facing change.
for (const sitemapPath of ['public/sitemap.xml', 'public/sitemap-beaches.xml']) {
  let sitemap = await read(sitemapPath);
  for (const page of targets) {
    const escaped = page.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(<loc>https://chrisizworski\\.com/great-lakes-beaches/${escaped}/</loc>\\s*<lastmod>)[^<]+(</lastmod>)`);
    sitemap = sitemap.replace(re, `$1${release}$2`);
  }
  await write(sitemapPath, sitemap);
}

// One-time transport files must not survive into the PR diff.
for (const file of [
  'scripts/compose-beach-detail-page-one-ctr.mjs',
  '.github/workflows/beach-detail-page-one-ctr-temp.yml',
  'notes/beach-detail-page-one-ctr-trigger.md'
]) {
  try { await unlink(path.join(root, file)); } catch {}
}

console.log(`Composed five-page beach detail CTR treatment: ${aggregate.impressions} impressions, ${(aggregate.ctr * 100).toFixed(2)}% CTR, weighted position ${aggregate.weightedAveragePosition.toFixed(2)}`);
