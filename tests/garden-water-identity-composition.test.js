const test = require('node:test');
const assert = require('node:assert/strict');
const { composeGardenWaterIdentityGraph } = require('../lib/garden-water-identity-composition.js');

const CANONICAL = 'https://chrisizworski.com/national-tools/garden-water/';
const PERSON_ID = 'https://chrisizworski.com/#person';
const person = { '@type': 'Person', '@id': PERSON_ID, name: 'Chris Izworski', url: 'https://chrisizworski.com/' };
const app = {
  '@type': 'WebApplication',
  name: 'Garden Water Today',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  isAccessibleForFree: true,
  url: CANONICAL,
  description: 'A U.S. garden watering decision using observed NOAA weather, National Weather Service forecast signals, and USDA mapped soil context.',
  author: { '@id': PERSON_ID },
  publisher: { '@id': PERSON_ID },
  dateModified: '2026-09-08',
};

function readGraphs(html) {
  return [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => JSON.parse(match[1]))
    .flatMap(doc => Array.isArray(doc?.['@graph']) ? doc['@graph'] : Array.isArray(doc) ? doc : [doc]);
}

function walk(value, output = []) {
  if (Array.isArray(value)) value.forEach(item => walk(item, output));
  else if (value && typeof value === 'object') {
    output.push(value);
    Object.values(value).forEach(child => walk(child, output));
  }
  return output;
}

function readAllNodes(html) {
  return readGraphs(html).flatMap(node => walk(node));
}

test('adds owner-approved canonical Garden Water graph while preserving HTML identity and utility', () => {
  const original = '<!doctype html><html><head><title>Should I Water My Garden Today? | Chris Izworski</title><link rel="canonical" href="' + CANONICAL + '"></head><body><h1>Should I water my garden today?</h1><section id="result">Weather data utility</section><script src="/assets/national-garden-water-page.js?v=20260904-v5"></script></body></html>';
  const output = composeGardenWaterIdentityGraph(original);
  assert.ok(output.includes('<title>Should I Water My Garden Today? | Chris Izworski</title>'));
  assert.ok(output.includes('<link rel="canonical" href="' + CANONICAL + '">'));
  assert.ok(output.includes('<h1>Should I water my garden today?</h1>'));
  assert.ok(output.includes('id="result">Weather data utility'));
  assert.ok(output.includes('src="/assets/national-garden-water-page.js?v=20260904-v5"'));
  const nodes = readGraphs(output);
  assert.equal(nodes.filter(node => node?.['@id'] === PERSON_ID).length, 1);
  assert.equal(nodes.filter(node => node?.url === CANONICAL && node?.['@type'] === 'WebApplication').length, 1);
  assert.equal(nodes.find(node => node?.url === CANONICAL && node?.['@type'] === 'WebApplication').publisher['@id'], PERSON_ID);
  assert.deepEqual(nodes.find(node => node?.['@id'] === PERSON_ID), person);
  assert.deepEqual(nodes.find(node => node?.url === CANONICAL), app);
});

test('is byte-idempotent when exact owner graph already exists', () => {
  const source = '<html><head><script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [person, app] }) + '</script></head><body>utility</body></html>';
  assert.equal(composeGardenWaterIdentityGraph(source), source);
});

test('preserves unrelated graph nodes when completing owner application references', () => {
  const other = { '@type': 'WebSite', '@id': 'https://example.test/#website', name: 'Unrelated' };
  const partialApp = { ...app };
  delete partialApp.author;
  delete partialApp.publisher;
  delete partialApp.description;
  delete partialApp.applicationCategory;
  const source = '<html><head><script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [other, partialApp] }) + '</script></head><body>utility</body></html>';
  const nodes = readGraphs(composeGardenWaterIdentityGraph(source));
  assert.deepEqual(nodes.find(node => node?.['@id'] === other['@id']), other);
  assert.deepEqual(nodes.find(node => node?.url === CANONICAL).author, { '@id': PERSON_ID });
  assert.deepEqual(nodes.find(node => node?.url === CANONICAL).publisher, { '@id': PERSON_ID });
  assert.equal(nodes.find(node => node?.url === CANONICAL).description, app.description);
  assert.equal(nodes.find(node => node?.url === CANONICAL).applicationCategory, app.applicationCategory);
});

test('leaves conflicting canonical identity metadata untouched without breaking the utility', () => {
  const conflictingPerson = { ...person, name: 'Another Person' };
  const source = '<html><head><script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [conflictingPerson] }) + '</script></head><body><h1>Weather utility</h1></body></html>';
  assert.equal(composeGardenWaterIdentityGraph(source), source);
});

test('leaves malformed existing JSON-LD untouched instead of appending a competing graph', () => {
  const source = '<html><head><script type="application/ld+json">{broken}</script></head><body><h1>Weather utility</h1></body></html>';
  assert.equal(composeGardenWaterIdentityGraph(source), source);
});


test('recognizes a canonical Person nested inline and does not append a duplicate', () => {
  const nestedAuthor = { '@type': 'CreativeWork', author: { ...person } };
  const source = '<html><head><script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [nestedAuthor] }) + '</script></head><body>utility</body></html>';
  const output = composeGardenWaterIdentityGraph(source);
  const people = readAllNodes(output).filter(node => node?.['@id'] === PERSON_ID && node?.['@type'] === 'Person');
  assert.equal(people.length, 1);
  assert.deepEqual(people[0], person);
  assert.equal(readAllNodes(output).filter(node => node?.url === CANONICAL && node?.['@type'] === 'WebApplication').length, 1);
});

test('leaves nested conflicting canonical Person metadata untouched', () => {
  const nestedCreator = { '@type': 'CreativeWork', creator: { ...person, name: 'Conflicting Chris' } };
  const source = '<html><head><script type="application/ld+json">' + JSON.stringify(nestedCreator) + '</script></head><body><h1>Weather utility</h1></body></html>';
  assert.equal(composeGardenWaterIdentityGraph(source), source);
});

test('preserves one canonical WebPage and completes the owner WebApplication beside it', () => {
  const webPage = { '@type': 'WebPage', '@id': CANONICAL + '#webpage', url: CANONICAL, name: 'Garden Water page' };
  const partialApp = { ...app }; delete partialApp.publisher; const source = '<html><head><script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [webPage, partialApp] }) + '</script></head><body><h1>Garden water</h1></body></html>';
  const output = composeGardenWaterIdentityGraph(source);
  const nodes = readAllNodes(output);
  assert.deepEqual(nodes.find(node => node?.['@id'] === webPage['@id']), webPage);
  assert.equal(nodes.filter(node => node?.url === CANONICAL && node?.['@type'] === 'WebApplication').length, 1);
  assert.equal(nodes.find(node => node?.url === CANONICAL && node?.['@type'] === 'WebApplication').publisher['@id'], PERSON_ID);
  assert.equal(nodes.filter(node => node?.['@id'] === PERSON_ID && node?.['@type'] === 'Person').length, 1);
  assert.equal(composeGardenWaterIdentityGraph(output), output);
});

test('leaves duplicate canonical applications untouched as ambiguous', () => {
  const duplicateApp = { ...app, '@id': CANONICAL + '#app-duplicate' };
  const source = '<html><head><script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [app, duplicateApp] }) + '</script></head><body><h1>Garden water</h1></body></html>';
  assert.equal(composeGardenWaterIdentityGraph(source), source);
});

test('leaves duplicate canonical pages untouched when adding an application would be ambiguous', () => {
  const pageA = { '@type': 'WebPage', '@id': CANONICAL + '#page-a', url: CANONICAL };
  const pageB = { '@type': 'WebPage', '@id': CANONICAL + '#page-b', url: CANONICAL };
  const source = '<html><head><script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [pageA, pageB] }) + '</script></head><body><h1>Garden water</h1></body></html>';
  assert.equal(composeGardenWaterIdentityGraph(source), source);
});
