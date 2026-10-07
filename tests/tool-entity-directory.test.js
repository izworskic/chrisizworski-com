import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { existingEntity, generateToolEntityGraph, updateDirectoryList } from '../scripts/generate-tool-entity-graph.mjs';

const url = 'https://chrisizworski.com/example/';
const script = (data) => `<script data-graph='tool' type='application/ld+json'>${JSON.stringify(data)}</script>`;

test('directory repairs count/order and stale identity without assigning app types to content pages', () => {
  const list = { numberOfItems: 72, itemListElement: [
    { position: 9, item: { '@id': `${url}#wrong`, '@type': 'WebApplication', name: 'Example', url, applicationCategory: 'TravelApplication', operatingSystem: 'Any browser' } },
    { position: 8, item: { '@type': 'WebApplication', name: 'Unverified external', url: 'https://elsewhere.example/' } },
  ] };
  const entities = new Map([[url.replace(/\/$/, ''), { id: `${url}#page`, type: ['WebPage', 'CollectionPage'], url }]]);
  const result = updateDirectoryList(list, entities);
  assert.equal(result.changed, true);
  assert.equal(list.numberOfItems, 2);
  assert.deepEqual(list.itemListElement.map((entry) => entry.position), [1, 2]);
  assert.equal(list.itemListElement[0].item['@id'], `${url}#page`);
  assert.deepEqual(list.itemListElement[0].item['@type'], ['WebPage', 'CollectionPage']);
  assert.equal('applicationCategory' in list.itemListElement[0].item, false);
  assert.equal('operatingSystem' in list.itemListElement[0].item, false);
  assert.equal('@id' in list.itemListElement[1].item, false, 'do not guess external IDs');
  assert.equal(updateDirectoryList(list, entities).changed, false, 'generation must be idempotent');
});

test('resolver selects actual app identity, retains custom fragments and ignores nearby place/child IDs', () => {
  const html = script({ '@graph': [
    { '@type': 'WebPage', '@id': `${url}#page`, mainEntity: { '@id': `${url}#planner` } },
    { '@type': 'WebApplication', '@id': `${url}child/#app` },
    { '@type': 'TouristAttraction', '@id': `${url}#place` },
    { '@type': 'WebApplication', '@id': `${url}#planner`, url },
  ] });
  assert.deepEqual(existingEntity(html, url), { id: `${url}#planner`, type: 'WebApplication' });
  assert.equal(existingEntity(script({ '@type': 'WebApplication', name: 'Anonymous' }), url), null);
  assert.deepEqual(existingEntity(script({ '@graph': [
    { '@type': 'WebSite', '@id': `${url}#site` },
    { '@type': 'WebPage', '@id': `${url}#page` },
  ] }), url), { id: `${url}#page`, type: 'WebPage' }, 'a content page must not become its broader website');
  assert.throws(() => existingEntity('<script type="application/ld+json">{broken}</script>', url), SyntaxError);
});

test('check mode detects drift without mutating files; generate touches only the directory', async () => {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'tool-entity-directory-'));
  try {
    await mkdir(path.join(repoRoot, 'benchmarks'), { recursive: true });
    await mkdir(path.join(repoRoot, 'public/tools'), { recursive: true });
    await mkdir(path.join(repoRoot, 'public/example'), { recursive: true });
    await writeFile(path.join(repoRoot, 'benchmarks/tool-network-registry.json'), JSON.stringify({ tools: [{ id: 'example', canonical: url }, { id: 'external', canonical: 'https://elsewhere.example/' }] }));
    const destination = script({ '@type': 'WebPage', '@id': `${url}#page` });
    const directory = script({ '@graph': [
      { '@type': 'CollectionPage', mainEntity: { '@id': 'https://chrisizworski.com/tools/#toollist' } },
      { '@type': 'ItemList', '@id': 'https://chrisizworski.com/tools/#toollist', numberOfItems: 99, itemListElement: [{ position: 7, item: { '@type': 'WebPage', name: 'Example', url } }] },
    ] });
    const toolsFile = path.join(repoRoot, 'public/tools/index.html');
    const destinationFile = path.join(repoRoot, 'public/example/index.html');
    await writeFile(toolsFile, directory);
    await writeFile(destinationFile, destination);
    await assert.rejects(generateToolEntityGraph({ repoRoot, check: true }), /out of sync/);
    assert.equal(await readFile(toolsFile, 'utf8'), directory);
    const generated = await generateToolEntityGraph({ repoRoot });
    assert.equal(generated.linked, 1);
    assert.equal(await readFile(destinationFile, 'utf8'), destination, 'destination IDs and markup must remain untouched');
    assert.equal((await generateToolEntityGraph({ repoRoot, check: true })).changed, false);
  } finally { await rm(repoRoot, { recursive: true, force: true }); }
});

test('production build links reconciled entries and checks final emitted graph after HTML injections', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const steps = pkg.scripts['vercel-build'].split(' && ');
  const reconcile = steps.indexOf('node scripts/reconcile-tools-directory.mjs');
  const generate = steps.indexOf('node scripts/generate-tool-entity-graph.mjs');
  const attribution = steps.indexOf('node scripts/inject-creator-attribution.mjs');
  const finalCheck = steps.indexOf('node scripts/generate-tool-entity-graph.mjs --check');
  assert.ok(reconcile >= 0 && generate > reconcile && generate < attribution);
  for (const step of ['node scripts/build-network-ads.mjs', 'node scripts/inject-ga4.mjs']) {
    assert.ok(finalCheck > steps.indexOf(step), `final graph check must follow ${step}`);
  }
});
