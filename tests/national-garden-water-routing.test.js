import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('benchmarks/tool-network-registry.json', 'utf8'));
const child = 'https://national-garden-water.vercel.app';

function route(source) {
  return vercel.rewrites.find((item) => item.source === source);
}

function walk(value, visit) {
  if (Array.isArray(value)) value.forEach((item) => walk(item, visit));
  else if (value && typeof value === 'object') {
    visit(value);
    Object.values(value).forEach((item) => walk(item, visit));
  }
}

test('Garden Water canonical, API, assets and data route to owning project', () => {
  const expected = new Map([
    ['/api/national-garden-water', `${child}/api/national-garden-water`],
    ['/assets/national-garden-water.css', `${child}/assets/national-garden-water.css`],
    ['/assets/national-garden-water-engine.js', `${child}/assets/national-garden-water-engine.js`],
    ['/assets/national-garden-water-page.js', `${child}/assets/national-garden-water-page.js`],
    ['/data/national-garden-water-crops.json', `${child}/data/national-garden-water-crops.json`],
    ['/national-tools/garden-water', `${child}/national-tools/garden-water/`],
    ['/national-tools/garden-water/', `${child}/national-tools/garden-water/`],
  ]);
  for (const [source, destination] of expected) {
    assert.equal(route(source)?.destination, destination, source);
  }
});

test('Garden Water has one canonical registry owner and garden-network relationships', () => {
  const node = registry.tools.find((tool) => tool.id === 'national-garden-water');
  assert.equal(node?.canonical, 'https://chrisizworski.com/national-tools/garden-water/');
  assert.equal(node?.cluster, 'gardening');
  assert.match(node?.primaryIntent || '', /water/i);

  const objects = [];
  walk(registry, (obj) => objects.push(obj));
  assert.ok(objects.some((obj) => obj.owner === 'national-garden-water' && /water/i.test(obj.intent || '')),
    'Garden Water must own a watering intent');
  assert.ok(objects.some((obj) => obj.from === 'national-garden-water' && obj.to === 'national-planting'),
    'Garden Water should hand off to national planting');
  assert.ok(objects.some((obj) => obj.from === 'national-planting' && obj.to === 'national-garden-water'),
    'National planting should hand off into ongoing water decisions');
});
