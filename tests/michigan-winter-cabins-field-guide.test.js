const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync, statSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');

test('Crawlable Michigan Winter Cabins & Saunas Field Guide with 12 source-backed basecamps', () => {
  const file = 'public/michigan-winter-cabins-field-guide/index.html';
  assert.ok(existsSync(path.join(root, file)), `${file} must exist`);
  const html = read(file);

  assert.ok(html.includes('Michigan Winter Cabins, Saunas &amp; Hot-Tub Basecamps Field Guide'), 'Includes title brand');
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-winter-cabins-field-guide\/"/);

  // SERP length constraints
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  assert.ok(titleMatch, 'Must have <title>');
  assert.ok(titleMatch[1].length <= 60, `Title "${titleMatch[1]}" exceeds 60 chars (${titleMatch[1].length})`);

  const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
  assert.ok(descMatch, 'Must have description');
  assert.ok(descMatch[1].length <= 158, `Description exceeds 158 chars (${descMatch[1].length})`);

  // Exactly 12 .wf-story cards
  const storyCount = (html.match(/<article class="wf-story"/g) || []).length;
  assert.equal(storyCount, 12, 'Must feature exactly 12 audited basecamp zones');

  // Verify persona voice & schema
  assert.match(html, /Northwoods Lodgekeeper &amp; Winter Trail Scout/i);

  // Verify valid Schema.org graph
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLdMatch, 'Must contain JSON-LD block');
  const graph = JSON.parse(jsonLdMatch[1])['@graph'];
  assert.ok(Array.isArray(graph), 'Graph must be an array');

  const collection = graph.find((node) => node['@type'] === 'CollectionPage');
  assert.ok(collection, 'Must have CollectionPage');
  assert.equal(collection.url, 'https://chrisizworski.com/michigan-winter-cabins-field-guide/');

  const itemList = graph.find((node) => node['@type'] === 'ItemList');
  assert.ok(itemList, 'Must have ItemList schema');
  assert.equal(itemList.numberOfItems, 12, 'ItemList must list all 12 items');
  assert.equal(itemList.itemListElement.length, 12, 'ItemList elements must be 12');

  const faq = graph.find((node) => node['@type'] === 'FAQPage');
  assert.ok(faq, 'Must have FAQPage');
  assert.ok(faq.mainEntity.length >= 6, 'FAQPage must have at least 6 FAQs');

  const person = graph.find((node) => node['@type'] === 'Person' && node['@id'] === 'https://chrisizworski.com/#person');
  assert.ok(person, 'Must have Person schema');
});

test('Exact 12 Michigan basecamp zones are present with correct IDs, styles, and data attributes', () => {
  const html = read('public/michigan-winter-cabins-field-guide/index.html');
  const expectedBasecamps = [
    { id: 'basecamp-1', style: 'wood-fired-sauna', name: 'Keweenaw' },
    { id: 'basecamp-2', style: 'rustic-yurt-cabin', name: 'Porcupine Mountains' },
    { id: 'basecamp-3', style: 'ski-in-chalet', name: 'Boyne Mountain' },
    { id: 'basecamp-4', style: 'riverfront-cabin', name: 'Au Sable' },
    { id: 'basecamp-5', style: 'wood-fired-sauna', name: 'Marquette' },
    { id: 'basecamp-6', style: 'rustic-yurt-cabin', name: 'Munising' },
    { id: 'basecamp-7', style: 'ski-in-chalet', name: 'Harbor Springs' },
    { id: 'basecamp-8', style: 'riverfront-cabin', name: 'Jordan River' },
    { id: 'basecamp-9', style: 'ski-in-chalet', name: 'Crystal Mountain' },
    { id: 'basecamp-10', style: 'wood-fired-sauna', name: 'Tahquamenon' },
    { id: 'basecamp-11', style: 'rustic-yurt-cabin', name: 'Pine River' },
    { id: 'basecamp-12', style: 'riverfront-cabin', name: 'Pere Marquette' }
  ];

  for (const b of expectedBasecamps) {
    assert.ok(html.includes(`id="${b.id}"`), `Missing element #${b.id}`);
    assert.ok(html.includes(`data-style="${b.style}"`), `Missing style ${b.style} for #${b.id}`);
  }
});

test('Zero placeholder index boxes and 100% real local photography', () => {
  const html = read('public/michigan-winter-cabins-field-guide/index.html');
  assert.equal(html.includes('class="wf-story-index"'), false, 'Must not contain any placeholder index boxes');

  const imagesData = JSON.parse(read('scripts/michigan-winter-cabins-images-data.json'));
  assert.equal(imagesData.length, 12, 'Must have 12 image metadata entries');

  for (const item of imagesData) {
    const localImgPath = path.join(root, 'public', 'assets', 'michigan-winter-cabins', item.name);
    assert.ok(existsSync(localImgPath), `Image file must exist: ${localImgPath}`);
    const stats = statSync(localImgPath);
    assert.ok(stats.size > 20000, `Image file ${item.name} is too small (${stats.size} bytes)`);
    assert.ok(html.includes(item.name), `HTML must reference ${item.name}`);
  }
});

test('Interactive assets exist and validate without syntax errors', () => {
  const cssFile = path.join(root, 'public', 'assets', 'michigan-winter-cabins-field-guide.css');
  const jsFile = path.join(root, 'public', 'assets', 'michigan-winter-cabins-field-guide.js');

  assert.ok(existsSync(cssFile), 'CSS file must exist');
  assert.ok(existsSync(jsFile), 'JS file must exist');

  const jsContent = readFileSync(jsFile, 'utf8');
  assert.doesNotThrow(() => {
    new vm.Script(jsContent);
  }, 'JavaScript must compile without syntax errors');
});

test('All connected tools and view-only Google Maps links are present', () => {
  const html = read('public/michigan-winter-cabins-field-guide/index.html');
  assert.ok(html.includes('href="/michigan-winter-weekends/"'), 'Must link to /michigan-winter-weekends/');
  assert.ok(html.includes('href="/michigan-snow-depth/"'), 'Must link to /michigan-snow-depth/');
  assert.ok(html.includes('href="/michigan-ski-hills/"'), 'Must link to /michigan-ski-hills/');

  // View-only Google Maps coordinates
  const mapLinks = html.match(/https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=[^"]+/g);
  assert.ok(mapLinks && mapLinks.length === 12, 'Must have 12 view-only Google Maps links');
  assert.equal(html.includes('dir_action=navigate'), false, 'Must not contain Google turn-by-turn navigation links');
});

test('Guide is registered in field-guides-registry.json, /guides/, /tools/, and sitemap-winter.xml', () => {
  const registry = JSON.parse(read('public/assets/field-guides-registry.json'));
  const entry = registry.guides.find((g) => g.slug === 'michigan-winter-cabins-field-guide');
  assert.ok(entry, 'Must be in registry.guides');
  assert.equal(entry.status, 'live');
  assert.equal(entry.stopCount, 12);

  const guidesHtml = read('public/guides/index.html');
  assert.ok(guidesHtml.includes('data-field-guide="michigan-winter-cabins-field-guide"'), 'Must be in /guides/ index');
  assert.ok(guidesHtml.includes('href="/michigan-winter-cabins-field-guide/"'), 'Must link from /guides/');

  const toolsHtml = read('public/tools/index.html');
  assert.ok(toolsHtml.includes('href="/michigan-winter-cabins-field-guide/"'), 'Must link from /tools/ #field-guides-shelf');

  const sitemap = read('public/sitemap-winter.xml');
  assert.ok(sitemap.includes('https://chrisizworski.com/michigan-winter-cabins-field-guide/'), 'Must be in sitemap-winter.xml');
});
