#!/usr/bin/env node
// On-demand, read-only production inspection for the October 25 search-growth cohort.
// Does not change site pages, GSC, indexing, ads, APIs, or metadata.
// Run: node scripts/audit-million-impressions-cohort.mjs
import { mkdir, writeFile } from 'node:fs/promises';

const origin = 'https://chrisizworski.com';
const asOf = '2026-10-22';
const measuredWindow = '2026-09-25..2026-10-22';
const pages = [
  { group: 'first-six', path: '/northern-lights-michigan/', impressions: 19892, clicks: 200, intent: 'Can I see northern lights in Michigan tonight?' },
  { group: 'first-six', path: '/great-lakes-freighter-tracking/', impressions: 9119, clicks: 142, intent: 'Track Great Lakes ships now' },
  { group: 'first-six', path: '/mackinac-bridge-live/', impressions: 5285, clicks: 20, intent: 'Is the Mackinac Bridge open today?' },
  { group: 'first-six', path: '/mackinac-bridge-tolls/', impressions: 5699, clicks: 13, intent: 'How much is the Mackinac Bridge toll?' },
  { group: 'first-six', path: '/national-tools/white-christmas/forecast/', impressions: 1614, clicks: 3, intent: 'Will it snow for Christmas?' },
  { group: 'first-six', path: '/michigan-snow-totals/', impressions: 1154, clicks: 8, intent: 'How much snow fell in Michigan?' },
  // Winter discovery checks: URL-based technical evidence, NOT confirmed rank potential.
  { group: 'winter-discovery', path: '/national-tools/snow/' },
  { group: 'winter-discovery', path: '/lake-effect-snow/' },
  { group: 'winter-discovery', path: '/michigan-snow-depth/' },
  { group: 'winter-discovery', path: '/michigan-ice/regions/saginaw-bay.html' },
  { group: 'winter-discovery', path: '/michigan-ice/' },
  { group: 'winter-discovery', path: '/michigan-ice-caves/' },
  { group: 'winter-discovery', path: '/michigan-cross-country-skiing/' },
  { group: 'winter-discovery', path: '/michigan-ski-hills/' },
  { group: 'winter-discovery', path: '/snowmobile/' },
  { group: 'winter-discovery', path: '/mackinac-ice-bridge/' },
  { group: 'winter-discovery', path: '/great-lakes-freighter-winter-layup/' }
];

function tagAttribute(tag, name) {
  const re = new RegExp('(?:\\s|^)' + name + '\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)', 'i');
  const match = re.exec(tag || '');
  return match ? (match[1] || match[2] || '') : '';
}
function textOnly(html) {
  return (html || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function tags(html, name) {
  return [...html.matchAll(new RegExp('<' + name + '\\b[^>]*>', 'gi'))].map(x => x[0]);
}
function meta(html, name) {
  const el = tags(html, 'meta').find(t => tagAttribute(t, 'name').toLowerCase() === name.toLowerCase());
  return el ? tagAttribute(el, 'content') : '';
}
function inspect(html, url, status, redirected) {
  const title = textOnly((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const h1 = textOnly((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]);
  const description = meta(html, 'description');
  const canonicalTags = tags(html, 'link').filter(t => tagAttribute(t, 'rel').toLowerCase().split(/\s+/).includes('canonical'));
  const canonical = canonicalTags.length ? tagAttribute(canonicalTags[0], 'href') : null;
  const robots = meta(html, 'robots') + ' ' + meta(html, 'googlebot');
  const content = textOnly((html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i) || [])[1] || html);
  const linkCount = (html.match(/<a\b[^>]*href=/gi) || []).length;
  const personReference = html.includes('https://chrisizworski.com/#person');
  const issues = [];
  const warnings = [];
  if (status !== 200) issues.push('HTTP response ' + status);
  if (redirected !== url) issues.push('Unexpected final URL: ' + redirected);
  if (canonicalTags.length !== 1 || canonical !== url) issues.push('Canonical mismatch: ' + (canonical || '(none)'));
  if (/\bnoindex\b/i.test(robots)) issues.push('Robots noindex in HTML');
  if (!title) issues.push('Missing title');
  if (!h1) issues.push('Missing H1 in initial HTML');
  if (!description) warnings.push('Missing description');
  if (title.length > 65) warnings.push('Title may be too long for a useful snippet');
  if (description.length > 165) warnings.push('Description may be truncated');
  if (content.length < 150) warnings.push('Little server-visible body content');
  if (!personReference) warnings.push('Canonical Person reference not found in raw HTML');
  if (linkCount < 3) warnings.push('Few crawlable HTML links');
  return { status, title, h1, description, canonical, contentChars: content.length,
    crawlableAnchors: linkCount, personReference, issues, warnings };
}
async function audit(item) {
  const url = origin + item.path;
  const base = { path: item.path, group: item.group, url, intent: item.intent || null,
    baseline: Number.isFinite(item.impressions) ? {
      window: measuredWindow, impressions: item.impressions, clicks: item.clicks,
      ctr: item.impressions ? item.clicks / item.impressions : 0
    } : null };
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(25000), redirect: 'follow',
      headers: { 'user-agent': 'ChrisIzworski-SearchGrowth-Audit/1.0 (+repository on-demand)' } });
    const html = await response.text();
    const r = inspect(html, url, response.status, response.url);
    if (/\bnoindex\b/i.test(response.headers.get('x-robots-tag') || '')) r.issues.push('X-Robots-Tag: noindex');
    return { ...base, ...r };
  } catch (error) {
    return { ...base, status: 'UNAVAILABLE', issues: ['HTTP inspection unavailable: ' + error.message], warnings: [] };
  }
}
const results = [];
// Sequential order deliberately starts with Northern Lights and caps external request rate.
for (const page of pages) results.push(await audit(page));
const first = results.filter(p => p.group === 'first-six');
const totals = first.reduce((a, p) => ({ impressions: a.impressions + p.baseline.impressions,
  clicks: a.clicks + p.baseline.clicks }), { impressions: 0, clicks: 0 });
const output = {
  checkedAt: new Date().toISOString(), dataFinalizedThrough: asOf,
  source: 'Connected Google Search Console, sc-domain:chrisizworski.com; page aggregation, September 25–October 22, 2026',
  limitations: [
    'HTTP/initial HTML only; not browser UX, source API accuracy, or Google-selected snippets.',
    'No causally attributable ranking, CTR, or revenue improvement is claimed.',
    'Some national URLs are assembled/deployed by other owning repositories; fixes belong there.',
    'Winter pages are discovery diagnostics; missing baseline here means NOT MEASURED, not zero demand.'
  ],
  firstSixTotals: { ...totals, ctr: totals.clicks / totals.impressions },
  firstSixTechnicalPass: first.every(p => p.issues.length === 0),
  pages: results
};
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/million-impressions-cohort-20261025.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
if (!output.firstSixTechnicalPass) {
  console.error('Primary cohort has HTTP or indexability defects; inspect report before release.');
  process.exitCode = 1;
}
