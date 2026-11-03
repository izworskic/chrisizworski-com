const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'public', 'heirloom-garden-almanac', 'index.html');
const cssPath = path.join(root, 'public', 'assets', 'heirloom-garden-almanac.css');
const jsPath = path.join(root, 'public', 'assets', 'heirloom-garden-almanac.js');

test('heirloom garden almanac page exists and satisfies SERP benchmarks', () => {
  assert.ok(fs.existsSync(htmlPath), 'Guide HTML file must exist');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  assert.ok(titleMatch, 'Title tag must exist');
  assert.ok(titleMatch[1].length <= 60, `Title too long: ${titleMatch[1].length} chars`);

  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  assert.ok(descMatch, 'Meta description must exist');
  assert.ok(descMatch[1].length <= 158, `Description too long: ${descMatch[1].length} chars`);

  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/heirloom-garden-almanac/">'));
});

test('heirloom garden almanac includes Schema.org graph with ItemList and FAQPage', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert.ok(schemaMatch, 'JSON-LD schema script must exist');

  const json = JSON.parse(schemaMatch[1]);
  assert.ok(json['@graph'], 'Schema must have @graph');

  const collectionPage = json['@graph'].find(n => n['@type'] === 'CollectionPage');
  assert.ok(collectionPage, 'CollectionPage node required');
  assert.ok(collectionPage.datePublished, 'datePublished required');
  assert.ok(collectionPage.dateModified, 'dateModified required');

  const person = json['@graph'].find(n => n['@type'] === 'Person');
  assert.ok(person, 'Person node required');
  assert.equal(person['@id'], 'https://chrisizworski.com/#person');

  const itemList = json['@graph'].find(n => n['@type'] === 'ItemList');
  assert.ok(itemList, 'ItemList node required');
  assert.equal(itemList.itemListElement.length, 16, 'Must have 16 ListItem entries');

  const faqPage = json['@graph'].find(n => n['@type'] === 'FAQPage');
  assert.ok(faqPage, 'FAQPage node required');
  assert.ok(faqPage.mainEntity.length >= 6, 'FAQPage must contain at least 6 FAQs');
});

test('heirloom garden almanac contains exactly 16 authentic crop cards and 0 placeholders', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const stories = html.match(/<article class="wf-story"/g) || [];
  assert.equal(stories.length, 16, 'Must contain exactly 16 .wf-story cards');
  assert.ok(!html.includes('class="wf-story-index"'), 'Must not contain placeholder .wf-story-index boxes');

  // Verify all 16 images exist and are non-empty
  const imgMatches = [...html.matchAll(/src="(\/assets\/heirloom-garden-almanac\/[^"]+)"/g)];
  assert.equal(imgMatches.length, 16, 'Must feature 16 crop images');
  for (const m of imgMatches) {
    const rel = m[1].replace(/^\//, '');
    const full = path.join(root, 'public', rel);
    assert.ok(fs.existsSync(full), `Image file must exist: ${rel}`);
    const stat = fs.statSync(full);
    assert.ok(stat.size > 20000, `Image must be substantial: ${rel} is ${stat.size} bytes`);
  }
});

test('each variety card includes botanical dossier, MSU soil temp, isolation, and seed saving notes', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const requiredVarieties = [
    'Stupice Heirloom Tomato',
    'Black Krim Heirloom Tomato',
    'Cherokee Purple Tomato',
    "Brandywine (Sudduth's Strain)",
    'Amish Paste Heirloom Tomato',
    'Provider Bush Green Bean',
    'Kentucky Wonder Pole Bean',
    'Detroit Dark Red Beet',
    'Danvers 126 Half Long Carrot',
    'Bloomsdale Long Standing',
    'Lacinato (Dinosaur) Kale',
    'Black Beauty Zucchini',
    'Waltham Butternut Squash',
    'Marketmore 76 Cucumber',
    'Sugar Snap Pea',
    'Jimmy Nardello Sweet Pepper'
  ];

  for (const v of requiredVarieties) {
    assert.ok(html.includes(v), `Must include variety ${v}`);
  }

  // Botanical binomials
  assert.ok(html.includes('Solanum lycopersicum'));
  assert.ok(html.includes('Phaseolus vulgaris'));
  assert.ok(html.includes('Beta vulgaris'));
  assert.ok(html.includes('Daucus carota'));
  assert.ok(html.includes('Spinacia oleracea'));
  assert.ok(html.includes('Brassica oleracea'));
  assert.ok(html.includes('Cucurbita pepo'));
  assert.ok(html.includes('Cucurbita moschata'));
  assert.ok(html.includes('Cucumis sativus'));
  assert.ok(html.includes('Pisum sativum'));
  assert.ok(html.includes('Capsicum annuum'));

  // Interactive controls
  assert.ok(html.includes('id="ha-crop-search"'), 'Search input required');
  assert.ok(html.includes('id="ha-sort-temp-toggle"'), 'MSU sort toggle required');
  assert.ok(html.includes('data-filter="cold-starter"'), 'Cold starter filter required');
  assert.ok(html.includes('data-filter="up-ripener"'), 'UP ripener filter required');
  assert.ok(html.includes('data-filter="beginner-saver"'), 'Beginner saver filter required');
});

test('supporting almanac assets exist and are populated', () => {
  assert.ok(fs.existsSync(cssPath), 'CSS file must exist');
  assert.ok(fs.statSync(cssPath).size > 2000, 'CSS file must have styles');

  assert.ok(fs.existsSync(jsPath), 'JS file must exist');
  assert.ok(fs.statSync(jsPath).size > 1000, 'JS file must have code');
});
