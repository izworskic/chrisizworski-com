'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {CROSSINGS,chargeFor,portAuthorityPeakFor,periodFor}=require('../lib/nyc-crossing/engine');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/nyc-crossing/index.html'),'utf8');
const crossing=id=>CROSSINGS.find(c=>c.id===id);
const quote=(id,payment,travelAt,destinationZone=false,type='car')=>
  chargeFor(crossing(id),{payment,travelAt,destinationZone,vehicle:{type}});

test('HTML includes indexable, generated 11-crossing car toll answers from the engine',()=>{
  assert.match(html,/<h1>NYC Bridge &amp; Tunnel Toll Calculator<\/h1>/);
  assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski.com\/nyc-crossing\/">/);
  assert.match(html,/<section class="panel" id="nyc-toll-rates"/);
  const markup=html.split('<!-- NYC_TOLL_RATE_TABLE_START -->')[1].split('<!-- NYC_TOLL_RATE_TABLE_END -->')[0];
  assert.equal((markup.match(/<tr><th scope="row">/g)||[]).length,CROSSINGS.length);
  for(const c of CROSSINGS)assert.ok(markup.includes(c.name.replace(/&/g,'&amp;')),c.name);
  execFileSync(process.execPath,[path.join(root,'scripts/generate-nyc-toll-search-surface.mjs'),'--check'],{stdio:'pipe'});
});

test('verified 2026 PA car rates use its own peak clock, including weekends',()=>{
  assert.equal(quote('lincoln','ny-ezpass','2026-11-02T08:00').toll,1679);
  assert.equal(quote('lincoln','ny-ezpass','2026-11-02T12:00').toll,1479);
  assert.equal(quote('gwb','ny-ezpass','2026-11-02T17:00').toll,1679);
  assert.equal(quote('holland','ny-ezpass','2026-11-07T10:00').toll,1479);
  assert.equal(quote('holland','ny-ezpass','2026-11-07T12:00').toll,1679);
  assert.equal(quote('gwb','mail','2026-11-02T12:00').toll,2330);
  assert.equal(portAuthorityPeakFor('2026-11-02T12:00'),false);
  assert.equal(periodFor('2026-11-02T12:00').key,'peak');
});

test('2026 MTA car/mail rates and zone credits are distinct charges',()=>{
  assert.equal(quote('rfk','ny-ezpass','2026-11-02T08:00').toll,746);
  assert.equal(quote('verrazzano','mail','2026-11-02T08:00').toll,1203);
  assert.equal(quote('queens-midtown','mail','2026-11-02T08:00',true).zone,1350);
  assert.equal(quote('lincoln','ny-ezpass','2026-11-02T12:00',true).total,2079);
  assert.equal(quote('lincoln','ny-ezpass','2026-11-02T12:00',true).credit,300);
  assert.equal(quote('lincoln','mail','2026-11-02T08:00',true).total,3680);
  assert.equal(quote('brooklyn','ny-ezpass','2026-11-02T08:00',true).toll,0);
  assert.equal(quote('brooklyn','mail','2026-11-02T23:00',true).zone,330);
});

test('motorcycle rates are sourced; unmodeled commercial axle rates are unavailable',()=>{
  assert.equal(quote('lincoln','ny-ezpass','2026-11-02T12:00',false,'motorcycle').toll,1379);
  assert.equal(quote('rfk','ny-ezpass','2026-11-02T08:00',false,'motorcycle').toll,325);
  assert.equal(quote('rfk','mail','2026-11-02T08:00',false,'motorcycle').toll,506);
  assert.equal(quote('lincoln','ny-ezpass','2026-11-02T12:00',true,'large-truck').total,null);
});
