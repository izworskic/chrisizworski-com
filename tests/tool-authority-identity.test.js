import test from 'node:test';
import assert from 'node:assert/strict';
import { auditStructuredAuthority } from '../lib/tool-authority-identity.mjs';

const personId = 'https://chrisizworski.com/#person';
const homepage = 'https://chrisizworski.com/';
const person = { '@type': 'Person', '@id': personId, name: 'Chris Izworski', url: homepage };

function audit(documentNodes, extraNodes = []) {
  return auditStructuredAuthority({
    nodes: [person, ...documentNodes, ...extraNodes],
    documentNodes,
    personId,
    homepage,
  });
}

test('author-only page graph fails because the canonical publisher is missing', () => {
  const result = audit([{
    '@type': 'WebPage',
    author: { '@id': personId },
  }]);
  assert.equal(result.errors.some(error => error.includes('publisher connection')), true);
  assert.equal(result.errors.some(error => error.includes('author/creator connection')), false);
});

test('publisher-only page graph fails because the canonical author/creator is missing', () => {
  const result = audit([{
    '@type': 'WebPage',
    publisher: { '@id': personId },
  }]);
  assert.equal(result.errors.some(error => error.includes('author/creator connection')), true);
  assert.equal(result.errors.some(error => error.includes('publisher connection')), false);
});

test('a complete canonical page graph passes both relationship checks', () => {
  const result = audit([{
    '@type': 'WebPage',
    author: { '@id': personId },
    publisher: { '@id': personId },
  }]);
  assert.deepEqual(result.errors, []);
});

test('a nested unrelated news article or business cannot satisfy missing page-level roles', () => {
  const unrelated = [
    { '@type': 'NewsArticle', author: { '@id': personId }, publisher: { '@id': personId } },
    { '@type': 'LocalBusiness', publisher: { '@id': personId } },
  ];
  const result = audit([], unrelated);
  assert.equal(result.errors.some(error => error.includes('author/creator connection')), true);
  assert.equal(result.errors.some(error => error.includes('publisher connection')), true);
});

test('a conflicting canonical Person definition fails even with complete page links', () => {
  const result = audit([{
    '@type': 'WebPage',
    author: { '@id': personId },
    publisher: { '@id': personId },
  }], [{ '@type': 'Person', '@id': personId, name: 'Chris Izworski', url: 'https://chrisizworski.com/chris-izworski/' }]);
  assert.equal(result.errors.some(error => error.includes('Canonical Person definition')), true);
});

test('a noncanonical Chris role reference cannot be hidden beside canonical links', () => {
  const result = audit([{
    '@type': 'WebPage',
    author: { '@id': 'https://example.com/#chris-izworski', name: 'Chris Izworski' },
    publisher: { '@id': personId },
  }]);
  assert.equal(result.errors.some(error => error.includes('do not resolve to the canonical Person')), true);
});

test('primary Article and CollectionPage nodes count as page content, unlike nested news articles', () => {
  const result = audit([
    { '@type': 'CollectionPage', author: { '@id': personId }, publisher: { '@id': personId } },
    { '@type': 'Article', author: { '@id': personId }, publisher: { '@id': personId } },
  ]);
  assert.deepEqual(result.errors, []);
});
