const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('Blue Ridge main page exposes live gateway intelligence before personalization',()=>{
  const html=read('public/blue-ridge-parkway/index.html');
  assert.match(html,/Blue Ridge Parkway today: know where the road is worth your time/i);
  assert.match(html,/id="gatewaySnapshots"/);
  assert.match(html,/RIGHT NOW/);
  assert.match(html,/Four gateways\. Four different Parkway decisions\./);
  assert.ok(html.indexOf('id="gatewaySnapshots"')<html.indexOf('id="plannerForm"'),'live decision desk must render before the planner form');
  assert.match(html,/blue-ridge-parkway-breakout\.js/);
});

test('Blue Ridge gateway pages are distinct canonical search-intent owners',()=>{
  const expected={
    asheville:/North or south\?/i,
    boone:/High Country/i,
    roanoke:/Peaks of Otter|Mabry Mill/i,
    cherokee:/Waterrock Knob|Balsams/i
  };
  for(const [gateway,signal] of Object.entries(expected)){
    const html=read(`public/blue-ridge-parkway/${gateway}/index.html`);
    assert.match(html,new RegExp(`https://chrisizworski\\.com/blue-ridge-parkway/${gateway}/`));
    assert.match(html,new RegExp(`data-blue-ridge-gateway="${gateway}"`));
    assert.match(html,/id="gatewayLive"/);
    assert.match(html,signal);
    assert.match(html,new RegExp(`gateway=${gateway}`));
  }
});

test('Blue Ridge breakout layer reuses the production route API instead of inventing a second route engine',()=>{
  const js=read('public/assets/blue-ridge-parkway-breakout.js');
  assert.match(js,/\/api\/blue-ridge-parkway\?/);
  assert.match(js,/Promise\.allSettled/);
  assert.match(js,/payload\.road\?\.ok/);
  assert.match(js,/payload\.selected/);
  assert.match(js,/Do not infer that the road is open/);
});

test('Blue Ridge discovery surfaces are added by the build sitemap step',()=>{
  const sitemap=read('scripts/add-yosemite-firefall-to-sitemap.mjs');
  for(const gateway of ['asheville','boone','roanoke','cherokee']){
    assert.match(sitemap,new RegExp(`blue-ridge-parkway/\\$\\{gateway\\}`));
  }
  assert.match(sitemap,/one owner per genuinely different search intent/i);
  assert.match(sitemap,/2026-09-25/);
});

test('Blue Ridge breakout copy avoids generic travel slop',()=>{
  const pages=[
    'public/blue-ridge-parkway/index.html',
    'public/blue-ridge-parkway/asheville/index.html',
    'public/blue-ridge-parkway/boone/index.html',
    'public/blue-ridge-parkway/roanoke/index.html',
    'public/blue-ridge-parkway/cherokee/index.html'
  ].map(read).join('\n');
  for(const phrase of ['Whether you are','Whether you’re','breathtaking vistas','hidden gems','unforgettable journey','something for everyone']){
    assert.doesNotMatch(pages,new RegExp(phrase,'i'));
  }
});
