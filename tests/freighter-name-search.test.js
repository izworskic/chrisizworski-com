import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('public/great-lakes-freighter-tracking/index.html','utf8');
const js=fs.readFileSync('public/assets/freighter-tracker.js','utf8');
const css=fs.readFileSync('public/assets/freighter-tracker.css','utf8');

test('ship tracker offers live vessel search without changing its canonical or safety claims',()=>{
  for(const id of ['freighterNameSearch','freighterSearchAll','freighterClearSearch','freighterSearchStatus','freighterVessels','freighterMap']){
    assert.ok(html.includes('id="'+id+'"'),id+' missing');
  }
  assert.match(html,/Ship name or MMSI/);
  assert.match(html,/role="search"/);
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/missing ship does not prove empty water/i);
  assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/great-lakes-freighter-tracking\/">/);
  assert.match(html,/Great Lakes Ship Tracker Live Now/);
  assert.match(css,/\.vessel-search-controls/);
});

test('case-insensitive matching accepts ship names, multiword names and MMSI, no guesses',()=>{
  const match=js.match(/function vesselMatchesSearch\(vessel,rawQuery\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(match,'Search matcher missing');
  const fn=vm.runInNewContext('('+match+')');
  const vessel={name:'M/V Arthur M. Anderson',mmsi:367001234};
  assert.equal(fn(vessel,'anderson'),true);
  assert.equal(fn(vessel,'ARTHUR  M.'),true);
  assert.equal(fn(vessel,'367001234'),true);
  assert.equal(fn(vessel,'unknown freighter'),false);
  assert.equal(fn({name:null,mmsi:367000011},'367000011'),true);
  assert.equal(fn({name:null,mmsi:null},'367000011'),false);
  assert.equal(fn(vessel,'  '),true);
});

test('search respects recent AIS and corridor coverage, does not suppress feed outages',()=>{
  assert.match(js,/Date\.now\(\)-Date\.parse\(v\.seen\)<=1800000/);
  assert.match(js,/vesselMatchesSearch\(v,query\)/);
  assert.match(js,/activeView === "overview"/);
  assert.match(js,/Search unavailable: no current AIS reports loaded/);
  assert.match(js,/A missing report is not evidence the ship is absent/);
  assert.match(js,/vesselSearch\.addEventListener\("input"/);
  assert.match(js,/selectView\("overview",\{updateHash:true,track:true\}\)/);
  assert.match(js,/vesselSearch\.value=""/);
});
