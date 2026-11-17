const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const html=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const js=fs.readFileSync('public/assets/up-waterfalls-arrival-desk.js','utf8');
const base=fs.readFileSync('public/assets/up-waterfalls.js','utf8');
const css=fs.readFileSync('public/assets/up-waterfalls-experience-pilot.css','utf8');
const catalog=JSON.parse(fs.readFileSync('data/up-waterfalls.json','utf8')).waterfalls;
const tag=id=>{
  assert.match(id,/^[a-z0-9-]+$/);
  const match=html.match(new RegExp('<article class="waterfall-card"[^>]*data-id="'+id+'"[^>]*>'));
  assert.ok(match,'Missing result card: '+id);
  return match[0];
};

test('arrival decision is attached to the existing map without adding a hero or replacing accessible static guides',()=>{
  assert.equal((html.match(/id="arrival-desk"/g)||[]).length,1);
  assert.ok(html.indexOf('id="falls-map"')<html.indexOf('id="arrival-desk"'));
  assert.ok(html.indexOf('id="arrival-desk"')<html.indexOf('id="results"'));
  assert.equal((html.match(/class="waterfall-card" data-fall/g)||[]).length,80);
  assert.equal(catalog.length,80);
  assert.match(html,/<noscript><p>For every waterfall, the searchable list below includes published parking and trail information/);
  assert.match(html,/src="\/assets\/up-waterfalls-arrival-desk\.js"/);
  assert.doesNotMatch(html,/upfall-hero-photo-wall/);
  assert.match(css,/\.upfall-arrival-desk/);
  assert.match(js,/document\.addEventListener\('upfall:selected'/);
  assert.match(base,/document\.dispatchEvent\(new CustomEvent\('upfall:selected',\{detail:\{id\}\}\)\)/);
  assert.match(js,/window\.UPWaterfallArrivalDesk/);
});

test('documented parking directions demand independently sourced entrance coordinates',()=>{
  for(const id of ['wagner-falls','upper-hungarian-falls','middle-hungarian-falls','lower-hungarian-falls']){
    const el=tag(id);
    assert.match(el,/data-parking-lat="[\d.]+" data-parking-lng="[-\d.]+"/);
    assert.match(el,/data-parking-source="https:\/\//);
    assert.match(el,/data-arrival-verified="verified"/);
  }
  assert.doesNotMatch(tag('bond-falls'),/data-parking-source=/);
  assert.doesNotMatch(tag('munising-falls'),/data-parking-source=/);
  assert.match(tag('munising-falls'),/data-status="closed"/);
  assert.match(tag('scott-falls'),/data-arrival-verified="verified"/);
  assert.doesNotMatch(tag('scott-falls'),/data-parking-source=/);
  assert.match(tag('scott-falls'),/Do not cross busy M-28/);
  assert.match(tag('tahquamenon'),/data-arrival-verified="specialist"/);
  assert.match(js,/d\.arrivalVerified !== 'verified'/);
  assert.match(js,/d\.status === 'closed'/);
  assert.match(js,/category\(card\) === 'unverified'/);
  assert.match(js,/d\.parkingSource/);
  assert.match(js,/keweenawlandtrust\.org/);
  assert.match(tag('saxon-falls'),/data-parking-source="https:\/\/ironcountyoutdoors\.org/);
  assert.match(js,/new URL\(url, window\.location\.origin\)/);
  assert.match(js,/Golf Course Road is seasonal and unplowed in winter/);
  assert.match(js,/month >= 11 \|\| month <= 4/);
  assert.doesNotMatch(js,/fetch\(|localStorage|sessionStorage|new WebSocket|sendBeacon/);
});

test('arrival desk is valid standalone JavaScript and preserves existing visitor contracts',()=>{
  const output=spawnSync(process.execPath,['--check','public/assets/up-waterfalls-arrival-desk.js'],{encoding:'utf8'});
  assert.equal(output.status,0,output.stderr);
  const indexes=['id="arrival-parking"','id="arrival-walk"','id="arrival-watch"','id="arrival-actions"'];
  indexes.forEach(id=>assert.ok(html.includes(id),id));
  assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/upper-peninsula-waterfalls\//);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  assert.match(html,/id="falls-map"/);
  assert.match(html,/id="visit-lens"/);
  assert.match(html,/id="shortlist"/);
  assert.match(html,/id="geographic-research"/);
  assert.match(html,/data-arrival-source="https:\/\//);
});
