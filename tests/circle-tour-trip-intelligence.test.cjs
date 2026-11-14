'use strict';
const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const ledger=JSON.parse(fs.readFileSync('data/circle-tour-road-evidence.json','utf8'));
const hub=fs.readFileSync('public/lake-superior-circle-tour/index.html','utf8');
const sitemap=fs.readFileSync('public/sitemap.xml','utf8');
const kernel=require('../public/assets/circle-tour-rust-itinerary.js');
const generated='public/lake-superior-circle-tour/10-day/index.html';

test('30-leg road ledger has three bounded gateway estimates and does not promote park access',()=>{
 assert.equal(ledger.edges.length,30);
 const scoped=[['7','8',52],['12','31',25],['31','13',73]];
 for(const [a,b,miles] of scoped){
  const row=ledger.edges.find(e=>e.from===a&&e.to===b);
  assert.equal(row.planningGateway?.miles,miles);
  assert.equal(row.status,'published-estimate-unverified');
  assert.ok(row.planningGateway?.caveat?.length>75);
  assert.ok(row.planningGateway.source.startsWith('https://'));
  assert.ok(row.planningGateway.corroboration.startsWith('https://'));
  assert.ok(hub.includes(row.visitorCard));
 }
 assert.equal(ledger.edges.find(e=>e.to==='21').status,'partial-source-only');
 assert.equal(ledger.edges.find(e=>e.to==='21').sourceReview?.borderCorridorMiles,38);
 assert.equal((hub.match(/data-edge-verified="false"/g)||[]).length,1);
 assert.equal(ledger.edges.filter(e=>e.planningGateway).length,3);
});
test('Rust feasibility policy does not grant a clock for missing park access',()=>{
 assert.equal(kernel.feasibility({miles:87,availableHours:9,visitHours:2,evidenceComplete:true}).code,1);
 assert.equal(kernel.feasibility({miles:303,availableHours:9,visitHours:1,evidenceComplete:true}).code,2);
 assert.equal(kernel.feasibility({miles:303,availableHours:7,visitHours:1,evidenceComplete:true}).code,3);
 assert.equal(kernel.feasibility({miles:192,availableHours:12,visitHours:1,borderMinutes:45,evidenceComplete:false}).code,4);
 assert.equal(kernel.feasibility({miles:87,availableHours:12,visitHours:1,evidenceComplete:true,seasonalHold:true}).code,5);
 assert.equal(kernel.feasibility({miles:-1,availableHours:9,visitHours:1,evidenceComplete:true}).code,0);
});
test('Python produces an actual static HTML, 10 distinctive days, sources, and crawlable Article schema',()=>{
 const run=spawnSync('python3',['scripts/build-circle-tour-trip-intelligence.py','--check'],{encoding:'utf8',timeout:20000});
 assert.equal(run.status,0,run.stderr+run.stdout);
 const html=fs.readFileSync(generated,'utf8');
 assert.match(html,/<title>Lake Superior Circle Tour: 10-Day Itinerary/);
 assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/lake-superior-circle-tour\/10-day\/">/);
 assert.match(html,/"@type":"Article"/);
 assert.equal((html.match(/<article class="day" id="day-/g)||[]).length,10);
 assert.equal((html.match(/<h3>/g)||[]).length,10);
 assert.ok(html.includes('Houghton gateway'));
 assert.ok(html.includes('border-time reserve')||html.includes('border-time'));
 assert.match(html,/Verify the final road approach|the result is withheld/);
 assert.match(html,/id="ct-intelligence-days"/);
 assert.match(html,/circle-tour-trip-feasibility\.js/);
 assert.doesNotMatch(html,/Product|Vehicle|offers|aggregateRating/);
 assert.ok(html.includes('Ontario 511'));
 assert.ok(html.includes('Whitefish Point'));
 const data=JSON.parse(html.match(/<script id="ct-intelligence-days" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(data.days.length,10);
 assert.equal(data.days.reduce((sum,x)=>sum+x.miles,0),1358);
 assert.equal(data.days[9].complete,false);
 assert.equal(data.days[9].baseline,'source-gap');
 assert.equal(data.days[6].complete,true);
 assert.equal(data.days[3].complete,true);
});
test('single canonical and truthful sitemap dates, hub remains unchanged in ads and 31 stops',()=>{
 assert.ok(sitemap.includes('https://chrisizworski.com/lake-superior-circle-tour/10-day/'));
 assert.equal((hub.match(/class="stop-card"/g)||[]).length,31);
 assert.match(hub,/route-detail" href="\/lake-superior-circle-tour\/10-day\/"/);
 assert.match(hub,/"dateModified":"2026-11-14"/);
 const page=fs.readFileSync(generated,'utf8');
 assert.equal((page.match(/rel="canonical"/g)||[]).length,1);
 assert.doesNotMatch(page,/adsbygoogle|pagead2\.googlesyndication\.com/);
});


const escapedForHtml=s=>s.replace(/&/g,'&amp;').replace(/'/g,'&#x27;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
test('interpretive ten-day guide has unique, properly attributed destination photography, no repeated mileage sales pitch',()=>{
 const page=fs.readFileSync(generated,'utf8');
 const story=JSON.parse(fs.readFileSync('data/circle-tour-visual-story.json','utf8'));
 assert.equal(Object.keys(story.days).length,10);
 assert.equal((page.match(/<figure class="day-photo">/g)||[]).length,10);
 assert.equal((page.match(/<figure class="hero-photo">/g)||[]).length,1);
 assert.equal((page.match(/<figcaption>/g)||[]).length,11);
 assert.equal((page.match(/class="photo-credit"/g)||[]).length,11);
 assert.equal((page.match(/loading="lazy" decoding="async" referrerpolicy="no-referrer"/g)||[]).length,10);
 assert.equal((page.match(/loading="eager" fetchpriority="high"/g)||[]).length,1);
 assert.equal(new Set([story.hero.src,...Object.values(story.days).map(d=>d.photo.src)]).size,11);
 assert.equal((page.match(/What do the mileage numbers actually tell me/g)||[]).length,1);
 assert.doesNotMatch(page,/What does the mileage prove|DAY 0\d · \d+ PUBLISHED MILES/);
 assert.match(page,/Ten days\. Ten different stretches of shoreline/);
 assert.match(page,/The whole shore, in one loop/);
 assert.match(page,/45-minute border-time allowance/);
 for(let i=1;i<=10;i++){
   const day=story.days[String(i)];
   assert.ok(day.photo.by&&day.photo.licenseUrl.startsWith('https://creativecommons.org/'));
   assert.ok(page.includes(day.photo.file.replace(/&/g,'&amp;')));
   assert.ok(page.includes(escapedForHtml(day.fieldNote)),'Missing day field note '+i);
   assert.ok(page.includes(escapedForHtml(day.focus)),'Missing day decision '+i);
   assert.ok(page.includes('id="day-'+i+'"'));
   assert.ok(day.tools.every(x=>page.includes(x.url.replace(/&/g,'&amp;'))));
 }
});
test('ten days link to actual existing visitor tools rather than generic official-source links',()=>{
 const page=fs.readFileSync(generated,'utf8');
 assert.equal((page.match(/class="day-tools"/g)||[]).length,10);
 const urls=[
   '/apostle-islands/','/duluth-canal-park/','/porcupine-mountains/',
   '/northern-lights-michigan/keweenaw/','/great-lakes-freighter-tracking/',
   'https://picturedrocks.chrisizworski.com/','/tahquamenon-falls/',
   '/soo-locks/','/lake-superior-provincial-park/','/sault-ste-marie-border-wait-time/',
   '/pukaskwa-national-park/','/gooseberry-falls/',
   '/split-rock-lighthouse-visit/'
 ];
 for(const url of urls)assert.ok(page.includes('href="'+url+'"'),'Missing companion tool '+url);
 assert.match(page,/Use the tools for this stop/);
 assert.match(page,/Things to do|Choose|Explore|Pick|Compare/i);
 assert.doesNotMatch(page,/adsbygoogle|pagead2\.googlesyndication/);
});
