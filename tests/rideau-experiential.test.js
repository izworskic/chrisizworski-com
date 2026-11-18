'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const lab=require('../public/assets/rideau-lock-lab.js');
const watch=require('../data/rideau-canal/watch-v1.json');
const html=fs.readFileSync('public/rideau-canal/index.html','utf8');
const js=fs.readFileSync('public/assets/rideau-canal.js','utf8');
const css=fs.readFileSync('public/assets/rideau-canal.css','utf8');

test('lock simulator offers a truthful, reversible five-step teaching sequence',()=>{
  assert.equal(lab.isValid(),true);
  assert.equal(lab.stages.length,5);
  assert.deepEqual([lab.model(0).index,lab.model(4).index,lab.model(99).index],[0,4,4]);
  assert.equal(lab.model(2).level,'high');
  assert.equal(lab.model(2).upper,'closed');
  assert.equal(lab.model(2).lower,'closed');
  assert.equal(lab.model(3).upper,'open');
  assert.equal(lab.model(0).waterY,246);
  assert.equal(lab.model(2).waterY,128);
  assert.equal(lab.model(0).index,lab.model(lab.clampStage(3-3)).index);
});
test('the demonstration is HTML-first, accessible and never claims to be live',()=>{
  for(const id of ['inside-the-lock','lock-lab-forward','lock-lab-back','lock-lab-reset','lock-lab-chamber-water','lock-lab-boat','lock-lab-step-text','rideau-film-player'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/not a scale model/);
  assert.match(html,/recorded Parks Canada films, not live cameras/i);
  assert.match(html,/youtube.com\/watch\?v=pqRibZT_9Ls/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(html,/autoplay|data-live-feed/i);
});
test('viewpoint data is mirrored and never invents a walking geometry or entrance',()=>{
  assert.equal(fs.readFileSync('data/rideau-canal/watch-v1.json','utf8'),fs.readFileSync('public/assets/rideau-watch.json','utf8'));
  assert.deepEqual(Object.keys(watch.stations).sort(),['chaffeys','jones-falls','kingston-mills','merrickville','newboro','ottawa','smiths-falls-combined']);
  for(const s of Object.values(watch.stations)){
    assert.ok(s.intro&&s.foodSearch);
    for(const p of s.places){
      assert.match(p.sourceUrl,/^https:\/\/(parks\.canada\.ca|ottawatourism\.ca)\//);
      assert.ok(p.googleQuery);
      assert.equal(Object.prototype.hasOwnProperty.call(p,'lat'),false);
      assert.equal(Object.prototype.hasOwnProperty.call(p,'directions'),false);
    }
  }
  assert.ok(watch.stations.ottawa.places.some(p=>p.name.includes('Plaza Bridge')));
  assert.ok(watch.stations['jones-falls'].places.some(p=>p.name.includes('Redpath')));
  assert.match(js,/renderWatchGuide\(p\)/);
  assert.match(js,/window\.VisitorMapLinks\?\.placeSearch/);
  assert.doesNotMatch(js,/verifiedDirections\(/);
  assert.match(html,/id="rideau-watch-guide"/);
});
test('interpretive copy is location-specific and site contracts remain unchanged',()=>{
  const sites=require('../data/rideau-canal/locations.json');
  for(const id of ['ottawa','merrickville','smiths-falls-combined','newboro','chaffeys','jones-falls','kingston-mills']){
    const s=sites.lockLocations.find(p=>p.id===id);
    assert.ok(s&&s.visit.interpretiveTip.length>75,id);
  }
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  assert.match(html,/https:\/\/chrisizworski\.com\/rideau-canal\//);
  assert.doesNotMatch(html,/youtube-nocookie\.com\/embed/);
  assert.ok(html.includes('/assets/rideau-lock-lab.js'));
});
