'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('public/assets/seaway.js','utf8');
const generator=fs.readFileSync('scripts/generate-seaway.mjs','utf8');
const enhancer=fs.readFileSync('scripts/enhance-seaway-journey.mjs','utf8');
const popup=js.slice(js.indexOf('function shipDetail(v)'),js.indexOf('function updateReportLine()'));
test('ship map popup remains compact without repeated AIS explanatory paragraph',()=>{
  assert.match(popup,/Reported '+time\(v\.seen\)/);
  assert.match(popup,/C\.motion\(v\)/);
  assert.match(popup,/C\.direction\(v\)/);
  assert.match(popup,/Reported length/);
  assert.match(popup,/Check official lock order of turn/);
  assert.match(popup,/Original ship reports & source/);
  assert.doesNotMatch(popup,/A radio postcard from the ship|It does not reserve a turn at a lock|AIS destination text is not a verified itinerary/);
});
test('both canonical Seaway pages request refreshed popup code, including future regenerated pages',()=>{
  for(const slug of ['st-lawrence-seaway','eisenhower-lock']){
    const html=fs.readFileSync('public/'+slug+'/index.html','utf8');
    assert.match(html,/\/assets\/seaway\.js\?v=20261108d/);
    assert.match(html,/rel="canonical"/);
  }
  assert.match(generator,/\/assets\/seaway\.js\?v=20261108d/);
  assert.match(enhancer,/\/assets\/seaway\.js\?v=20261108d/);
});
