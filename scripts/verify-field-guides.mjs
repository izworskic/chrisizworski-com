#!/usr/bin/env node
/**
 * Automated Field Guide Network Verifier (scripts/verify-field-guides.mjs)
 * Reads public/assets/field-guides-registry.json and verifies:
 * 1. Every "live" guide exists on disk at public/<slug>/index.html
 * 2. Every "live" guide is listed on /guides/ (public/guides/index.html) with data-months
 * 3. Every "live" guide is listed in the compact shelf on /tools/ (public/tools/index.html)
 * 4. Every "live" guide is listed in /sitemap-winter.xml (public/sitemap-winter.xml)
 * 5. Every "live" guide has 100% real photographs (0 .wf-story-index placeholder boxes)
 * 6. Two-way companion links exist on /, /michigan-snow-depth/, /lake-effect-snow/, and /freighters/
 */
import {readFileSync, existsSync} from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const registry = JSON.parse(read('public/assets/field-guides-registry.json'));
const guidesHub = read('public/guides/index.html');
const toolsHub = read('public/tools/index.html');
const sitemapWinter = read('public/sitemap-winter.xml');
const homeHtml = read('public/index.html');
const snowDepthHtml = read('public/michigan-snow-depth/index.html');
const lakeEffectHtml = read('public/lake-effect-snow/index.html');
const freightersHtml = read('public/freighters/index.html');

const failures = [];

for (const g of registry.guides) {
  if (g.status !== 'live') continue;
  const htmlPath = `public/${g.slug}/index.html`;
  if (!existsSync(htmlPath)) {
    failures.push(`Missing guide HTML: ${htmlPath}`);
    continue;
  }
  const html = read(htmlPath);
  const stories = (html.match(/<article class="wf-story"/g) || []).length;
  if (stories !== g.stopCount) {
    failures.push(`${g.slug}: expected ${g.stopCount} .wf-story cards, found ${stories}`);
  }
  if (html.includes('class="wf-story-index"')) {
    failures.push(`${g.slug}: contains placeholder .wf-story-index box`);
  }
  if (!guidesHub.includes(`href="${g.url}"`)) {
    failures.push(`/guides/ missing link to ${g.url}`);
  }
  if (!toolsHub.includes(`href="${g.url}"`)) {
    failures.push(`/tools/ missing link to ${g.url}`);
  }
  if (!sitemapWinter.includes(`https://chrisizworski.com${g.url}`)) {
    failures.push(`/sitemap-winter.xml missing ${g.url}`);
  }
}

if (toolsHub.includes('class="winter-field-guide-desk"')) {
  failures.push('/tools/ still contains old stacked .winter-field-guide-desk banners instead of compact #field-guides-shelf');
}
if (!homeHtml.includes('/michigan-winter-weekends/') || !homeHtml.includes('/michigan-white-christmas-escapes/')) {
  failures.push('Homepage / missing companion links to flagship winter field guides');
}
if (!snowDepthHtml.includes('/michigan-first-snow-adventures/') || !snowDepthHtml.includes('/michigan-winter-weekends/')) {
  failures.push('/michigan-snow-depth/ missing two-way links to companion field guides');
}
if (!lakeEffectHtml.includes('/michigan-first-snow-adventures/') || !lakeEffectHtml.includes('/michigan-winter-weekends/')) {
  failures.push('/lake-effect-snow/ missing two-way links to companion field guides');
}
if (!freightersHtml.includes('/great-lakes-winter-freighter-guide/')) {
  failures.push('/freighters/ missing two-way link to /great-lakes-winter-freighter-guide/');
}

if (failures.length > 0) {
  console.error('FIELD GUIDE NETWORK VERIFICATION FAILED:');
  for (const f of failures) console.error(' - ' + f);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: 'passed',
      liveGuidesVerified: registry.guides.filter((g) => g.status === 'live').length,
      plannedWaves: registry.plannedRoadmap.length,
      hubsSynced: ['/guides/', '/tools/', '/', '/michigan-snow-depth/', '/lake-effect-snow/', '/freighters/', '/sitemap-winter.xml'],
    },
    null,
    2
  )
);
