'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./helpers/freighter-layup-harness.cjs');
test('all-lakes resets query, harbor, berth, evidence and selected detail together',async()=>{
 const f=await fixture();await f.event('harbor-filter','change','sturgeon-bay');await f.event('ship-search','input','Barker');await f.ship('james-r-barker');
 assert.equal(f.read().selected,'james-r-barker');await f.click('reset-map');
 assert.equal(f.read().query,'');assert.equal(f.read().activeHarbor,'all');assert.equal(f.read().selected,null);
 assert.equal(f.get('ship-detail').hidden,true);assert.match(f.get('count-note').textContent,/12 of 12/);
});
test('earlier and upcoming winters cannot offer unsupported harbors or retain old vessels',async()=>{
 const f=await fixture();await f.event('season','change','2024-25');
 assert.deepEqual(f.get('harbor-filter').children.map(x=>x.value),['all','owen-sound']);assert.match(f.get('count-note').textContent,/2 of 2/);
 await f.event('season','change','2026-27');assert.equal(f.get('harbor-filter').disabled,true);assert.equal(f.get('stat-ships').textContent,0);assert.equal(f.read().selected,null);
 await f.click('ship-grid',{'data-action':'archive'});assert.match(f.get('count-note').textContent,/12 of 12/);assert.equal(f.get('harbor-filter').disabled,false);
});
test('alias search, reported-only filter and scoped confidence totals agree',async()=>{
 const f=await fixture();await f.event('ship-search','input','Roger M. Kyes');assert.match(f.get('count-note').textContent,/1 of 12.*1 verified \/ 0 reported/);
 await f.click('clear-filters');await f.event('evidence-filter','change','reported');assert.match(f.get('count-note').textContent,/2 of 12.*0 verified \/ 2 reported/);
 await f.event('harbor-filter','change','toledo');assert.match(f.get('count-note').textContent,/1 of 12.*0 verified \/ 1 reported/);
});
test('empty-result recovery preserves harbor and winter; reset restores full winter',async()=>{
 const f=await fixture();await f.event('harbor-filter','change','sturgeon-bay');await f.event('ship-search','input','no-such-vessel');assert.match(f.get('ship-grid').innerHTML,/Clear search/);
 await f.click('ship-grid',{'data-action':'clear-search'});assert.equal(f.read().activeHarbor,'sturgeon-bay');assert.equal(f.read().season,'2025-26');assert.match(f.get('count-note').textContent,/3 of 12/);
});
test('shared selection survives reload parsing and close returns to originating ship',async()=>{
 const f=await fixture();await f.event('harbor-filter','change','owen-sound');await f.ship('algoma-compass');const url=f.location.href;
 assert.equal(f.get('ship-detail').hidden,false);assert.equal(f.focused().id,'ship-detail');
 const reloaded=await fixture({url});assert.equal(reloaded.read().selected,'algoma-compass');assert.equal(reloaded.get('detail-title').textContent,'Algoma Compass');
 await reloaded.click('detail-close');assert.equal(reloaded.focused().dataset.ship,'algoma-compass');assert.equal(reloaded.read().activeHarbor,'owen-sound');
});
test('Back and Forward restore selected records and validated winter-specific filters',async()=>{
 const f=await fixture();await f.event('harbor-filter','change','owen-sound');await f.ship('algoma-compass');await f.event('season','change','2024-25');
 await f.back();assert.equal(f.read().season,'2025-26');assert.equal(f.read().selected,'algoma-compass');assert.equal(f.get('ship-detail').hidden,false);
 await f.forward();assert.equal(f.read().season,'2024-25');assert.equal(f.read().selected,null);assert.deepEqual(f.get('harbor-filter').children.map(x=>x.value),['all','owen-sound']);
});
test('core tasks load while optional biography metadata stalls; failure retry recovers once',async()=>{
 const f=await fixture({stallBios:true});assert.equal(f.get('atlas-controls').disabled,false);assert.match(f.get('count-note').textContent,/12 of 12/);await f.ship('lee-a-tregurtha');assert.equal(f.get('ship-detail').hidden,false);
 const failed=await fixture({failures:1});assert.equal(failed.get('archive-error').hidden,false);await failed.click('archive-retry');assert.equal(failed.get('archive-error').hidden,true);assert.equal(failed.requests(),2);assert.equal(failed.get('atlas-controls').disabled,false);
});
test('hostile or inconsistent URL values normalize without selecting an unrelated ship',async()=>{
 const f=await fixture({url:'https://chrisizworski.com/great-lakes-freighter-winter-layup/?season=2024-25&harbor=superior&vessel=james-r-barker&evidence=bogus&q=%3Cimg%20onerror%3Dx%3E'});
 assert.equal(f.read().activeHarbor,'all');assert.equal(f.read().selected,null);assert.equal(f.read().evidence,'all');assert.equal(f.get('ship-grid').innerHTML.includes('<img onerror'),false);
});
test('cross-winter action retains the curated hull and visibly labels the selected archive',async()=>{
 const f=await fixture();await f.ship('algoma-compass');
 await f.click('detail-body',{'data-winter':'2024-25','data-vessel':'algoma-compass'});
 assert.equal(f.read().season,'2024-25');assert.equal(f.read().selected,'algoma-compass');assert.match(f.get('detail-body').innerHTML,/Winter 2024–25/);
});
test('harbor comparison uses zero-based sample counts and education steps remain general interpretation',async()=>{
 const f=await fixture();assert.deepEqual(f.model.harborCounts(f.registry,'2025-26').map(h=>h.count),[6,3,1,1,1]);
 const chart=f.get('harbor-panel').children.find(n=>n.className==='harbor-comparison');assert.equal(chart.children.length,5);
 assert.equal(chart.children[0].children[1].children[0].attrs.width,'100');
 assert.equal(chart.children[1].children[1].children[0].attrs.width,'50');
});
test('phone and desktop harbor controls share one selection and seasonal validity',async()=>{
 const f=await fixture();await f.event('harbor-filter-mobile','change','toledo');
 assert.equal(f.get('harbor-filter').value,'toledo');assert.equal(f.read().activeHarbor,'toledo');assert.match(f.get('count-note').textContent,/1 of 12/);
 await f.event('season','change','2026-27');assert.equal(f.get('harbor-filter-mobile').disabled,true);assert.equal(f.get('harbor-filter-mobile').value,'all');
});
test('winter-work controls explain each phase without a vessel-specific prediction',async()=>{
 const f=await fixture();await f.work(1);assert.equal(f.get('work-title').textContent,'Make room for the work');assert.match(f.get('work-copy').textContent,/each move needs its own dated evidence/);
 await f.work(2);assert.equal(f.get('work-title').textContent,'Return to the lakes');assert.match(f.get('work-copy').textContent,/do not promise a sailing date/);
});
