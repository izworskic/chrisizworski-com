import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');

test('Rank #1 Flagship Michigan Winter Weekend Getaways (/michigan-winter-weekends/) has 12 static weekend bases, 15 verified photos (0 numbered placeholders), Automatic 4-Season Engine, and Leaflet map', () => {
  const html = read('public/michigan-winter-weekends/index.html');
  const css = read('public/assets/michigan-winter-weekends.css');
  const js = read('public/assets/michigan-winter-weekends.js');

  assert.match(html, /<h1>/);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-winter-weekends\/"/);
  assert.match(html, /numberOfItems":12/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /<noscript>/);

  const stories = [...html.matchAll(/<article class="wf-story"[\s\S]*?<\/article>/g)];
  assert.equal(stories.length, 12);
  assert.equal((html.match(/data-evidence="https:\/\//g) || []).length, 12);

  const photos = [...html.matchAll(/<figure class="wf-photo[^]*?<\/figure>/g)];
  const indices = [...html.matchAll(/<div class="wf-story-index"[\s\S]*?<\/div>/g)];
  assert.equal(photos.length, 15);
  assert.equal(indices.length, 0);

  for (const [photo] of photos) {
    assert.match(photo, /Photo: <a/);
    assert.match(photo, /(CC BY|CC0|Public domain|Public Domain|NPS)/i);
    assert.match(photo, /figcaption/);
    assert.match(photo, /alt="[^"]+"/);
  }

  for (const [b] of stories) {
    assert.match(b, /https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=[0-9.]+%2C-[0-9.]+/);
    assert.match(b, /View place on Google Maps · not parking/);
    assert.match(b, /target="_blank" rel="noopener noreferrer"/);
  }

  assert.match(html, /id="wkd-season-bar"/);
  assert.match(html, /id="wkd-mode-stage"/);
  assert.match(html, /id="wkd-drive"/);
  for (const season of ['winter', 'spring', 'summer', 'fall']) {
    assert.match(html, new RegExp(`data-season-card="${season}"`));
  }
  assert.ok(html.includes('src="/assets/leaflet-1.9.4.js"'));
  assert.ok(!html.includes('unpkg.com/leaflet'));

  assert.match(js, /America\/Detroit/);
  assert.match(js, /revealPhotoFallback/);
  assert.match(js, /groups=new Map/);
  assert.ok(css.includes('.wkd-season-engine'));
});

test('Rank #2 Michigan White Christmas & Christmas-Week Escapes (/michigan-white-christmas-escapes/) has 10 static holiday towns, 13 verified photos (0 numbered placeholders), Christmas Countdown Engine, and NOAA climatology', () => {
  const html = read('public/michigan-white-christmas-escapes/index.html');
  const css = read('public/assets/michigan-white-christmas-escapes.css');
  const js = read('public/assets/michigan-white-christmas-escapes.js');

  assert.match(html, /<h1>/);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-white-christmas-escapes\/"/);
  assert.match(html, /numberOfItems":10/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /<noscript>/);

  const stories = [...html.matchAll(/<article class="wf-story"[\s\S]*?<\/article>/g)];
  assert.equal(stories.length, 10);
  assert.equal((html.match(/data-evidence="https:\/\//g) || []).length, 10);

  const photos = [...html.matchAll(/<figure class="wf-photo[^]*?<\/figure>/g)];
  const indices = [...html.matchAll(/<div class="wf-story-index"[\s\S]*?<\/div>/g)];
  assert.equal(photos.length, 13);
  assert.equal(indices.length, 0);

  for (const [photo] of photos) {
    assert.match(photo, /Photo: <a/);
    assert.match(photo, /(CC BY|CC0|Public domain|Public Domain|NPS)/i);
    assert.match(photo, /figcaption/);
    assert.match(photo, /alt="[^"]+"/);
  }

  for (const [b] of stories) {
    assert.match(b, /https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=[0-9.]+%2C-[0-9.]+/);
    assert.match(b, /View place on Google Maps · not parking/);
    assert.match(b, /target="_blank" rel="noopener noreferrer"/);
  }

  assert.match(html, /1991–2020/);
  assert.match(html, /96%/);
  assert.match(html, /45\.7%/);
  assert.match(html, /id="wce-season-bar"/);
  assert.match(html, /id="wce-mode-stage"/);
  assert.ok(html.includes('href="/national-tools/white-christmas/forecast/"'));
  assert.ok(html.includes('href="/white-christmas-probability-map/"'));
  assert.ok(html.includes('href="/white-christmas-michigan/"'));
  assert.ok(html.includes('src="/assets/leaflet-1.9.4.js"'));
  assert.ok(!html.includes('unpkg.com/leaflet'));

  assert.match(js, /America\/Detroit/);
  assert.match(js, /revealPhotoFallback/);
  assert.match(js, /groups=new Map/);
  assert.ok(css.includes('.wce-season-engine'));
});

test('100% real photograph coverage across all winter field guides with zero .wf-story-index numbered placeholders', () => {
  const guides = [
    ['public/michigan-winter-weekends/index.html', 15],
    ['public/michigan-white-christmas-escapes/index.html', 13],
    ['public/michigan-winter-activities/index.html', 19],
    ['public/frozen-michigan/index.html', 12],
    ['public/michigan-winter-trails/index.html', 18],
    ['public/michigan-wine-cider-spirits/index.html', 21],
  ];

  for (const [path, expectedMinPhotos] of guides) {
    const html = read(path);
    const photos = [...html.matchAll(/<figure class="wf-photo[^]*?<\/figure>/g)];
    const indices = [...html.matchAll(/<div class="wf-story-index"[\s\S]*?<\/div>/g)];
    assert.equal(indices.length, 0, `${path} still contains a .wf-story-index numbered placeholder`);
    assert.ok(photos.length >= expectedMinPhotos, `${path} has ${photos.length} photos, expected >= ${expectedMinPhotos}`);
  }
});

test('Sprint 1 guides are wired into tools, michigan-destinations, fall-color, winter sibling guides, and sitemap-winter.xml', () => {
  for (const hub of [
    'public/tools/index.html',
    'public/michigan-destinations/index.html',
    'public/fall-color/index.html',
    'public/michigan-winter-activities/index.html',
    'public/frozen-michigan/index.html',
    'public/michigan-winter-trails/index.html',
    'public/michigan-wine-cider-spirits/index.html',
  ]) {
    const h = read(hub);
    assert.ok(h.includes('href="/michigan-winter-weekends/"'), `${hub} missing /michigan-winter-weekends/`);
    assert.ok(h.includes('href="/michigan-white-christmas-escapes/"'), `${hub} missing /michigan-white-christmas-escapes/`);
  }
  const sitemap = read('public/sitemap-winter.xml');
  assert.ok(sitemap.includes('https://chrisizworski.com/michigan-winter-weekends/'));
  assert.ok(sitemap.includes('https://chrisizworski.com/michigan-white-christmas-escapes/'));
});
