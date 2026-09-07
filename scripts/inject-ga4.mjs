#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'public');
const MEASUREMENT_ID = 'G-Y5D2V2W7HN';
const ADSENSE_PUBLISHER_ID = 'ca-pub-8222782620788075';
const GA4_TAG = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${MEASUREMENT_ID}');
</script>`;
const ADSENSE_TAG = `<meta name="google-adsense-account" content="${ADSENSE_PUBLISHER_ID}">`;

const MIGRATED_TOOLS_SECTION = `
<section id="first-party-migrated-tools" class="decision-network" aria-labelledby="first-party-migrated-title">
  <div class="decision-network__head">
    <h2 id="first-party-migrated-title">More first-party live tools</h2>
    <p>These tools run from ChrisIzworski.com and Vercel. No Replit runtime is required.</p>
  </div>
  <div class="decision-network__grid">
    <div class="decision-network__lane">
      <h3>Ontario fishing</h3>
      <ul><li><a href="/ontario-fishing-lake-finder/">Ontario Fishing Lake Finder<span>Ontario lake registry, fish evidence, access, roads, fire and weather context</span></a></li></ul>
    </div>
    <div class="decision-network__lane">
      <h3>National waterfall planning</h3>
      <ul><li><a href="/national-tools/waterfalls/">Waterfall Window<span>Live water conditions translated into a go-or-wait trip decision</span></a></li></ul>
    </div>
    <div class="decision-network__lane">
      <h3>Niagara Falls</h3>
      <ul><li><a href="/national-tools/niagara-rainbow/">Niagara Falls Rainbow Predictor<span>Sun angle, NWS weather, mist geometry and live camera checks</span></a></li></ul>
    </div>
  </div>
</section>`;

let scanned = 0;
let ga4Injected = 0;
let ga4AlreadyTagged = 0;
let adsenseInjected = 0;
let adsenseAlreadyTagged = 0;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.html')) continue;
    scanned += 1;
    const html = await readFile(fullPath, 'utf8');
    const needsGa4 = !html.includes(MEASUREMENT_ID);
    const needsAdsense = !html.includes(ADSENSE_PUBLISHER_ID);

    if (!needsGa4) ga4AlreadyTagged += 1;
    if (!needsAdsense) adsenseAlreadyTagged += 1;
    if (!needsGa4 && !needsAdsense) continue;

    if (!/<\/head>/i.test(html)) {
      throw new Error(`Cannot inject site tags: missing </head> in ${path.relative(ROOT, fullPath)}`);
    }

    const tags = [];
    if (needsGa4) {
      tags.push(GA4_TAG);
      ga4Injected += 1;
    }
    if (needsAdsense) {
      tags.push(ADSENSE_TAG);
      adsenseInjected += 1;
    }

    await writeFile(fullPath, html.replace(/<\/head>/i, `${tags.join('\n')}\n</head>`));
  }
}

async function injectMigratedTools() {
  const toolsPath = path.join(ROOT, 'tools', 'index.html');
  let html = await readFile(toolsPath, 'utf8');
  if (html.includes('id="first-party-migrated-tools"')) return false;
  const footerAnchor = /<\/div>\s*<div class="footer">/i;
  if (!footerAnchor.test(html)) throw new Error('Cannot add first-party migrated tools: /tools/ footer anchor not found');
  html = html.replace(footerAnchor, `${MIGRATED_TOOLS_SECTION}\n</div>\n<div class="footer">`);
  await writeFile(toolsPath, html);
  return true;
}

async function collectTextFiles(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectTextFiles(fullPath, out);
      continue;
    }
    if (entry.isFile() && /\.(?:html?|js|mjs|cjs|json|css|txt)$/i.test(entry.name)) out.push(fullPath);
  }
  return out;
}

async function assertNoReplitRuntime() {
  const roots = [path.join(process.cwd(), 'api'), path.join(process.cwd(), 'lib')];
  const files = [
    path.join(process.cwd(), 'vercel.json'),
    path.join(ROOT, 'ontario-fishing-lake-finder', 'index.html'),
    path.join(ROOT, 'national-tools', 'niagara-rainbow', 'index.html')
  ];
  for (const root of roots) {
    try { await collectTextFiles(root, files); } catch {}
  }
  const hits = [];
  for (const file of files) {
    try {
      const text = await readFile(file, 'utf8');
      if (/https?:\/\/[^\s"']*replit\.app/i.test(text)) hits.push(path.relative(process.cwd(), file));
    } catch {}
  }
  if (hits.length) {
    throw new Error(`Replit runtime dependency detected in production surface(s): ${hits.join(', ')}`);
  }
  return files.length;
}

await injectMigratedTools();
await walk(ROOT);
const runtimeFilesChecked = await assertNoReplitRuntime();
console.log(JSON.stringify({
  measurementId: MEASUREMENT_ID,
  adsensePublisherId: ADSENSE_PUBLISHER_ID,
  scanned,
  ga4Injected,
  ga4AlreadyTagged,
  adsenseInjected,
  adsenseAlreadyTagged,
  runtimeFilesChecked,
  replitRuntimeDependencies: 0,
  root: 'public',
}));
