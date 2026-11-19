'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../public/assets/rideau-lock-flights.js');
const html=fs.readFileSync(path.join(__dirname,'../public/rideau-canal/index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../public/assets/rideau-canal.css'),'utf8');

test('Ottawa is one numbered eight-chamber staircase with a 24.1 m total lift',()=>{
  assert.deepEqual(api.sites.ottawa.locks.map(x=>x.number),[1,2,3,4,5,6,7,8]);
  assert.equal(api.sites.ottawa.lift,'24.1 m');
  const svg=api.renderSvg('ottawa',4);
  assert.equal((svg.match(/data-chamber=/g)||[]).length,8);
  assert.equal((svg.match(/class="flight-chamber is-selected"/g)||[]).length,1);
  assert.match(svg,/Ottawa River/);
  assert.match(svg,/Upper Rideau Canal/);
  assert.doesNotMatch(svg,/TURNING BASIN/);
  assert.match(svg,/data-chamber="5"/);
});
test('Jones Falls has lower locks 42 41 40, a turning basin, and detached lock 39',()=>{
  const site=api.sites.jones;
  assert.deepEqual(site.locks.map(x=>x.number),[42,41,40,39]);
  assert.equal(site.lift,'17.4 m');
  const svg=api.renderSvg('jones',3);
  assert.equal((svg.match(/data-chamber=/g)||[]).length,4);
  assert.equal((svg.match(/class="flight-chamber is-selected"/g)||[]).length,1);
  assert.match(svg,/TURNING BASIN/);
  assert.match(svg,/open water between flights/);
  assert.match(svg,/data-chamber="39"/);
  assert.match(site.note,/not a fifth lock/);
});
test('static SVG fallback and enhanced renderer use the same authored drawing',()=>{
  for(const [key,file] of [['ottawa','rideau-locks-ottawa-diagram.svg'],['jones','rideau-locks-jones-falls-diagram.svg']]){
    const stored=fs.readFileSync(path.join(__dirname,'../public/assets',file),'utf8');
    assert.equal(stored,api.renderSvg(key,0),file);
    assert.match(stored,/not to scale/);
    assert.match(stored,/role="img"/);
    assert.match(stored,/aria-labelledby="flight-drawing-title flight-drawing-desc"/);
  }
});
test('the interactive selection is bounded and reversible, not a live operating model',()=>{
  assert.equal(api.clamp('ottawa',-5),0);
  assert.equal(api.clamp('ottawa',300),7);
  assert.equal(api.clamp('jones',300),3);
  assert.equal(api.clamp('jones','two'),0);
  assert.notEqual(api.renderSvg('ottawa',2),api.renderSvg('ottawa',6));
  assert.equal(api.renderSvg('ottawa',2),api.renderSvg('ottawa',api.clamp('ottawa',2)));
  assert.match(html,/id="rideau-flight-fallback"/);
  assert.match(html,/id="rideau-flight-enhanced"/);
  assert.match(html,/id="rideau-flight-prev"/);
  assert.match(html,/id="rideau-flight-next"/);
  assert.match(html,/id="rideau-flight-reset"/);
  assert.match(html,/id="rideau-flight-chambers"/);
  assert.match(html,/\/assets\/rideau-lock-flights\.js/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(html,/autoplay/);
});
test('site identity, source links, ad and canonical contracts survive the redesign',()=>{
  assert.match(html,/https:\/\/chrisizworski\.com\/rideau-canal\//);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  assert.match(html,/data-analytics-page="rideau-canal"/);
  assert.match(html,/\/assets\/tool-engagement\.js/);
  assert.match(html,/parks\.canada\.ca\/lhn-nhs\/on\/rideau/);
  assert.ok(!html.includes('data-rideau-diorama'));
  assert.match(html,/not to scale/i);
  assert.match(html,/not live lock levels/);
  assert.match(html,/not a scale model|not to scale/i);
});
