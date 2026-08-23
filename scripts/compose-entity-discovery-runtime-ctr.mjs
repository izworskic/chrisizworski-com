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

await update('public/timeline/index.html', (source) => {
  let s = source;
  s = mustReplace(s, '<title>Chris Izworski Career Timeline</title>', '<title>Chris Izworski Timeline: 911, AI &amp; Public Safety</title>', 'timeline title');
  s = mustReplace(s, '<meta name="description" content="Verified Chris Izworski career timeline covering Bay County 911, MCDA, APCO recognition, Saginaw County 911, NENA coverage, and Prepared.">', '<meta name="description" content="Chris Izworski career timeline: Michigan 911 leadership, emergency management, AI deployment, APCO recognition, NENA coverage, and current work at Prepared.">', 'timeline description');
  s = mustReplace(s, '<meta property="og:title" content="Chris Izworski Career Timeline">', '<meta property="og:title" content="Chris Izworski Timeline: 911, AI &amp; Public Safety">', 'timeline og title');
  s = mustReplace(s, '"name": "Chris Izworski, Career Timeline in Public Safety and AI"', '"name": "Chris Izworski Timeline: 911, AI and Public Safety"', 'timeline schema name');
  s = s.replace(/("dateModified"\s*:\s*")\d{4}-\d{2}-\d{2}(\")/, `$1${release}$2`);
  s = mustReplace(s, '<h1 class="page-title">Career Timeline</h1>', '<h1 class="page-title">Chris Izworski Career Timeline</h1>', 'timeline h1');
  s = mustReplace(s, '<p class="sub">Verified milestones from public records, media coverage, and official sources.</p>', '<p class="sub">Verified milestones in Michigan 911 leadership, emergency management, AI deployment, national public safety work, and current work at Prepared.</p>', 'timeline first answer');
  return s;
});

await update('public/tools/index.html', (source) => {
  let s = source;
  s = mustReplace(s, '<title>Free Michigan &amp; Great Lakes Tools | Chris Izworski</title>', '<title>Michigan &amp; Great Lakes Live Tools | Chris Izworski</title>', 'tools title');
  s = mustReplace(s, '<meta name="description" content="36 Michigan and Great Lakes tools: border wait times, Mackinac Bridge conditions, trout, salmon, ice, Soo Locks traffic, NOAA buoys, aurora and trip planners.">', '<meta name="description" content="Free Michigan and Great Lakes live tools for Soo Locks ships, Mackinac Bridge, beaches, aurora, rivers, ice, border waits, fishing, gardening and trip planning.">', 'tools description');
  s = mustReplace(s, '<meta property="og:title" content="Free Michigan &amp; Great Lakes Tools | Chris Izworski">', '<meta property="og:title" content="Michigan &amp; Great Lakes Live Tools | Chris Izworski">', 'tools og title');
  s = mustReplace(s, '"name":"Free Michigan and Great Lakes Tools | Chris Izworski"', '"name":"Michigan and Great Lakes Live Tools | Chris Izworski"', 'tools schema name');
  s = s.replace(/("dateModified"\s*:\s*")\d{4}-\d{2}-\d{2}(\")/, `$1${release}$2`);
  s = mustReplace(s, '<h1 class="page-title">Free Michigan and Great Lakes Tools</h1>', '<h1 class="page-title">Michigan &amp; Great Lakes Live Tools</h1>', 'tools h1');
  s = mustReplace(s, '<p class="sub">Live maps, forecasts, planners, calculators, and field guides built by Chris Izworski.</p>', '<p class="sub">Free live maps, forecasts, planners, calculators, and field guides for Michigan and the Great Lakes, built by Chris Izworski.</p>', 'tools first answer');
  return s;
});

await update('public/press/index.html', (source) => {
  let s = source;
  s = mustReplace(s, '<title>Press: Chris Izworski, AI in Public Safety &amp; 911</title>', '<title>Chris Izworski Press &amp; Media: 911, AI, Public Safety</title>', 'press title');
  s = mustReplace(s, '<meta name="description" content="Press page for Chris Izworski, NENA cover story author, WNEM TV5, WCMU NPR, Bridge Michigan, APCO. Solutions Consultant at Prepared. Bay City, Michigan.">', '<meta name="description" content="Chris Izworski press and media: verified 911 and AI coverage, publication bio, interview topics, NENA, APCO, WNEM, WCMU and Bridge Michigan.">', 'press description');
  s = mustReplace(s, '<meta property="og:title" content="Press | Chris Izworski, AI in Public Safety, Emergency Communications">', '<meta property="og:title" content="Chris Izworski Press &amp; Media: 911, AI, Public Safety">', 'press og title');
  s = mustReplace(s, '"name": "Press | Chris Izworski, AI in Public Safety, Emergency Communications"', '"name": "Chris Izworski Press and Media: 911, AI, Public Safety"', 'press schema name');
  s = s.replace(/("dateModified"\s*:\s*")\d{4}-\d{2}-\d{2}(\")/, `$1${release}$2`);
  s = mustReplace(s, '<h1 class="page-title">Press</h1>', '<h1 class="page-title">Chris Izworski Press &amp; Media</h1>', 'press h1');
  s = mustReplace(s, '<p class="sub">For reporters, producers, and editors. Interview requests welcome.</p>', '<p class="sub">Verified coverage, publication-ready bio, and interview information for reporters, producers, and editors.</p>', 'press first answer');
  return s;
});

await update('public/sitemap.xml', (source) => {
  let s = source;
  for (const route of ['timeline', 'tools', 'press']) {
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
  objective: 'Convert three already-high-ranking discovery/entity surfaces from zero clicks into qualified visits while preserving the homepage as the primary branded result.',
  source: {
    title: 'chrisizworski.com-Performance-on-Search-2026-08-22',
    spreadsheetId: '1dm2AC6FN4lU9P0viRs3mhVtg098AuvwEdNbKw-PsEVw',
    exportedThrough: '2026-08-20',
    windowDays: 7
  },
  homepageGuardrail: { path: '/', primaryBrandedOwner: true },
  pages: [
    { id: 'timeline', path: '/timeline/', baseline: { impressions: 52, clicks: 0, ctr: 0, averagePosition: 5.4 }, target: { ctr: 0.02, stretchCtr: 0.04, averagePositionMax: 8 }, title: 'Chris Izworski Timeline: 911, AI & Public Safety', h1: 'Chris Izworski Career Timeline' },
    { id: 'tools', path: '/tools/', baseline: { impressions: 26, clicks: 0, ctr: 0, averagePosition: 4.92 }, target: { ctr: 0.02, stretchCtr: 0.04, averagePositionMax: 8 }, title: 'Michigan & Great Lakes Live Tools | Chris Izworski', h1: 'Michigan & Great Lakes Live Tools' },
    { id: 'press', path: '/press/', baseline: { impressions: 23, clicks: 0, ctr: 0, averagePosition: 2.52 }, target: { ctr: 0.02, stretchCtr: 0.04, averagePositionMax: 6 }, title: 'Chris Izworski Press & Media: 911, AI, Public Safety', h1: 'Chris Izworski Press & Media' }
  ],
  aggregateBaseline: { impressions: 101, clicks: 0, ctr: 0 },
  measurement: { decisionWindowDays: 28, releaseDate: null, evaluationWindow: null, rule: 'Set production merge date as releaseDate; evaluate 28 complete days beginning the next day.' },
  freeze: ['title','metaDescription','h1','firstAnswer','structuredData','canonical','indexability']
};
await writeFile('benchmarks/entity-discovery-ctr-experiment.json', JSON.stringify(experiment, null, 2) + '\n');

const benchmarkScript = `#!/usr/bin/env node\nimport { readFile } from 'node:fs/promises';\nconst data = JSON.parse(await readFile('benchmarks/entity-discovery-ctr-experiment.json','utf8'));\nconst expected = {\n  timeline: { file:'public/timeline/index.html', title:'Chris Izworski Timeline: 911, AI &amp; Public Safety', h1:'Chris Izworski Career Timeline', canonical:'https://chrisizworski.com/timeline/' },\n  tools: { file:'public/tools/index.html', title:'Michigan &amp; Great Lakes Live Tools | Chris Izworski', h1:'Michigan &amp; Great Lakes Live Tools', canonical:'https://chrisizworski.com/tools/' },\n  press: { file:'public/press/index.html', title:'Chris Izworski Press &amp; Media: 911, AI, Public Safety', h1:'Chris Izworski Press &amp; Media', canonical:'https://chrisizworski.com/press/' }\n};\nconst failures=[];\nfor (const page of data.pages) {\n  const e=expected[page.id]; const html=await readFile(e.file,'utf8');\n  if (!html.includes('<title>'+e.title+'</title>')) failures.push(page.id+' title mismatch');\n  if (!html.includes('>'+e.h1+'</h1>')) failures.push(page.id+' h1 mismatch');\n  if (!html.includes('href=\\"'+e.canonical+'\\"')) failures.push(page.id+' canonical mismatch');\n  if (!html.includes('2026-08-23')) failures.push(page.id+' freshness mismatch');\n  if (page.baseline.clicks !== 0 || page.baseline.ctr !== 0) failures.push(page.id+' baseline drift');\n  if (page.target.ctr < 0.02) failures.push(page.id+' CTR target too weak');\n}\nif (data.aggregateBaseline.impressions !== 101 || data.aggregateBaseline.clicks !== 0) failures.push('aggregate baseline drift');\nconst home=await readFile('public/index.html','utf8');\nif (!home.includes('https://chrisizworski.com/')) failures.push('homepage guardrail missing');\nif (failures.length) { console.error('entity discovery CTR FAIL\\n- '+failures.join('\\n- ')); process.exit(1); }\nconsole.log('entity discovery CTR PASS — 101 zero-click impressions under measured treatment');\n`;
await writeFile('scripts/benchmark-entity-discovery-ctr.mjs', benchmarkScript);

await update('package.json', (source) => {
  const pkg = JSON.parse(source);
  pkg.scripts['benchmark:entity-discovery-ctr'] = 'node scripts/benchmark-entity-discovery-ctr.mjs';
  if (!pkg.scripts['verify:all'].includes('benchmark:entity-discovery-ctr')) pkg.scripts['verify:all'] += ' && npm run benchmark:entity-discovery-ctr -- --check';
  return JSON.stringify(pkg, null, 2) + '\n';
});

await update('scripts/verify-source-with-circle-tour.mjs', (source) => {
  const needle = `    '  "/great-lakes-beaches/oscoda-beach-park/",',\n    '',`;
  if (!source.includes(needle)) throw new Error('source parity declaration insertion point missing');
  const replacement = [
    `    '  "/great-lakes-beaches/oscoda-beach-park/",',`,
    `    '  // Aug 23 2026: measured CTR treatment for three distinct entity/discovery surfaces.',`,
    `    '  "/timeline/",',`,
    `    '  "/tools/",',`,
    `    '  "/press/",',`,
    `    '',`
  ].join('\n');
  return source.replace(needle, replacement);
});

execFileSync(process.execPath, ['scripts/benchmark-entity-discovery-ctr.mjs', '--check'], { stdio: 'inherit' });

execFileSync('git', ['rm', '--', 'scripts/compose-entity-discovery-runtime-ctr.mjs', '.github/workflows/entity-discovery-runtime-ctr-temp.yml'], { stdio:'inherit' });
execFileSync('git', ['config','user.name','github-actions[bot]']);
execFileSync('git', ['config','user.email','41898282+github-actions[bot]@users.noreply.github.com']);
execFileSync('git', ['add','-A']);
execFileSync('git', ['commit','-m','Launch entity discovery CTR sprint'], { stdio:'inherit' });
execFileSync('git', ['push','origin','HEAD'], { stdio:'inherit' });
