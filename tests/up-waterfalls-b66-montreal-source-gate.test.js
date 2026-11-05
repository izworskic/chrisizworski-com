'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const data = JSON.parse(read('data/up-waterfall-montreal-access-evidence.json'));
test('B66 does not convert proposed Montreal infrastructure into an existing visitor route',()=>{
  assert.equal(data.reviewDate, '2026-11-05');
  assert.deepEqual(data.gisFeatures.map(x=>x.id),[139,140]);
  assert.equal(data.disposition,'published-historic-public-approaches-but-not-live-route-clearance');
  assert.equal(data.routes.filter(x=>x.published).length,2);
  for (const r of data.routes){assert.equal(r.currentOpen,false);assert.equal(r.preciseParkingGps,null);assert.equal(r.renderDirections,false);}
  assert.ok(data.sourceAxes.newConstruction.sources.some(s=>s.includes('michigan.gov/dnr')));
  assert.ok(data.routes.find(r=>r.id==='korc-west-connector')!==data.routes.find(r=>r.id==='dnr-east-montreal-corridor'));
});
test('B66 pages remain research-only and distinguish published access, pending west, constructing east',()=>{
  for (const slug of ['lower-montreal-falls-keweenaw','upper-montreal-falls-keweenaw']){
    const html=read('public/upper-peninsula-waterfalls/research/'+slug+'/index.html');
    assert.match(html,/<meta name="robots" content="noindex,follow">/);
    assert.match(html, /Fish Cove/);
    assert.match(html, /KORC/);
    assert.match(html, /Montreal Corridor/);
    assert.match(html, /2026-11-05/);
    assert.doesNotMatch(html, /TouristAttraction/);
    assert.doesNotMatch(html, /google\.com\/maps\/dir\//i);
    assert.doesNotMatch(html, /https:\/\/www\.google\.com\/maps\?daddr/i);
    assert.match(html, /NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);
    assert.match(html, /Smiths-Fisheries/);
  }
});
