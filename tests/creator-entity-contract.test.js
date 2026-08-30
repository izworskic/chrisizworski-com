import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

test('pending audits stay explicit rather than being counted as verified', () => {
  const pending = contract.properties.filter(item => item.status === 'pending-audit');
  assert.deepEqual(pending.map(item => item.id).sort(), ['ausable-field-map', 'pictured-rocks']);
});
