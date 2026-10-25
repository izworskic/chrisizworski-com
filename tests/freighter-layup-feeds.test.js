'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const f=require('../lib/freighter-layup-feeds'),s=require('../lib/freighter-layup-season');
const sample={title:'Lee A Tregurtha arrived in Duluth for winter layup',text:'Lee A Tregurtha arrived in Duluth for winter layup at Fraser Shipyards.',date:'2027-01-16T12:00:00Z',url:'https://www.duluthharborcam.com/2027/01/lee.html'};
const source=f.SOURCES[0],known=[{key:'lee-a-tregurtha',name:'Lee A. Tregurtha',aliases:['Lee A Tregurtha']}];
function feed(){return JSON.stringify({feed:{entry:[{title:{$t:sample.title},content:{$t:sample.text},published:{$t:sample.date},link:[{rel:'alternate',href:sample.url}]}]}})}
test('Blogger JSON feed carries date, text and original URL',()=>{const a=f.parse(feed(),source);assert.equal(a.length,1);assert.equal(a[0].url,sample.url)});
test('RSS text extracts harmless dated reporting without HTML',()=>{const a=f.parse('<rss><item><title>Lee A Tregurtha winter layup</title><link>https://wmhs.org/lee/</link><pubDate>Fri, 15 Jan 2027 12:00:00 GMT</pubDate><description><![CDATA[<p>Arrived for winter layup in Superior</p>]]></description></item></rss>',f.SOURCES[1]);assert.match(a[0].text,/Arrived for winter/);assert.equal(a.length,1)});
test('a source report is reported, never automatically verified by a camera',()=>{const result=f.classify(sample,source,known,'2026-27');assert.equal(result.reason,'accepted');assert.equal(result.event.confidence,'reported');assert.equal(result.event.harborId,'superior')});
test('plans, stale years and unmatched ship names do not automatically publish',()=>{assert.equal(f.classify({...sample,date:'2026-01-16'},source,known,'2026-27').reason,'wrong_season');assert.equal(f.classify({...sample,title:'Lee A Tregurtha expected to arrive for winter layup'},source,known,'2026-27').reason,'planned_only');assert.equal(f.classify({...sample,title:'New vessel arrived for winter layup',text:'Unknown vessel arrived for winter layup in Duluth'},source,known,'2026-27').reason,'review')});
test('feed outages preserve published records, duplicate reports ignored',async()=>{const fetcher=async u=>u.includes('duluthharborcam')?{ok:true,text:async()=>feed()}:{ok:false,status:503};const archive={seasons:[{records:[{id:'lee-a-tregurtha',identity:{key:'lee-a-tregurtha'},name:'Lee A. Tregurtha',aliases:['Lee A Tregurtha']}]}]};const now='2027-01-17T00:00:00Z',one=await f.refresh({ledger:s.freshSeason('2026-27'),archive,fetcher,now});assert.equal(one.ledger.events.length,1);assert.equal(one.outcomes.filter(x=>!x.ok).length,3);const two=await f.refresh({ledger:one.ledger,archive,fetcher,now});assert.equal(two.changed,false);assert.equal(two.ledger.events.length,1)});

test('unmatched spring departure is held for review rather than erasing a ship',async()=>{
 const departure={title:'Lee A Tregurtha departed Duluth after winter layup',
  text:'Lee A Tregurtha departed Duluth after its winter layup at Fraser Shipyards.',
  date:'2027-03-16T15:00:00Z',url:'https://www.duluthharborcam.com/2027/03/lee-departed.html'};
 const payload=JSON.stringify({feed:{entry:[{title:{$t:departure.title},content:{$t:departure.text},published:{$t:departure.date},link:[{rel:'alternate',href:departure.url}]}]}});
 const fetcher=async url=>url.includes('duluthharborcam')?{ok:true,text:async()=>payload}:{ok:false,status:503};
 const archive={seasons:[{records:[{id:'lee-a-tregurtha',name:'Lee A. Tregurtha',identity:{key:'lee-a-tregurtha'},aliases:['Lee A Tregurtha']}]}]};
 const result=await f.refresh({ledger:s.freshSeason('2026-27'),archive,fetcher,now:'2027-03-17T00:00:00Z'});
 assert.equal(result.ledger.events.length,0);
 assert.ok(result.reviews.some(x=>x.url===departure.url));
});
