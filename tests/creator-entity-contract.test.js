import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasVisibleCreatorAttribution, inspectVisibleHtml } from '../lib/creator-attribution.mjs';

const contract = JSON.parse(await readFile(new URL('../benchmarks/creator-entity-contract.json', import.meta.url), 'utf8'));
const registry = JSON.parse(await readFile(new URL('../benchmarks/tool-network-registry.json', import.meta.url), 'utf8'));

const PERSON = 'https://chrisizworski.com/#person';
const PROFILE = 'https://chrisizworski.com/chris-izworski/';
const byHost = new Map(contract.properties.map(item => [item.host, item]));
const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));

function hostOf(url) {
  return String(url).replace(/^https:\/\//, '').split('/')[0];
}

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

test('creator contract has one immutable Chris Izworski identity', () => {
  assert.equal(contract.canonicalPersonId, PERSON);
  assert.equal(contract.canonicalProfileUrl, PROFILE);
  assert.equal(new Set(contract.properties.map(item => item.host)).size, contract.properties.length);
  for (const item of contract.properties) {
    assert.equal(item.personId, PERSON, item.id);
    assert.equal(item.profileUrl, PROFILE, item.id);
    assert.match(item.status, /^(verified|source-verified|pending-audit)$/, item.id);
    if (item.status === 'verified' || item.status === 'source-verified') {
      assert.ok(item.repo, `${item.id} needs a source repository`);
      assert.ok(item.evidence, `${item.id} needs verification evidence`);
    } else {
      assert.ok(item.reason?.length > 30, `${item.id} pending audit needs a concrete reason`);
    }
  }
});

test('every separate-host first-party tool is covered by the creator contract', () => {
  const external = registry.tools.filter(tool => {
    const host = hostOf(tool.canonical);
    return host !== 'chrisizworski.com' && tool.kind !== 'developer-infrastructure';
  });
  for (const tool of external) {
    const host = hostOf(tool.canonical);
    const property = byHost.get(host);
    assert.ok(property, `creator contract missing host ${host} for ${tool.id}`);
    assert.ok(property.toolIds.includes(tool.id), `creator contract ${host} does not cover tool id ${tool.id}`);
  }
});

test('main-site HTML never mints a competing Chris Person fragment', async () => {
  const files = await htmlFiles(PUBLIC_DIR);
  const violations = [];
  const idPattern = /"@id"\s*:\s*"([^"]*#person)"/g;
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(idPattern)) {
      if (match[1] !== PERSON) violations.push(`${file}: ${match[1]}`);
    }
  }
  assert.deepEqual(violations, []);
});

test('main-owned creator graphs resolve to one canonical homepage Person', async () => {
  const paths = [
    '../public/seed-starting-guide/index.html',
    '../public/when-to-plant-tomatoes-michigan/index.html',
    '../public/niagara-border-crossing/index.html',
  ];
  for (const path of paths) {
    const html = await readFile(new URL(path, import.meta.url), 'utf8');
    const graphNodes = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
      .flatMap(match => {
        const data = JSON.parse(match[1]);
        const nodes = [];
        const visit = value => {
          if (!value || typeof value !== 'object') return;
          if (Array.isArray(value)) { value.forEach(visit); return; }
          if (value['@type']) nodes.push(value);
          Object.values(value).forEach(visit);
        };
        visit(data);
        return nodes;
      });
    const people = graphNodes.filter(node =>
      (Array.isArray(node['@type']) ? node['@type'] : [node['@type']]).includes('Person') &&
      node.name === 'Chris Izworski'
    );
    assert.ok(people.length > 0, path);
    assert.ok(people.every(node => node['@id'] === PERSON && new URL(node.url).href === 'https://chrisizworski.com/'), path);
  }
});

test('pending audits stay explicit rather than being counted as verified', () => {
  const pending = contract.properties.filter(item => item.status === 'pending-audit');
  assert.deepEqual(pending.map(item => item.id).sort(), ['ausable-field-map']);
});

test('creator authority value function is weighted, measurable, and names the unresolved source audits', () => {
  const model = contract.authorityValueFunction;
  assert.ok(model, 'creator authority value function is required');
  assert.equal(model.scoreRange[0], 0);
  assert.equal(model.scoreRange[1], 100);
  assert.equal(model.dimensions.reduce((sum, item) => sum + item.weight, 0), 100);
  assert.ok(model.releaseTarget >= 90 && model.releaseTarget <= 100);
  assert.ok(model.hardStops.some(item => item.includes('thin name-only page')));
  assert.ok(model.hardStops.some(item => item.includes('protected winning title')));
  assert.equal(model.measurement.distinguishImplementationCoverageFromRankingOutcome, true);
  assert.deepEqual(model.auditState.pendingSourceRepositoryAudit.sort(), ['ausable-field-map']);
  assert.equal(model.auditState.totalTrackedProperties, contract.properties.length);
});


test('vendored Petoskey owner export preserves all 33 useful canonical pages', async () => {
  const section = path.join(PUBLIC_DIR, 'petoskey-wine');
  const pages = (await htmlFiles(section)).filter(file =>
    file.endsWith(path.join('index.html')) && !file.includes(path.join('404', 'index.html'))
  );
  assert.equal(pages.length, 33);
  const sitemap = await readFile(path.join(PUBLIC_DIR, 'sitemap-petoskey-wine.xml'), 'utf8');
  const visit = (value, nodes = []) => {
    if (!value || typeof value !== 'object') return nodes;
    if (Array.isArray(value)) { value.forEach(child => visit(child, nodes)); return nodes; }
    if (value['@type']) nodes.push(value);
    Object.values(value).forEach(child => visit(child, nodes));
    return nodes;
  };
  for (const file of pages) {
    const relative = path.relative(section, file).split(path.sep).join('/');
    const inner = relative === 'index.html' ? '' : relative.slice(0, -'/index.html'.length);
    const route = '/petoskey-wine/' + (inner ? inner + '/' : '');
    const canonical = 'https://chrisizworski.com' + route;
    const html = await readFile(file, 'utf8');
    const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const graph = blocks.flatMap(match => visit(JSON.parse(match[1])));
    const people = graph.filter(node =>
      (Array.isArray(node['@type']) ? node['@type'] : [node['@type']]).includes('Person') &&
      node.name === 'Chris Izworski'
    );
    assert.equal(people.length, 1, route + ': expected one Chris Person definition');
    assert.ok(people.every(node => node['@id'] === PERSON && new URL(node.url).href === 'https://chrisizworski.com/'), route + ': conflicting Person');
    const authorValues = graph.flatMap(node => ['author', 'creator', 'publisher'].flatMap(key => {
      const value = node[key];
      return value === undefined ? [] : Array.isArray(value) ? value : [value];
    }));
    const chrisRefs = authorValues.filter(value => value && typeof value === 'object' &&
      (value.name === 'Chris Izworski' || value['@id'] === PERSON || /chris[-_]?izworski|#chris(?:$|[-_])/i.test(value['@id'] || '')));
    assert.ok(chrisRefs.some(value => value['@id'] === PERSON), route + ': author/publisher reference missing');
    assert.ok(chrisRefs.every(value => value['@id'] === PERSON), route + ': non-canonical Chris reference');
    const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => match[0])
      .find(tag => /\brel=["']canonical["']/i.test(tag));
    assert.equal(canonicalTag?.match(/\bhref=["']([^"']+)["']/i)?.[1], canonical, route + ': canonical mismatch');
    assert.equal(hasVisibleCreatorAttribution(html), true, route + ': visible creator credit missing');
    const visible = inspectVisibleHtml(html);
    assert.ok(visible.headings.length, route + ': visible heading missing');
    assert.ok(visible.text.length > visible.headings[0].length, route + ': no visible explanatory content beyond heading');
    assert.ok(visible.anchors.some(anchor => {
      try { return new URL(anchor.href, canonical).href === 'https://chrisizworski.com/tools/'; } catch { return false; }
    }), route + ': useful Tools discovery link missing');
    assert.ok(sitemap.includes('<loc>' + canonical + '</loc>'), route + ': sitemap entry missing');
    assert.ok(sitemap.includes('<loc>' + canonical + '</loc>\n    <lastmod>2026-10-06</lastmod>'), route + ': sitemap freshness mismatch');
    assert.doesNotMatch(html, /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i, route + ': page is noindex');
  }
});
