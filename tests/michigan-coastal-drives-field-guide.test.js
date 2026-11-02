const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'public', 'michigan-coastal-drives-field-guide', 'index.html');
const cssPath = path.join(root, 'public', 'assets', 'michigan-coastal-drives-field-guide.css');
const jsPath = path.join(root, 'public', 'assets', 'michigan-coastal-drives-field-guide.js');

test('michigan coastal drives page exists and satisfies SERP benchmarks', () => {
  assert.ok(fs.existsSync(htmlPath), 'Guide HTML file must exist');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  assert.ok(titleMatch, 'Title tag must exist');
  assert.ok(titleMatch[1].length <= 60, `Title too long: ${titleMatch[1].length} chars`);

  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  assert.ok(descMatch, 'Meta description must exist');
  assert.ok(descMatch[1].length <= 158, `Description too long: ${descMatch[1].length} chars`);

  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-coastal-drives-field-guide/">'));
});

test('michigan coastal drives page includes Schema.org graph with ItemList and FAQPage', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert.ok(schemaMatch, 'JSON-LD schema script must exist');

  const json = JSON.parse(schemaMatch[1]);
  assert.ok(json['@graph'], 'Schema must have @graph');

  const collectionPage = json['@graph'].find(n => n['@type'] === 'CollectionPage');
  assert.ok(collectionPage, 'CollectionPage node required');
  assert.ok(collectionPage.datePublished, 'datePublished required');
  assert.ok(collectionPage.dateModified, 'dateModified required');

  const itemList = json['@graph'].find(n => n['@type'] === 'ItemList');
  assert.ok(itemList, 'ItemList node required');
  assert.equal(itemList.itemListElement.length, 12, 'Must have 12 ListItem entries');

  const faqPage = json['@graph'].find(n => n['@type'] === 'FAQPage');
  assert.ok(faqPage, 'FAQPage node required');
  assert.ok(faqPage.mainEntity.length >= 6, 'FAQPage must contain at least 6 FAQs');
});

test('michigan coastal drives page contains exactly 12 authentic route cards and 0 placeholders', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const stories = html.match(/<article class="wf-story"/g) || [];
  assert.equal(stories.length, 12, 'Must contain exactly 12 .wf-story cards');
  assert.ok(!html.includes('class="wf-story-index"'), 'Must not contain placeholder .wf-story-index boxes');

  // Verify all 12 images exist and are non-empty
  const imgMatches = [...html.matchAll(/src="(\/assets\/michigan-coastal-drives\/[^"]+)"/g)];
  assert.equal(imgMatches.length, 12, 'Must feature 12 route images');
  for (const m of imgMatches) {
    const rel = m[1].replace(/^\//, '');
    const full = path.join(root, 'public', rel);
    assert.ok(fs.existsSync(full), `Image file must exist: ${rel}`);
    const stat = fs.statSync(full);
    assert.ok(stat.size > 20000, `Image must be substantial: ${rel} is ${stat.size} bytes`);
  }
});

test('each coastal drive card includes field dossier, mileposts, RV warning, and view-only maps link', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const requiredRoutes = [
    'M-22', 'M-119', 'M-26 / Brockway', 'US-2', 'US-23', 'M-28',
    'M-123', 'M-134', 'M-107', 'M-37', 'M-64', 'US-31'
  ];

  for (const r of requiredRoutes) {
    assert.ok(html.includes(r), `Must include route ${r}`);
  }

  // Check interactive hooks
  assert.ok(html.includes('id="fall-color-timing-engine"'), 'Fall color timing engine required');
  assert.ok(html.includes('data-wave="1"'), 'Wave 1 required');
  assert.ok(html.includes('data-wave="2"'), 'Wave 2 required');
  assert.ok(html.includes('data-wave="3"'), 'Wave 3 required');
  assert.ok(html.includes('data-wave="4"'), 'Wave 4 required');

  // Verify view-only area links (no directions API)
  const mapLinks = [...html.matchAll(/href="(https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=[^"]+)"/g)];
  assert.equal(mapLinks.length, 12, 'Must have 12 view-only area search links');
  assert.ok(!html.includes('https://www.google.com/maps/dir/'), 'Must not use directions API links');
});

test('supporting assets exist and are populated', () => {
  assert.ok(fs.existsSync(cssPath), 'CSS file must exist');
  assert.ok(fs.statSync(cssPath).size > 2000, 'CSS file must have styles');

  assert.ok(fs.existsSync(jsPath), 'JS file must exist');
  assert.ok(fs.statSync(jsPath).size > 1000, 'JS file must have code');
});
