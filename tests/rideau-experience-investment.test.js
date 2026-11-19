'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('public/rideau-canal/index.html');
const css=read('public/assets/rideau-canal.css');
const js=read('public/assets/rideau-lock-flights.js');
const flights=require('../public/assets/rideau-lock-flights.js');

test('the entire flight has a separate overview and a close-up, without hiding no-script teaching',()=>{
  for(const id of ['rideau-flight-overview-graphic','rideau-flight-overview-count','rideau-flight-stage','rideau-flight-chambers','rideau-flight-fallback']){
    assert.match(html,new RegExp('id="'+id+'"'),id);
  }
  assert.match(html,/The large drawing below follows your selected chamber/);
  assert.match(html,/width="1200" height="510"/);
  assert.match(html,/rideau-locks-jones-falls-diagram\.svg/);
  assert.match(js,/overview\.innerHTML=renderSvg/);
  assert.match(js,/aria-hidden="true" focusable="false"/);
  assert.match(js,/tabindex="-1"/);
  assert.match(css,/rideau-flight__overview-graphic svg/);
});

test('a real Jones Falls basin interrupts the lower flight without becoming a fifth lock',()=>{
  assert.equal(flights.sites.ottawa.locks.length,8);
  assert.equal(flights.sites.jones.locks.length,4);
  assert.deepEqual(flights.sites.jones.locks.map(lock=>lock.number),[42,41,40,39]);
  assert.equal((flights.renderSvg('jones',3).match(/data-chamber-index=/g)||[]).length,4);
  assert.equal((flights.renderSvg('ottawa',7).match(/data-chamber-index=/g)||[]).length,8);
  assert.match(js,/site\.id==='jones'&&n===3/);
  assert.match(js,/Turning basin/);
  assert.match(js,/Open water/);
  assert.match(css,/rideau-flight__chambers--jones:before/);
  assert.match(css,/linear-gradient\(90deg,#86aca9/);
});

test('connected route is an accessible control that updates from the same selected chamber',()=>{
  assert.match(js,/strip\.replaceChildren\(\)/);
  assert.match(js,/chip\.setAttribute\('aria-label'/);
  assert.match(js,/chip\.setAttribute\('aria-pressed'/);
  assert.match(js,/chip\.dataset\.progress=n<i/);
  assert.match(js,/select\(state\.site,n\)/);
  assert.match(js,/get\('rideau-flight-title'\)\.textContent/);
  assert.match(js,/stage\.innerHTML=renderSvg\(state\.site,i\)/);
  assert.match(js,/get\('rideau-flight-overview-count'\)\.textContent/);
  assert.match(css,/\.rideau-flight__chambers \.rideau-flight__chip:focus-visible/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(html,/id="rideau-flight-prev"/);
  assert.match(html,/id="rideau-flight-next"/);
});

test('experience investment scope protects source identities and avoids new dependencies',()=>{
  assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/rideau-canal\//);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  assert.match(html,/Season check: navigation ended October 12, 2026/);
  assert.match(html,/2027 hours have not been verified/);
  assert.match(html,/Recorded Parks Canada lock films/);
  assert.doesNotMatch(js,/fetch\(|WebGL|Three\.js|React/);
  for(const source of [html,js,css])assert.doesNotMatch(source,/[–—]/);
  assert.match(html,/\/assets\/rideau-lock-flights\.js\?v=20261119-investment/);
  assert.match(html,/\/assets\/rideau-canal\.css\?v=20261119-lookout/);
});
