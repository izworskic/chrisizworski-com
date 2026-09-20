const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

const hub=fs.readFileSync(path.join(root,'public/michigan-gardening/index.html'),'utf8');
const zone=fs.readFileSync(path.join(root,'public/zone-6a-planting-calendar/index.html'),'utf8');
const tomato=fs.readFileSync(path.join(root,'public/when-to-plant-tomatoes-michigan/index.html'),'utf8');
const heirloom=fs.readFileSync(path.join(root,'public/heirloom-tomatoes-michigan/index.html'),'utf8');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/garden-page-one-ctr-experiment.json'),'utf8'));

test('gardening hub strengthens authority without rewriting protected page-one treatments',()=>{
  assert.match(hub,/id="garden-start-title"/);
  for(const href of cfg.authoritySupport.requiredLinks) assert.match(hub,new RegExp('href="'+href.replace(/[.*+?^$()|[\]\\]/g,'\\$&')+'"'));
  assert.match(hub,/47 crops from 78 Michigan frost stations/);
  assert.match(hub,/When to plant tomatoes in Michigan/);
  assert.match(hub,/Best heirloom tomatoes for Michigan/);

  assert.match(zone,/<title>Michigan Zone 6a Planting Calendar by City \| Chris Izworski<\/title>/);
  assert.match(zone,/<h1>Michigan Zone 6a Planting Calendar by City<\/h1>/);
  assert.match(tomato,/<title>When to Plant Tomatoes in Michigan: 2026 Dates by Region<\/title>/);
  assert.match(tomato,/<h1>When to Plant Tomatoes in Michigan: 2026 Dates by Region<\/h1>/);
  assert.match(heirloom,/<title>Best Heirloom Tomatoes for Michigan \| Chris Izworski<\/title>/);
  assert.match(heirloom,/<h1>Best Heirloom Tomatoes for Michigan<\/h1>/);
});

test('latest gardening signals are recorded as measurement, not a new page-query join',()=>{
  assert.equal(cfg.latestObserved.pages['zone-6a-calendar'].impressions,136);
  assert.equal(cfg.latestObserved.pages['heirloom-tomatoes'].impressions,152);
  assert.equal(cfg.latestObserved.protectedNeighborSignals['when-to-plant-tomatoes-michigan'].averagePosition,6.24);
  assert.match(cfg.latestObserved.interpretation,/Preserve the active page treatments/i);
  assert.match(cfg.authoritySupport.rule,/do not rewrite/i);
});
