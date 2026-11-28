import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('benchmarks/tool-network-registry.json', 'utf8'));
const pinned = '/assets/garden-water-release-c82dda3c';

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

test('Garden Water canonical HTML and API use the pinned owner release', () => {
  const expected = new Map([
    ['/assets/national-garden-water.css', `${pinned}/national-garden-water.css`],
    ['/assets/national-garden-water-engine.js', `${pinned}/national-garden-water-engine.js`],
    ['/assets/national-garden-water-page.js', `${pinned}/national-garden-water-page.js`],
    ['/data/national-garden-water-crops.json', `${pinned}/national-garden-water-crops.json`],
    ['/national-tools/garden-water', '/api/garden-water-page'],
    ['/national-tools/garden-water/', '/api/garden-water-page'],
  ]);
  assert.equal(route('/api/national-garden-water'), undefined, 'no external self-proxy');
  assert.ok(fs.existsSync('api/national-garden-water.js'));
  assert.equal(vercel.functions['api/national-garden-water.js'].maxDuration, 60);
  for (const [source, destination] of expected) {
    assert.equal(route(source)?.destination, destination, source);
    if (destination.startsWith(pinned)) assert.ok(fs.existsSync('public'+destination), 'missing local asset '+destination);
  }
  assert.ok(vercel.rewrites.every(r => !r.destination.includes('national-garden-water.vercel.app')), 'no Garden Water dependency on child deployment');
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
