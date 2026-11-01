// Behaviour of the Michigan garden tools as a visitor sees them, on fixed dates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTool } from '../scripts/lib/garden-tool-harness.mjs';

const f = r => `public/${r}/index.html`;

test('planting calendar: this week, crop lookup and old links', () => {
  const p = loadTool(f('zone-6a-planting-calendar'), { today: '2026-03-10' });
  assert.equal(p.text('weekBadge'), 'In season now');
  assert.match(p.text('weekTitle'), /near Bay City/);
  assert.match(p.text('weekNow'), /Start tomatoes indoors/);
  assert.match(p.text('cropTitle'), /Tomatoes near Bay City/);
  const old = loadTool(f('zone-6a-planting-calendar'), { search: '?city=grayling&safe=1' });
  assert.equal(old.$('citySel').value, 'grayling');
  assert.ok(old.$('timeline').children.length > 20);
  assert.match(old.text('frostFacts'), /Cautious date/);
  const quiet = loadTool(f('zone-6a-planting-calendar'), { today: '2026-01-05' });
  assert.equal(quiet.text('weekBadge'), 'A quiet week');
  assert.match(quiet.text('weekWhy'), /Tend what is growing/);
});

test('frost dates: plain odds for a planting day, past-frost and fall answers', () => {
  const p = loadTool(f('michigan-frost-dates'), { today: '2026-04-20' });
  assert.match(p.text('frostTitle'), /^In Bay City, plant tender crops after May 9\./);
  assert.equal(p.text('riskBadge'), 'Too early for tender plants');
  p.set('plantDate', '2026-05-12');
  assert.match(p.text('riskTitle'), /May 12: a frost still comes later in about 1 spring in 5/);
  p.set('plantDate', '2026-06-10');
  assert.equal(p.text('riskBadge'), 'Past spring frost');
  const fall = loadTool(f('michigan-frost-dates'), { today: '2026-10-24' });
  assert.equal(fall.text('riskBadge'), 'Past first fall frost');
  assert.equal((p.html.match(/<tr data-n=/g) || []).length, 78, 'the full station table stays');
});

test('tomato check: windows in order, readings decide go or wait', () => {
  const p = loadTool(f('when-to-plant-tomatoes-michigan'), { today: '2026-05-20' });
  assert.match(p.text('tTitle'), /tomato planting time near Bay City/);
  p.set('tSoil', '56', 'input');
  assert.equal(p.text('tBadge'), 'Wait for warmer soil');
  p.set('tSoil', '62', 'input'); p.set('tLow', '55', 'input');
  assert.equal(p.text('tBadge'), 'Plant today');
  assert.match(p.html, /id="tomato-quick-answer"/);
});

test('seed starting guide: zone answer, own frost date, fixed zone 6a data', () => {
  const p = loadTool(f('seed-starting-guide'), { today: '2026-04-20' });
  assert.match(p.text('ssTitle'), /^Zone 6a:/);
  assert.match(p.text('ssFacts'), /Apr 18/);
  p.set('ssLF', '2026-05-20');
  assert.match(p.text('ssTitle'), /^With a last frost of May 20:/);
  assert.doesNotMatch(p.$('tableArea').textContent, />, </);
});

test('matchmaker: instant picks in the browser, link restores answers', () => {
  const p = loadTool(f('heirloom-variety-matchmaker'));
  assert.equal(p.texts('.mm-card').length, 3);
  p.choose('space', 'balcony');
  const q = loadTool(f('heirloom-variety-matchmaker'), { search: p.doc.replaced.at(-1) });
  assert.equal(q.text('mmTitle'), p.text('mmTitle'));
  assert.doesNotMatch(p.html, /fetch\('\/api\/matchmaker'/);
});

test('soil temperature: measured, forecast and history answers, offline fallback, link into Plant Now', async () => {
  const { soilFetch } = await import('../scripts/lib/soil-fixtures.mjs');
  const open = (today, search = '', o = {}) => loadTool(f('michigan-soil-temperature'), { today, search, fetch: soilFetch({ today, ...o }) });
  const spring = open('2026-04-20', '?place=Flint&for=40');
  assert.equal(spring.text('soilBadge'), 'Warm enough');
  assert.match(spring.text('soilWhy'), /averaged \d+°F at MSU’s Flint station/);
  assert.match(spring.text('soilWhy'), /shifted by \+2°F/, 'the 2°F cold model is corrected and the shift is shown');
  assert.match(spring.$('soilPlantNow').href, /^\/michigan-gardening\/\?place=Flint&soil=\d+#plant-now$/);
  assert.ok(spring.$('soilChart').children.length > 10);
  spring.choose('soilFor', '60');
  assert.notEqual(spring.text('soilBadge'), 'Warm enough');
  assert.match(spring.text('soilFacts'), /Danger of frost past/);
  // The two MSU temperatures are the only thresholds, quoted from the 2009 guide.
  assert.deepEqual(Object.keys(spring.ctx.MISoil.THRESHOLDS), ['40', '60']);
  const fall = open('2026-10-24');
  assert.equal(fall.text('soilBadge'), 'Next spring');
  assert.match(fall.text('soilTitle'), /^Next spring, the soil near Bay City usually stays/);
  const off = open('2026-04-20', '', { failMSU: true });
  assert.equal(off.text('soilBadge'), 'Typical spring');
  assert.match(off.text('soilWhy'), /could not be loaded, so this is the station’s record only/);
  assert.match(off.$('soilPlantNow').href, /^\/michigan-gardening\/\?place=Bay\+City#plant-now$/, 'no stale reading is passed on');
  const noModel = open('2026-05-08', '?place=Flint&for=60', { failModel: true });
  assert.match(noModel.text('soilWhy'), /No forecast could be loaded/);
  assert.doesNotMatch(noModel.text('soilBadge'), /Forecast/);
  const hub = loadTool(f('michigan-gardening'), { today: '2026-04-20' });
  assert.match(hub.html, /href="\/michigan-soil-temperature\/"/);
});

test('hub soil link carries the place', () => {
  const hub = loadTool(f('michigan-gardening'), { today: '2026-04-20', search: '?place=49783' });
  assert.equal(hub.document.querySelector('.pn-soil-link').href, '/michigan-soil-temperature/?place=49783');
});


test('Michigan Growing Season Explorer: crop and soil decisions tell the same story', () => {
  const p = loadTool(f('michigan-gardening'), { today: '2026-05-12' });
  assert.match(p.text('pnSeasonTitle'), /^Tomatoes: From seed tray/);
  assert.match(p.text('pnSeasonLocation'), /Bay City frost station/);
  assert.match(p.text('pnSeasonStepBody'), /one spring out of four/);
  assert.match(p.text('pnSeasonLandmarks'), /May 2/);
  assert.match(p.text('pnSeasonLandmarks'), /May 9/);
  assert.match(p.text('pnSeasonLandmarks'), /May 26/);
  assert.equal(p.$('pnRows').children.filter(x => x.classList.contains('pn-row-selected')).length, 1);

  p.set('pnCrop', 'beans');
  assert.match(p.text('pnSeasonTitle'), /^Snap beans: Two gates/);
  p.set('pnSoil', '55', 'input');
  assert.match(p.text('pnSeasonStatus'), /Wait for the soil/);
  p.set('pnSoil', '64', 'input');
  assert.match(p.text('pnSeasonStatus'), /Plant now/);
  assert.match(p.text('pnSeasonSteps'), /Above 60°F/);

  const first = p.$('pnSeasonSteps').children[0];
  first.dispatch('click');
  assert.match(p.text('pnSeasonStepTitle'), /Watch the frost odds/);
  p.$('pnSeasonSteps').children[2].dispatch('click');
  assert.match(p.text('pnSeasonStepTitle'), /Sow in the bed/);

  p.set('pnCrop', 'peas');
  assert.match(p.text('pnSeasonTitle'), /ground make the call/);
  assert.match(p.text('pnSeasonSteps'), /No fixed calendar date/);
  p.choose('pnWork', 'yes');
  assert.match(p.text('pnSeasonStatus'), /Plant now/);

  p.set('pnCrop', 'garlic');
  assert.match(p.text('pnSeasonTitle'), /fall planting for next summer/i);
  assert.match(p.text('pnSeasonStatus'), /hard freeze/);
  assert.equal(p.$('pnSeasonMissing').hidden, true);
  p.set('pnCrop', 'cilantro');
  assert.match(p.text('pnSeasonStatus'), /early spring or fall/);
  p.set('pnCrop', 'zinnias');
  assert.match(p.text('pnSeasonStatus'), /Minnesota Extension/);
  assert.equal(p.$('pnSeasonMissing').hidden, true);

  p.set('pnCrop', 'beans');
  p.set('pnPlace', '49783');
  assert.match(p.text('pnSeasonLocation'), /Sault Ste. Marie/);
  p.click('pnShare');
  const url = new URL(p.$('pnShareOut').value);
  assert.equal(url.searchParams.get('crop'), 'beans');
  const restored = loadTool(f('michigan-gardening'), { today: '2026-05-12', search: url.search });
  assert.match(restored.text('pnSeasonTitle'), /^Snap beans:/);
  assert.match(restored.text('pnSeasonLocation'), /Sault Ste. Marie/);

  p.set('pnPlace', 'Bay City');
  p.set('pnCrop', 'tomatoes');
  assert.match(p.text('pnSeasonTitle'), /^Tomatoes:/);
  assert.match(p.text('pnSeasonLandmarks'), /May 2/);
  assert.equal(p.$('pnRows').children.filter(x => x.classList.contains('pn-row-selected')).length, 1);
});

test('all-season notebook changes season and follows frost reference without inventing missing data', () => {
  const p=loadTool(f('michigan-gardening'), {today:'2026-11-01',search:'?place=Bay%20City'});
  assert.match(p.text('gyHeading'), /next garden/);
  p.set('gyMaturity','50','input');
  assert.match(p.text('gyResult'), /July 31, 2026/);
  assert.match(p.text('gyResult'), /has passed/);
  p.set('pnPlace','Adrian');
  assert.match(p.text('gyResult'), /not available/);
  p.set('pnPlace','Bay City');
  assert.match(p.text('gyResult'), /July 31, 2026/);
  const buttons=p.document.querySelectorAll('[data-garden-season]');
  buttons.find(b=>b.getAttribute('data-garden-season')==='spring').click();
  assert.match(p.text('gyHeading'), /soil/);
  buttons.find(b=>b.getAttribute('data-garden-season')==='fall').click();
  assert.match(p.text('gyHeading'), /next garden/);
});

test('my garden assembles selected plants and updates with location', () => {
 const p=loadTool(f('michigan-gardening'), {today:'2026-03-20',search:'?place=Bay%20City'});
 p.set('gardenPick','tomatoes');p.click('gardenAdd');
 p.set('gardenPick','peas');p.click('gardenAdd');
 assert.match(p.text('gardenPlan'),/Tomatoes/);assert.match(p.text('gardenPlan'),/Peas/);
 assert.match(p.text('gardenCount'),/2 plants/);
 const a=p.text('gardenPlan');p.set('pnPlace','49783');assert.notEqual(p.text('gardenPlan'),a);
 p.set('gardenPick','tomatoes');p.click('gardenAdd');assert.match(p.text('gardenCount'),/2 plants/);
});

test('my garden packet values use the shared fall planner', () => {
 const p=loadTool(f('michigan-gardening'),{today:'2026-04-15',search:'?place=Bay%20City'});
 p.set('gardenPick','lettuce');p.set('gardenDays','48','input');p.click('gardenAdd');
 assert.match(p.text('gardenPlan'),/packet 48 days plus 14-day buffer/);
 p.set('pnPlace','Adrian');assert.match(p.text('gardenPlan'),/No sourced fall frost date/);
});

test('garden packet days can be changed and cleared without removing the plant', () => {
 const p=loadTool(f('michigan-gardening'),{today:'2026-04-15',search:'?place=Bay%20City'});
 p.set('gardenPick','lettuce');p.set('gardenDays','48','input');p.click('gardenAdd');
 const card=p.$('gardenPlan').querySelector('.garden-plant');
 const input=card.querySelector('input');input.value='60';card.querySelector('.garden-save').click();
 assert.match(p.text('gardenPlan'),/packet 60 days plus 14-day buffer/);
 const updated=p.$('gardenPlan').querySelector('.garden-plant');
 updated.querySelector('input').value='';updated.querySelector('.garden-save').click();
 assert.match(p.text('gardenPlan'),/Leaf lettuce/);assert.doesNotMatch(p.text('gardenPlan'),/packet 60 days/);
});


test('planting calendar uses the shared engine and refuses unsourced fall station dates',()=>{
 const p=loadTool(f('zone-6a-planting-calendar'),{today:'2026-04-15',search:'?city=adrian&crop=garlic'});
 assert.match(p.text('frostFacts'),/Not reported for this station/);
 assert.match(p.text('cropNow'),/hard freeze/);
 assert.doesNotMatch(p.text('cropSteps'),/Oct/);
 p.set('cropSel','Zinnias');assert.match(p.text('cropNow'),/Minnesota Extension/);
 p.set('cropSel','Tomatoes');
 const before=p.text('cropSteps');p.choose('mode','cautious');assert.notEqual(p.text('cropSteps'),before);
 p.set('customLF','2026-05-20');assert.match(p.text('cropSteps'),/Mar 25/);
 p.click('icsBtn');assert.match(p.doc.downloads.at(-1),/BEGIN:VCALENDAR/);
});

test('saved garden shows upcoming, year-qualified references and updates when a plant is removed',()=>{
 const p=loadTool(f('michigan-gardening'),{today:'2026-11-01',search:'?place=Bay%20City'});
 p.set('gardenPick','tomatoes');p.click('gardenAdd');
 assert.equal(p.$('gardenAhead').hidden,false);assert.match(p.text('gardenAhead'),/Start indoors: Tomatoes/);
 assert.match(p.text('gardenAhead'),/2027/);assert.match(p.text('gardenAhead'),/forecast/);
 const card=p.$('gardenPlan').querySelector('.garden-plant');card.querySelector('.garden-remove').click();
 assert.equal(p.$('gardenAhead').hidden,true);
});

test('fall notebook rolls next year after the typical fall frost and respects missing station data',()=>{
 const p=loadTool(f('michigan-gardening'),{today:'2026-11-01',search:'?place=Bay%20City'});
 p.set('gardenPick','lettuce');p.set('gardenDays','48','input');p.click('gardenAdd');
 assert.match(p.text('gardenAhead'),/Fall planning reference: Leaf lettuce/);assert.match(p.text('gardenAhead'),/2027/);
 p.set('pnPlace','Adrian');assert.equal(p.$('gardenAhead').hidden,true);assert.match(p.text('gardenPlan'),/No sourced fall frost date/);
});


test('garden homepage does not show a portrait or broken portrait placeholder',()=>{
 const p=loadTool(f('michigan-gardening'));
 assert.doesNotMatch(p.html,/chris-izworski-portrait|hm-brand-avatar/);
});

test('a past fall planning reference is identified as having passed',()=>{
 const p=loadTool(f('michigan-gardening'),{today:'2026-09-01',search:'?place=Bay%20City'});
 p.set('gardenPick','lettuce');p.set('gardenDays','48','input');p.click('gardenAdd');
 assert.match(p.text('gardenPlan'),/planning reference has already passed/i);
});
