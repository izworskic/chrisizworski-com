'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/duluth-canal-park/index.html'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public/assets/duluth-canal.js'), 'utf8');
const tuner = fs.readFileSync(path.join(root, 'scripts/tune-duluth-discovery.mjs'), 'utf8');

test('interpretive copy teaches real canal, bridge and harbor history with controlling sources', () => {
  assert.match(html, /id="harbor-story-title">What to look for when the bridge rises/);
  assert.match(html, /Minnesota Point in 1871/);
  assert.match(html, /suspended ferry car in 1905/);
  assert.match(html, /vertical lift bridge in 1929–30/);
  assert.match(html, /iron ore, grain, coal, limestone/);
  assert.match(html, /asce\.org\/about-civil-engineering\/history-and-heritage\/historic-landmarks\/duluth-aerial-lift-bridge/);
  assert.match(html, /duluthport\.com\/about-us\/frequently-asked-questions/);
  assert.match(html, /These are historical and port references, not today's ship or bridge schedule/);
});

test('each named visitor viewpoint gives a genuinely different way to experience the canal', () => {
  assert.match(html, /North side \/ Visitor Center<\/h3><p>Start here for a first ship watch/);
  assert.match(html, /South side \/ Park Point<\/h3><p>Look back toward the Duluth waterfront/);
  assert.match(html, /Canal Park \/ Lakewalk<\/h3><p>Make the ship watch part of a longer waterfront walk/);
  assert.match(html, /Use marked public paths and observe posted restrictions/);
  assert.match(html, /The free museum adds ship models/);
});

test('live text remains evidence-bound, with an informative no-vessel and feed-error explanation', () => {
  assert.doesNotThrow(() => new vm.Script(client));
  assert.match(client, /That is not a zero-traffic report/);
  assert.match(client, /Current AIS does not support a useful bridge-passage window/);
  assert.match(client, /this is a watching window, not a guaranteed bridge opening/);
  assert.match(client, /AIS is unavailable right now, so we cannot recommend a current arrival window/);
  assert.match(client, /This is not a zero-traffic report/);
  assert.match(html, /No supported next passage does not mean no ships are scheduled today/);
  assert.match(html, /A published time does not guarantee an Aerial Lift Bridge opening/);
});

test('search build preserves reviewed lead and story without changing core metadata', () => {
  assert.match(html, /Watch a freighter enter Duluth from Lake Superior/);
  assert.match(tuner, /const interpretiveLede =/);
  assert.match(tuner, /missing reviewed interpretive lead/);
  assert.match(tuner, /NEXT SHIP WORTH WATCHING/);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\/duluth-canal-park\/"/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /"dateModified":"2026-11-24"/);
  assert.doesNotMatch(html, /<meta name="robots" content="noindex"/);
});

test('failed refresh clears shared displayed passage candidates before any renderer', () => {
  assert.match(client, /data = \{ \.\.\.data, watchPick: null, candidates: \[\], mapVessels:/);
  assert.match(client, /seen <= now && now - seen <= 30 \* 60 \* 1000/);
  assert.match(client, /currentData = data;\s*renderPick\(data, failed\);\s*renderMonitorSummary\(data, failed\);\s*renderMap\(data, failed\);\s*renderCandidates\(data, failed\);/);
  assert.match(client, /focus.disabled = failed \|\| !pick/);
  assert.match(client, /Last-known position/);
  assert.match(client, /Earlier passage windows are withheld until fresh reports return/);
});
