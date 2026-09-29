import test from 'node:test';
import assert from 'node:assert/strict';
import { enhanceBallardMain, enhanceBallardTour, PHOTOS } from '../scripts/ballard-photo-program.mjs';

const mainFixture = `<!doctype html><style>.x{}</style><body><section class="section"><div class="section-head"><div><div class="kicker">Trackable activity now</div></div></div><div class="metrics"></div><div class="explain" id="steps"></div></body>`;
const tourFixture = `<!doctype html><style>.x{}</style><body><div class="tour"><div class="toolbar"></div></div><section class="section"><h2>Three ideas worth carrying through the whole walk</h2></section><script>const esc=s=>s;function popup(s){return \`<div class="pop"><h3>\${s.name}</h3></div>\`}</script></body>`;

test('main interpretive photo layer uses action, salmon, water-control and scale visuals', () => {
  const html = enhanceBallardMain(mainFixture);
  assert.match(html, /data-photo-program="ballard-interpretive-v2"/);
  assert.match(html, /Three views that make the whole place click/);
  assert.match(html, /Best for · First-time visitors/);
  assert.match(html, /data-photo-role="water-control"/);
  assert.match(html, /data-photo-role="small-lock"/);
  assert.match(html, /Gulf Cajun commercial vessel/);
  assert.match(html, /salmon at the glass/i);
  assert.match(html, /loading="lazy"/);
});

test('tour assigns memorable persona-led photos and adds only two deeper visual explainers', () => {
  const html = enhanceBallardTour(tourFixture);
  assert.match(html, /data-photo-program="ballard-interpretive-v2"/);
  assert.match(html, /const stopImages=/);
  assert.match(html, /photoForStop\(s\.id\)/);
  for (const id of ['visitor','large','small','fish','spillway','garden','cavanaugh']) assert.match(html, new RegExp(`${id}:\\{src:`));
  assert.match(html, /data-photo-role="fish-ladder-anatomy"/);
  assert.match(html, /data-photo-role="historic-comparison"/);
  assert.match(html, /Now the word “ladder” makes sense/);
  assert.match(html, /THEN · 1917/);
  assert.doesNotMatch(html, /carousel|slideshow/i);
});

test('photo manifest has eight purposeful assets with explicit provenance and adequate alt text', () => {
  assert.equal(Object.keys(PHOTOS).length, 8);
  for (const [key, photo] of Object.entries(PHOTOS)) {
    assert.match(photo.src, /^https:\/\//, `${key} needs HTTPS image source`);
    assert.match(photo.source, /^https:\/\/(?:commons\.wikimedia\.org|www\.nws\.usace\.army\.mil)\//, `${key} needs a primary or explicit-license source page`);
    assert.ok(photo.alt.length >= 40, `${key} alt text too thin`);
    assert.ok(photo.credit.length >= 8, `${key} credit missing`);
  }
  assert.match(PHOTOS.large.src, /media\.defense\.gov/);
  assert.match(PHOTOS.fish.src, /salmon_in_ladder/);
  assert.match(PHOTOS.fishLadder.src, /fish_ladder_02/);
  assert.match(PHOTOS.garden.src, /Chittenden_Locks_from_Carl_P\._English_Gardens/);
  assert.match(PHOTOS.history.src, /Ballard_Locks%2C_1917/);
});
