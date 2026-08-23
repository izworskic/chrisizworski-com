#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const release = '2026-08-23';

async function update(path, fn) {
  const before = await readFile(path, 'utf8');
  const after = fn(before);
  if (after === before) throw new Error(`No change produced for ${path}`);
  await writeFile(path, after);
}
function mustReplace(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Missing ${label}`);
  return source.replace(from, to);
}

await update('public/great-lakes/index.html', (source) => {
  let s = source;
  s = mustReplace(
    s,
    '<h3><a href="/lake-superior-circle-tour/">Lake Superior Circle Tour</a></h3>\n    <p>The complete 1,300-mile circumnavigation: 31 stops, three concrete itineraries (7, 10, 14 days), freighter-watching notes at every port, live water-level data, and field intel for the Canadian north shore. The most detailed Circle Tour guide on the web from a Great Lakes Bay Region perspective.</p>',
    '<h3><a href="/lake-superior-circle-tour/">Lake Superior Circle Tour Map &amp; 7–15 Day Planner</a></h3>\n    <p>Plan the complete Lake Superior Circle Tour with an interactive map, 31 stops, 7-, 10-, and 15-day itineraries, daily route directions, Canadian north-shore notes, freighter-watching stops, and current trip alerts.</p>',
    'Great Lakes Circle Tour card',
  );
  s = s.replace(/("dateModified"\s*:\s*")\d{4}-\d{2}-\d{2}(\")/, `$1${release}$2`);
  return s;
});

await update('public/great-lakes-lighthouses/index.html', (source) => {
  let s = source;
  const anchor = '</div>\n<div class="filter-bar">';
  const insert = '</div>\n<p class="note"><strong>Planning the Lake Superior lights as a road trip?</strong> Use the <a href="/lake-superior-circle-tour/">Lake Superior Circle Tour map and 7–15 day planner</a> to connect Whitefish Point, Au Sable Light, Marquette, the Keweenaw, Duluth, Split Rock, the North Shore, Thunder Bay, and the Canadian side into one continuous route.</p>\n<div class="filter-bar">';
  s = mustReplace(s, anchor, insert, 'lighthouse Circle Tour handoff');
  s = s.replace(/("dateModified"\s*:\s*")\s*\d{4}-\d{2}-\d{2}(\")/, `$1${release}$2`);
  return s;
});

await update('public/sitemap.xml', (source) => {
  let s = source;
  for (const route of ['great-lakes', 'great-lakes-lighthouses']) {
    const re = new RegExp(`(<loc>https:\\/\\/chrisizworski\\.com\\/${route}\\/<\\/loc>\\s*<lastmod>)[^<]+(<\\/lastmod>)`);
    if (!re.test(s)) throw new Error(`Missing sitemap route ${route}`);
    s = s.replace(re, `$1${release}$2`);
  }
  return s;
});

const experiment = {
  version: '1.0.0',
  updated: release,
  timezone: 'America/Detroit',
  objective: 'Move the existing Lake Superior Circle Tour planner toward page one by strengthening relevant internal authority without changing the destination search snippet or product.',
  source: {
    title: 'chrisizworski.com-Performance-on-Search-2026-08-22',
    spreadsheetId: '1dm2AC6FN4lU9P0viRs3mhVtg098AuvwEdNbKw-PsEVw',
    exportedThrough: '2026-08-20',
    windowDays: 7
  },
  destination: {
    path: '/lake-superior-circle-tour/',
    baseline: { impressions: 56, clicks: 0, ctr: 0, averagePosition: 21.16 },
    queryEvidence: [
      { query: 'lake superior circle tour app', impressions: 1, averagePosition: 25 },
      { query: 'lake superior circle tour guide 2026', impressions: 1, averagePosition: 28 },
      { query: 'lake superior circle tour map', impressions: 1, averagePosition: 32 },
      { query: 'best time of year for lake superior circle tour', impressions: 1, averagePosition: 35 },
      { query: 'map of lake superior circle tour', impressions: 1, averagePosition: 35 },
      { query: 'lake superior circle tour adventure guide', impressions: 1, averagePosition: 45 }
    ],
    target: { averagePositionMax: 15, stretchAveragePositionMax: 10, impressionsMin: 100 },
    freeze: ['title','metaDescription','h1','firstAnswer','structuredData','canonical','indexability']
  },
  distribution: [
    { sourcePath: '/great-lakes/', surface: 'Lake Superior Circle Tour Map & 7–15 Day Planner', role: 'Great Lakes authority hub' },
    { sourcePath: '/great-lakes-lighthouses/', surface: 'Lake Superior Circle Tour map and 7–15 day planner', role: 'Lake Superior road-trip context' }
  ],
  measurement: { decisionWindowDays: 28, releaseDate: null, evaluationWindow: null },
  stopCondition: 'Average position worsens beyond 28 after a meaningful sample, the Circle Tour destination search surface changes, or either inbound link becomes contextually misleading.'
};
await writeFile('benchmarks/circle-tour-rank-distribution.json', JSON.stringify(experiment, null, 2) + '\n');

const bench = `#!/usr/bin/env node\nimport { readFile } from 'node:fs/promises';\nconst failures=[];\nconst data=JSON.parse(await readFile('benchmarks/circle-tour-rank-distribution.json','utf8'));\nconst dest=await readFile('public/lake-superior-circle-tour/index.html','utf8');\nconst gl=await readFile('public/great-lakes/index.html','utf8');\nconst lights=await readFile('public/great-lakes-lighthouses/index.html','utf8');\nif (!dest.includes('Lake Superior Circle Tour Map: 7–15 Days')) failures.push('destination title drift');\nif (!dest.includes('interactive 1,300-mile Lake Superior Circle Tour map')) failures.push('destination meta/first-answer drift');\nif (!dest.includes('https://chrisizworski.com/lake-superior-circle-tour/')) failures.push('destination canonical drift');\nif (!gl.includes('Lake Superior Circle Tour Map &amp; 7–15 Day Planner')) failures.push('Great Lakes authority anchor missing');\nif (!gl.includes('7-, 10-, and 15-day itineraries')) failures.push('Great Lakes preset facts not corrected');\nif (!lights.includes('Lake Superior Circle Tour map and 7–15 day planner')) failures.push('lighthouse contextual handoff missing');\nif (data.destination.baseline.impressions !== 56 || data.destination.baseline.clicks !== 0 || data.destination.baseline.averagePosition !== 21.16) failures.push('baseline drift');\nif (data.destination.target.averagePositionMax > 15) failures.push('rank target too weak');\nif (failures.length) { console.error('Circle Tour rank distribution FAIL\\n- '+failures.join('\\n- ')); process.exit(1); }\nconsole.log('Circle Tour rank distribution PASS — destination frozen, two contextual authority paths active');\n`;
await writeFile('scripts/benchmark-circle-tour-rank-distribution.mjs', bench);

await update('package.json', (source) => {
  const pkg = JSON.parse(source);
  pkg.scripts['benchmark:circle-tour-rank'] = 'node scripts/benchmark-circle-tour-rank-distribution.mjs';
  if (!pkg.scripts['verify:all'].includes('benchmark:circle-tour-rank')) pkg.scripts['verify:all'] += ' && npm run benchmark:circle-tour-rank -- --check';
  return JSON.stringify(pkg, null, 2) + '\n';
});

await update('scripts/verify-source.mjs', (source) => {
  if (source.includes('"/great-lakes-lighthouses/"')) return source;
  const needle = '  "/great-lakes/",\n';
  if (!source.includes(needle)) throw new Error('intentionalChanges Great Lakes insertion point missing');
  return source.replace(needle, '  "/great-lakes/",\n  // Aug 23 2026: contextual Circle Tour rank-distribution handoff from lighthouse directory.\n  "/great-lakes-lighthouses/",\n');
});

execFileSync(process.execPath, ['scripts/benchmark-circle-tour-rank-distribution.mjs', '--check'], { stdio: 'inherit' });
execFileSync('git', ['rm', '--', 'scripts/compose-circle-tour-rank.mjs', '.github/workflows/circle-tour-rank-temp.yml'], { stdio:'inherit' });
execFileSync('git', ['config','user.name','github-actions[bot]']);
execFileSync('git', ['config','user.email','41898282+github-actions[bot]@users.noreply.github.com']);
execFileSync('git', ['add','-A']);
execFileSync('git', ['commit','-m','Launch Circle Tour rank distribution experiment'], { stdio:'inherit' });
execFileSync('git', ['push','origin','HEAD'], { stdio:'inherit' });
