#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
import { hasVisibleCreatorAttribution, inspectVisibleHtml } from '../lib/creator-attribution.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://chrisizworski.com';
const personId = `${origin}/#person`;
const profileUrl = `${origin}/chris-izworski/`;
const picturedUrl = 'https://picturedrocks.chrisizworski.com/';
const picturedSource = 'public/labs/pictured-rocks-planner/index.html';
const read = rel => readFile(path.join(root, rel), 'utf8');
const registry = JSON.parse(await read('benchmarks/tool-network-registry.json'));
const contract = JSON.parse(await read('benchmarks/creator-entity-contract.json'));
const vercel = JSON.parse(await read('vercel.json'));
let actions = { relationships: [] };
try { actions = JSON.parse(await read('benchmarks/tool-network-actions.json')); } catch {}
const relationships = [...(registry.relationships || []), ...(actions.relationships || [])];
let tools = registry.tools.filter(item => item.kind !== 'developer-infrastructure');
const checkMode = process.argv.includes('--check');
const releaseMode = process.argv.includes('--live-release');
const releaseIds = new Set(['pictured-rocks', 'seed-starting', 'tomato-planting', 'niagara-border', 'petoskey-wine']);
if (releaseMode) tools = tools.filter(item => releaseIds.has(item.id));
const toolById = new Map(registry.tools.map(item => [item.id, item]));
const liveMode = process.argv.includes('--live') || releaseMode;

function meta(html, key, attribute = 'name') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${escaped}["'])[^>]*>`, 'i').exec(html)?.[0] || '';
  return /\bcontent=["']([^"']*)["']/i.exec(tag)?.[1] || '';
}

function canonical(html) {
  const link = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => match[0]).find(tag => /\brel=["']canonical["']/i.test(tag));
  return link?.match(/\bhref=["']([^"']+)["']/i)?.[1] || '';
}

function structuredNodes(html) {
  const nodes = [];
  const seen = new Set();
  const visit = value => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (value['@type']) nodes.push(value);
    for (const child of Object.values(value)) visit(child);
  };
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) visit(JSON.parse(match[1]));
  return nodes;
}

function allPersonRefs(nodes) {
  const refs = [];
  for (const node of nodes) for (const key of ['author', 'creator', 'publisher']) {
    const values = Array.isArray(node[key]) ? node[key] : [node[key]];
    for (const value of values) if (value?.['@id']?.endsWith('#person')) refs.push(value['@id']);
  }
  return refs;
}

function mainHtmlFile(url) {
  const parsed = new URL(url);
  const pathname = decodeURIComponent(parsed.pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.endsWith('.html') ? pathname.slice(1) : `${pathname.replace(/^\/+|\/+$/g, '')}/index.html`;
  return path.join(root, 'public', relative);
}

async function disposition(tool) {
  const url = new URL(tool.canonical);
  if (tool.id === 'pictured-rocks') return { kind: 'middleware-composed', evidence: 'canonical host composes the committed noindex lab source' };
  if (url.hostname !== 'chrisizworski.com') {
    const property = contract.properties.find(item => item.host === url.hostname);
    return { kind: property?.status === 'pending-audit' ? 'external-owner-pending' : 'external-canonical', evidence: property?.repo || property?.reason || url.hostname, ownerStatus: property?.status || 'not-in-contract' };
  }
  const pathname = url.pathname;
  const routes = (vercel.rewrites || []).filter(route => route.source === pathname || route.source === (pathname.endsWith('/') ? pathname.slice(0, -1) : `${pathname}/`));
  if (routes.length) return { kind: 'vercel-rewrite', evidence: routes.map(route => `${route.source} -> ${route.destination}`).join('; ') };
  const file = mainHtmlFile(tool.canonical);
  try {
    await access(file);
    return { kind: 'static-emitted', evidence: path.relative(root, file) };
  } catch {}
  return { kind: 'unresolved-main-route', evidence: 'No static file or exact Vercel rewrite recorded.' };
}

async function picturedResponse() {
  const source = stripTypeScriptTypes(await read('middleware.ts'));
  const handler = (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
  const sourceHtml = await read(picturedSource);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(sourceHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  try {
    const response = await handler(new Request(picturedUrl));
    return { status: response.status, headers: response.headers, html: await response.text(), sourceHtml };
  } finally { globalThis.fetch = originalFetch; }
}

function auditDocument(html, expectedUrl, tool, headers = new Headers()) {
  const errors = [];
  const warnings = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  let nodes = [];
  try { nodes = structuredNodes(html); } catch (error) { errors.push(`Invalid JSON-LD: ${error.message}`); }
  const people = nodes.filter(node => (Array.isArray(node['@type']) ? node['@type'] : [node['@type']]).includes('Person') && node.name === 'Chris Izworski');
  const canonicalPeople = people.filter(node => node['@id'] === personId);
  const refs = allPersonRefs(nodes);
  const facts = inspectVisibleHtml(html);
  const anchors = facts.anchors.map(anchor => {
    let resolved = anchor.href;
    try { resolved = new URL(anchor.href, expectedUrl).href; } catch {}
    return { ...anchor, resolved };
  });
  const h1 = inspectVisibleHtml(/<h1\b[^>]*>[\s\S]*?<\/h1>/i.exec(html)?.[0] || '').text;
  const bodyMatch = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] || html;
  const bodyText = inspectVisibleHtml(bodyMatch).text;
  const title = inspectVisibleHtml(/<title\b[^>]*>[\s\S]*?<\/title>/i.exec(html)?.[0] || '').text;
  const description = meta(html, 'description');
  const robotHeader = headers.get('x-robots-tag') || '';

  const actualCanonical = canonical(html);
  const normalizedUrl = value => { try { return new URL(value).href; } catch { return ''; } };
  check(normalizedUrl(actualCanonical) === normalizedUrl(expectedUrl), `Canonical mismatch: ${actualCanonical || '(missing)'}`);
  check(!/noindex|nofollow/i.test(robotHeader) && !/noindex|nofollow/i.test(meta(html, 'robots')), 'Indexability is blocked by a robots directive.');
  check(Boolean(title), 'Initial HTML has no title.');
  check(Boolean(description), 'Initial HTML has no meta description.');
  check(Boolean(h1) && Boolean(bodyText) && bodyText !== h1, 'Initial HTML has no readable heading and additional visible body content.');
  check(canonicalPeople.length > 0 && canonicalPeople.length === people.length && canonicalPeople.every(node => normalizedUrl(node.url) === `${origin}/`), 'Canonical Person definition is missing, duplicated with conflicts, or has a non-homepage url.');
  check(refs.length > 0 && refs.every(id => id === personId), 'Creator/author/publisher references do not resolve to the canonical Person.');
  check(hasVisibleCreatorAttribution(html) || anchors.some(anchor => anchor.resolved === profileUrl && anchor.text === 'Chris Izworski'), 'No visible creator credit or profile byline link was found.');

  const outgoing = relationships.filter(edge => edge.from === tool.id && ['essential', 'strong'].includes(edge.strength));
  const destinations = outgoing.map(edge => toolById.get(edge.to)).filter(Boolean);
  const linked = destinations.filter(target => anchors.some(anchor => normalizedUrl(anchor.resolved) === normalizedUrl(target.canonical)));
  const discoveryHubs = [
    `${origin}/tools/`, `${origin}/great-lakes/`, `${origin}/projects/`,
    `${origin}/guides/`, `${origin}/national-tools/`
  ];
  const hubLinks = anchors.filter(anchor => discoveryHubs.some(hub => normalizedUrl(anchor.resolved) === hub));
  if (outgoing.length && !linked.length && !hubLinks.length) errors.push(`No useful contextual discovery path; declared handoffs are ${destinations.map(item => item.id).join(', ')}.`);
  else if (outgoing.length && !linked.length) warnings.push(`Declared handoffs (${destinations.map(item => item.id).join(', ')}) are not directly linked; visible hub links provide discovery.`);
  if (!meta(html, 'og:title', 'property') || !meta(html, 'og:description', 'property') || !meta(html, 'og:url', 'property')) warnings.push('Open Graph preview metadata is incomplete.');
  if (!meta(html, 'twitter:card') || !meta(html, 'twitter:title') || !meta(html, 'twitter:description')) warnings.push('Twitter preview metadata is incomplete.');
  if (outgoing.length && linked.length) warnings.push(`Contextual handoffs resolve to ${linked.map(item => item.id).join(', ')}.`);
  return { checked: true, errors, warnings, title, canonical: canonical(html), linkedDestinations: linked.map(item => item.id), discoveryHubs: hubLinks.map(item => item.resolved), personDefinitions: people.length };
}

async function auditPicturedSpecific(html, headers, sourceHtml, errors) {
  const nodes = structuredNodes(html);
  const pageNode = nodes.find(node => node['@type'] === 'WebPage' && node.url === picturedUrl);
  const sitemapDate = /<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/.exec(await read('public/sitemap-pictured-rocks.xml'))?.[1] || '';
  const tag = name => new RegExp(`<meta\\s+name=["']robots["']\\s+content=["']${name}["']`, 'i').test(html);
  if (/noindex|nofollow/i.test(headers.get('x-robots-tag') || '') || tag('noindex,nofollow') || !/name=["']robots["']\s+content=["']index,follow,/i.test(html)) errors.push('Pictured Rocks canonical response is not indexable.');
  if (!pageNode?.dateModified || pageNode.dateModified !== sitemapDate) errors.push('Pictured Rocks WebPage dateModified does not match its published sitemap lastmod.');
  if (sourceHtml !== undefined && !/<meta name="robots" content="noindex,nofollow">/i.test(sourceHtml)) errors.push('Pictured Rocks source lab lost its deliberate noindex guard.');
  if (!meta(html, 'og:url', 'property') || meta(html, 'og:url', 'property') !== picturedUrl) errors.push('Pictured Rocks Open Graph URL does not match its canonical.');
  const links = inspectVisibleHtml(html).anchors.map(anchor => { try { return new URL(anchor.href, picturedUrl).href; } catch { return anchor.href; } });
  for (const target of [`${origin}/lake-superior-circle-tour/`, `${origin}/northern-lights-michigan/`]) {
    if (!links.includes(target)) errors.push(`Pictured Rocks contextual link missing: ${target}`);
  }
}

async function publicDocument(tool) {
  const response = await fetch(tool.canonical, { redirect: 'follow', headers: { 'user-agent': 'chrisizworski-tool-authority-audit/1.0' }, signal: AbortSignal.timeout(12000) });
  return { status: response.status, headers: response.headers, html: await response.text() };
}

async function builtDocument(tool, route) {
  if (tool.id === 'pictured-rocks') return await picturedResponse();
  if (route.kind !== 'static-emitted') return null;
  return { status: 200, headers: new Headers(), html: await read(route.evidence), sourceHtml: '' };
}

const reports = [];
const limit = liveMode ? 5 : 12;
async function auditTool(tool) {
  const route = await disposition(tool);
  let last;
  const attempts = releaseMode ? 5 : 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const output = liveMode ? await publicDocument(tool) : await builtDocument(tool, route);
      if (!output) {
        last = { id: tool.id, canonical: tool.canonical, ...route, audit: { checked: false, errors: [], warnings: ['No emitted page bytes for this route disposition; a public fetch is required.'] } };
      } else {
        const result = auditDocument(output.html, tool.canonical, tool, output.headers);
        if (tool.id === 'pictured-rocks') await auditPicturedSpecific(output.html, output.headers, output.sourceHtml, result.errors);
        if (liveMode && output.status !== 200) result.errors.push(`Public response status is ${output.status}.`);
        if (liveMode && !/text\\/html/i.test(output.headers.get('content-type') || '')) result.errors.push('Public response is not HTML.');
        last = { id: tool.id, canonical: tool.canonical, ...route, audit: { ...result, status: output.status, attempts: attempt } };
      }
    } catch (error) {
      last = { id: tool.id, canonical: tool.canonical, ...route, audit: { checked: false, errors: [`Fetch/read failed: ${error.message}`], warnings: [], attempts: attempt } };
    }
    if (!releaseMode || (last.audit.checked && last.audit.errors.length === 0) || attempt === attempts) return last;
    await new Promise(resolve => setTimeout(resolve, [3000, 6000, 12000, 20000][attempt - 1]));
  }
  return last;
}
for (let start = 0; start < tools.length; start += limit) {
  const group = tools.slice(start, start + limit);
  reports.push(...await Promise.all(group.map(auditTool)));
}

const checked = reports.filter(item => item.audit.checked);
const incomplete = reports.filter(item => !item.audit.checked);
const failures = reports.flatMap(item => item.audit.errors.map(error => `${item.id}: ${error}`));
const warnings = reports.flatMap(item => item.audit.warnings.map(warning => `${item.id}: ${warning}`));
const dispositionCounts = reports.reduce((out, item) => (out[item.kind] = (out[item.kind] || 0) + 1, out), {});
console.log(JSON.stringify({
  mode: releaseMode ? 'post-promotion-changed-public-output' : liveMode ? 'live-public-output' : 'post-injection-emitted-output',
  note: 'Output checks cover each registered non-infrastructure tool when bytes are available. Source ownership and public output are reported separately; an external/pending route is never counted as verified from source readiness.',
  summary: { registeredTools: tools.length, outputChecked: checked.length, incompleteRoutes: incomplete.length, dispositionCounts, errors: failures.length, warnings: warnings.length },
  routes: reports,
}, null, 2));
if (checkMode && (failures.length || (releaseMode && incomplete.length))) {
  console.error(`Tool authority audit failed with ${failures.length} page finding(s) and ${releaseMode ? incomplete.length : 0} required route(s) without output:`);
  failures.forEach(item => console.error(`- ${item}`));
  process.exitCode = 1;
} else if (failures.length || incomplete.length) {
  console.log(`Audit findings: ${failures.length} page issue(s), ${incomplete.length} routes without inspectable bytes, ${warnings.length} preview/context notes.`);
  failures.forEach(item => console.log(`- ${item}`));
} else {
  console.log(`Checked ${checked.length} tool outputs; ${warnings.length} preview/context notes.`);
}
