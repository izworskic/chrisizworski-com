const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const base = 'https://chrisizworski.com';
const PERSON = base + '/#person';

function source(route) {
  return fs.readFileSync(path.join(root, 'public', route.replace(/^\//, ''), 'index.html'), 'utf8');
}
function graph(html) {
  const json = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(json.length, 1, 'exactly one JSON-LD block');
  return JSON.parse(json[0][1])['@graph'];
}
function meta(html, key, attr='name') {
  const match = [...html.matchAll(/<meta\b[^>]*>/g)].find(m => m[0].includes(attr + '="' + key + '"'));
  assert.ok(match, 'missing ' + attr + ':' + key);
  return match[0];
}
test('Ballard CTR shell preserves truthful results and entity identity', async () => {
  const { applyBallardSiteShell } = await import('../scripts/ballard-site-shell.mjs');
  for (const [route,title] of [
    ['/ballard-locks/', 'Ballard Locks Today: Fish Counts, Salmon Ladder & Tours'],
    ['/ballard-locks/salmon-counts/', 'Ballard Locks Fish Count Today: Latest Salmon Counts']
  ]) {
    const html = applyBallardSiteShell(source(route), route);
    assert.ok(html.includes('<title>' + title.replace('&', '&amp;') + '</title>'));
    assert.ok(html.includes('<link rel="canonical" href="' + base + route + '">'));
    assert.ok(html.includes('data-ballard-ctr-v1="faq"'));
    assert.ok(html.includes('Built by <a href="' + base + '/chris-izworski/'));
    assert.ok(meta(html,'description').includes('WDFW') || route === '/ballard-locks/');
    for (const key of ['og:title','og:description','og:url']) assert.ok(meta(html,key,'property'));
    for (const key of ['twitter:card','twitter:title','twitter:description']) assert.ok(meta(html,key));
    const nodes=graph(html);
    assert.equal(nodes.filter(n=>n['@type']==='Person').length,1);
    assert.equal(nodes.filter(n=>n['@type']==='Person')[0]['@id'], PERSON);
    assert.equal(nodes.filter(n=>n['@type']==='FAQPage').length,1);
    assert.equal(nodes.filter(n=>n['@type']==='WebPage').length,1);
    assert.equal(nodes.filter(n=>n['@type']==='WebSite').length,1);
    assert.ok(nodes.filter(n=>['WebPage','WebSite','WebApplication'].includes(n['@type']))
      .every(n=>n.author?.['@id']===PERSON && n.creator?.['@id']===PERSON && n.publisher?.['@id']===PERSON));
  }
});
test('Salmon count page makes the freshest published number prominent without claiming a live fish counter', async () => {
  const { applyBallardSiteShell } = await import('../scripts/ballard-site-shell.mjs');
  const html = applyBallardSiteShell(source('/ballard-locks/salmon-counts/'),'/ballard-locks/salmon-counts/');
  assert.ok(html.includes('in latest published daily count'));
  assert.ok(html.includes('best.latest.date'));
  assert.ok(html.includes('The latest published number matters'));
  assert.ok(html.includes('WDFW'));
  assert.ok(html.includes('Are these Ballard Locks salmon counts live?'));
});
test('Tour links back to fish counts and visitor hub', async () => {
  const { applyBallardSiteShell } = await import('../scripts/ballard-site-shell.mjs');
  const html = applyBallardSiteShell(source('/ballard-locks/tour/'),'/ballard-locks/tour/');
  assert.ok(html.includes('data-ballard-ctr-v1="sibling-links"'));
  assert.ok(html.includes('href="/ballard-locks/"'));
  assert.ok(html.includes('href="/ballard-locks/salmon-counts/"'));
});
test('Sitemap lastmod is aligned to this release for both target URLs', () => {
  const xml=fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');
  for(const route of ['/ballard-locks/','/ballard-locks/salmon-counts/']){
    const section=xml.split('<loc>'+base+route+'</loc>')[1]?.split('</url>')[0];
    assert.ok(section && section.includes('<lastmod>2026-10-11</lastmod>'),route);
  }
});
