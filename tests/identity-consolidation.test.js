const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const read = file => readFileSync(new URL('../' + file, 'file://' + __filename), 'utf8');
const origin = 'https://chrisizworski.com';

test('About variants have explicit 301s to the canonical identity, before other redirects', () => {
  const config = JSON.parse(read('vercel.json'));
  for (const source of ['/about', '/about/', '/about/index.html', '/about.html']) {
    const redirect = config.redirects.find(rule => rule.source === source);
    assert.equal(redirect?.statusCode, 301);
    assert.equal(redirect.destination, origin + '/chris-izworski/');
    assert.equal(redirect.permanent, undefined, 'Vercel permanent:true would return 308');
  }
});

test('canonical profile answers the query and contains the full existing identity cluster', () => {
  const html = read('public/chris-izworski/index.html');
  assert.match(html, /<title>Chris Izworski \| Prepared Solutions Consultant<\/title>/);
  assert.match(html, /<h1[^>]*>Chris Izworski<\/h1>/);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/chris-izworski\/"/);
  const opening = html.split('</h1>')[1].match(/<p>(.*?)<\/p>/s)[1];
  for (const fact of ['Solutions Consultant at Prepared', 'Executive Director of Saginaw County 911 from 2022 to 2025', 'Director of Bay County 911 from 2013 to 2022', 'In 2024']) assert.ok(opening.includes(fact), fact);
  assert.match(html, /What he's doing now/);
  assert.match(html, /joined in October 2025/);
  assert.match(html, /2026 start date is <strong>NOT REPORTED/);
  for (const route of ['prepared', 'prepared911', 'nena-the-call', 'wnem-tv5', 'source-guide', 'news-coverage']) assert.ok(html.includes(`href="/chris-izworski-${route}/"`), route);
  const nodes = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(m => { const d = JSON.parse(m[1]); return d['@graph'] || [d]; });
  const person = nodes.find(n => n['@type'] === 'Person' && Array.isArray(n.sameAs));
  assert.equal(person['@id'], origin + '/#person');
  assert.equal(person.url, origin + '/');
  for (const dir of readdirSync(new URL('../public', 'file://' + __filename), { withFileTypes: true }).filter(e => e.isDirectory() && e.name.startsWith('chris-izworski-'))) assert.ok(person.sameAs.includes(origin + '/' + dir.name + '/'), dir.name);
  assert.match(html, /Built by <a href="https:\/\/chrisizworski.com\/chris-izworski\/">Chris Izworski/);
});

test('entry points and all published sitemaps discover the consolidated identity', () => {
  for (const file of ['public/index.html', 'public/start-here/index.html']) assert.doesNotMatch(read(file), /href=["'](?:https:\/\/chrisizworski\.com)?\/about\/?["'?#]/);
  let profileCount = 0;
  for (const file of readdirSync(new URL('../public', 'file://' + __filename)).filter(f => /sitemap.*\.xml$/.test(f))) {
    const xml = read('public/' + file);
    assert.doesNotMatch(xml, /<loc>https:\/\/chrisizworski\.com\/about\/?<\/loc>/);
    profileCount += [...xml.matchAll(/<loc>https:\/\/chrisizworski\.com\/chris-izworski\/<\/loc>/g)].length;
  }
  assert.ok(profileCount >= 1);
  assert.ok(read('package.json').indexOf('scripts/consolidate-identity-links.mjs') > read('package.json').indexOf('scripts/sync-ballard-locks.mjs'));
});

test('navigation migration preserves tool text, scripts and unrelated external About pages', async () => {
  const { consolidateIdentityLinks } = await import('../lib/identity-links.mjs');
  for (const href of ['/about', '/about/', '/about/index.html', '/about.html', 'https://chrisizworski.com/about/']) {
    const source = `<nav><a href="${href}?from=tool#bio">About</a></nav><h1>Tool title</h1>`;
    const result = consolidateIdentityLinks(source);
    assert.equal(result, '<nav><a href="/chris-izworski/?from=tool#bio">About</a></nav><h1>Tool title</h1>');
    assert.equal(consolidateIdentityLinks(result), result);
  }
  const untouchedScript = '<script>const example = `<a href="/about/">About</a>`;</script>';
  assert.equal(consolidateIdentityLinks(untouchedScript), untouchedScript);
  for (const href of ['about', 'https://freighterviewfarms.com/about/' , 'https://example.com/about', '/about-us/', '/about.me', '/tool/?next=/about/']) {
    const source = `<a href="${href}">About</a>`;
    assert.equal(consolidateIdentityLinks(source), source);
  }
});
