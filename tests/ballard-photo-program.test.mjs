import test from 'node:test';
import assert from 'node:assert/strict';
import { enhanceBallardMain, enhanceBallardTour, PHOTOS } from '../scripts/ballard-photo-program.mjs';

const mainFixture = `<!doctype html><style>.x{}</style><body><section class="section"><div class="section-head"><div><div class="kicker">Trackable activity now</div></div></div><div class="metrics"></div><div class="explain" id="steps"></div></body>`;
const tourFixture = `<!doctype html><style>.x{}</style><body><div class="tour"><div class="toolbar"></div></div><script>const esc=s=>s;function popup(s){return \`<div class="pop"><h3>\${s.name}</h3></div>\`}</script></body>`;

test('main interpretive photo layer preserves decision page and adds persona-led visual cues', () => {
  const html = enhanceBallardMain(mainFixture);
  assert.match(html, /data-photo-program="ballard-interpretive-v1"/);
  assert.match(html, /Three views that make the whole place click/);
  assert.match(html, /Best for · First-time visitors/);
  assert.match(html, /data-photo-role="water-control"/);
  assert.match(html, /data-photo-role="small-lock"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /Photo: .*Wikimedia Commons/);
});

test('tour core stops receive one interpretive reference image without becoming a gallery', () => {
  const html = enhanceBallardTour(tourFixture);
  assert.match(html, /data-photo-program="ballard-interpretive-v1"/);
  assert.match(html, /const stopImages=/);
  assert.match(html, /photoForStop\(s\.id\)/);
  for (const id of ['visitor','large','small','fish','spillway','garden']) assert.match(html, new RegExp(`${id}:\\{src:`));
  assert.doesNotMatch(html, /carousel|slideshow/i);
});

test('photo manifest uses real source pages and provides alt text', () => {
  assert.equal(Object.keys(PHOTOS).length, 6);
  for (const [key, photo] of Object.entries(PHOTOS)) {
    assert.match(photo.src, /^https:\/\//, `${key} needs HTTPS image source`);
    assert.match(photo.source, /^https:\/\/commons\.wikimedia\.org\//, `${key} needs attribution source`);
    assert.ok(photo.alt.length >= 40, `${key} alt text too thin`);
    assert.ok(photo.credit.length >= 8, `${key} credit missing`);
  }
});
