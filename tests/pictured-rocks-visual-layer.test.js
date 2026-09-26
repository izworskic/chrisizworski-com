const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const visual=fs.readFileSync('public/assets/pictured-rocks-visual-layer.js','utf8');
const core=fs.readFileSync('public/assets/pictured-rocks-planner-v3.js','utf8');
const html=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');

test('v3 runtime loads the visual layer without replacing planner logic',()=>{
  assert.match(core,/pictured-rocks-visual-layer\.js\?v=20260926-1/);
  assert.match(core,/routeWithLiveConstraints/);
  assert.match(core,/highlightMap/);
});

test('visual layer contains six decision-linked destination controls',()=>{
  for(const id of ['cliffs','minersCastle','chapel','minersFalls','sable','hurricane']){
    assert.match(visual,new RegExp(`${id}:\\{time:`));
    assert.match(visual,new RegExp(`card\\('${id}'`));
  }
  assert.match(visual,/data-build-place/);
  assert.match(visual,/requestSubmit/);
});

test('visuals use real NPS image hosts with visible NPS attribution',()=>{
  assert.ok((visual.match(/https:\/\/www\.nps\.gov\//g)||[]).length>=10);
  assert.match(visual,/NPS photo/);
  assert.doesNotMatch(visual,/image_gen|generated image|AI image/i);
});

test('map desk exposes interactive map plus official NPS brochure and backcountry maps',()=>{
  assert.match(html,/id="parkMap"/);
  assert.match(visual,/Official NPS park map/);
  assert.match(visual,/d8a6f628-fd8a-4f04-8f63-8812220f9526/);
  assert.match(visual,/Backcountry-Map-Regulations-Mileage-accessible\.pdf/);
});

test('map zones change contextual destination photography',()=>{
  for(const zone of ['west','central','east']) assert.match(visual,new RegExp(`${zone}:\\{src:`));
  assert.match(visual,/mapZoneImage/);
  assert.match(visual,/img\.src=p\.src/);
});

test('mobile visual cards become swipeable rather than a giant vertical gallery',()=>{
  assert.match(visual,/@media\(max-width:600px\)/);
  assert.match(visual,/scroll-snap-type:x mandatory/);
  assert.match(visual,/flex:0 0 84vw/);
});

test('canonical and noindex preview contract remain in the static owner page',()=>{
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(html,/rel="canonical" href="https:\/\/picturedrocks\.chrisizworski\.com\/"/);
});
