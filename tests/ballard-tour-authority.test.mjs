import test from 'node:test';
import assert from 'node:assert/strict';
import { enhanceBallardTourAuthority, BALLARD_AUTHORITIES } from '../scripts/ballard-tour-authority.mjs';

const fixture = `<!doctype html><html><head><style>.x{}</style></head><body><div class="live"><div class="cell"><div class="kicker">Access</div><div class="value" id="access">Checking hours</div><div class="detail" id="access-detail">Grounds and viewing room</div></div></div><section class="section source"><h2>Research basis</h2><p>Existing basis.</p></section></body></html>`;

test('tour adds one contextual USACE verification link and a compact four-source authority strip', () => {
  const html = enhanceBallardTourAuthority(fixture);
  assert.match(html, /data-authority-layer="ballard-tour-v1"/);
  assert.match(html, /Verify access with USACE/);
  for (const id of ['usace','wdfw','noaa','nws']) assert.match(html, new RegExp(`data-authority="${id}"`));
  assert.equal((html.match(/class="authority-link"/g) || []).length, 4);
  assert.equal((html.match(/data-authority="usace-access"/g) || []).length, 1);
  assert.match(html, /Posted signs, closures and on-site USACE staff direction always control/);
});

test('authority layer points only to primary operational sources', () => {
  assert.match(BALLARD_AUTHORITIES.usace, /^https:\/\/www\.nws\.usace\.army\.mil\//);
  assert.match(BALLARD_AUTHORITIES.wdfw, /^https:\/\/wdfw\.wa\.gov\//);
  assert.match(BALLARD_AUTHORITIES.noaa, /^https:\/\/tidesandcurrents\.noaa\.gov\//);
  assert.match(BALLARD_AUTHORITIES.nws, /^https:\/\/forecast\.weather\.gov\//);
});

test('authority layer stays restrained instead of entering every interpretive popup', () => {
  const html = enhanceBallardTourAuthority(fixture);
  assert.doesNotMatch(html, /Verify with USACE<\/a>.*Verify with USACE<\/a>/s);
  assert.doesNotMatch(html, /authority.*carousel|carousel.*authority/i);
  assert.doesNotMatch(html, /ballardlocks\.org/i);
});
