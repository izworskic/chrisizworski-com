const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => readFileSync(path.join(root, file), 'utf8');

test('Prepared employment start is corrected across the identity pages', () => {
  for (const file of [
    'public/chris-izworski/index.html', 'public/chris-izworski-prepared/index.html',
    'public/chris-izworski-911/index.html', 'public/michigan-911-executive-director/index.html',
    'public/chris-izworski-biography/index.html', 'public/timeline/index.html',
    'public/projects/index.html'
  ]) {
    const html = read(file);
    assert.match(html, /(?:December|Dec) 2025/, file);
    assert.doesNotMatch(html, /(?:joined|began|started) Prepared (?:as a Solutions Consultant )?in October 2025|Prepared career profile reports that he joined in October 2025|Solutions Consultant &middot; October 2025/i, file);
    assert.doesNotMatch(html, /2026 start date is <strong>NOT REPORTED/i, file);
  }
  assert.match(read('public/timeline/index.html'), /Dec 2025 – present/);
  assert.match(read('public/timeline/index.html'), /Prepared<\/strong> &middot; current role: Solutions Consultant/);
  assert.match(read('public/projects/index.html'), /Prepared &middot; December 2025 – present/);
});

test('night-sky decisions and all six Michigan aurora guides use the same list-card structure as other tools', () => {
  const tools = read('public/tools/index.html');
  const start = tools.indexOf('<div class="decision-network__lane"><h3>Watch the night sky</h3>');
  const end = tools.indexOf('<div class="decision-network__lane"><h3>Follow ships</h3>', start);
  assert.ok(start >= 0 && end > start);
  const section = tools.slice(start, end);
  assert.equal((section.match(/<div class="decision-network__lane">/g) || []).length, 2);
  assert.equal((section.match(/<ul>/g) || []).length, 2);
  const routes = [
    '/northern-lights-michigan/', '/national-tools/meteor-shower/',
    '/national-tools/dark-sky/michigan/', '/national-tools/dark-sky/midwest/',
    '/national-tools/dark-sky/'
  ];
  for (const slug of ['keweenaw', 'marquette', 'munising', 'paradise-whitefish-point', 'mackinaw-city', 'sleeping-bear-dunes']) {
    const route = `/northern-lights-michigan/${slug}/`;
    const file = `public${route}index.html`;
    assert.ok(existsSync(path.join(root, file)), route);
    const html = read(file);
    assert.ok(html.includes(`rel="canonical" href="https://chrisizworski.com${route}"`), route);
    assert.doesNotMatch(html.slice(0, 10000), /<meta[^>]+name=["']robots["'][^>]+noindex/i, route);
    routes.push(route);
  }
  for (const route of routes) {
    const link = section.match(new RegExp(`<li><a href="${route}"[^>]*data-decision-network="[^"]+"[^>]*>[^<]+<span>[^<]+</span></a></li>`));
    assert.ok(link, `missing styled, measured link for ${route}`);
  }
  assert.match(section, /confirm park hours and access/i);
  assert.match(section, /do not guarantee a sighting/i);
  assert.doesNotMatch(section, /<h3>Dark-sky aurora guides<\/h3><p>/);
});
