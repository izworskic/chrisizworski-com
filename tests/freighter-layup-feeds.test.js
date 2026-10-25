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
test('feed outages preserve published records, duplicate reports ignored',async()=>{const fetcher=async u=>u.includes('duluthharborcam')?{ok:true,text:async()=>feed()}:{ok:false,status:503};const archive={seasons:[{records:[{id:'lee-a-tregurtha',identity:{key:'lee-a-tregurtha'},name:'Lee A. Tregurtha',aliases:['Lee A Tregurtha']}]}]};const now='2027-01-17T00:00:00Z',one=await f.refresh({ledger:s.freshSeason('2026-27'),archive,fetcher,now});assert.equal(one.ledger.events.length,1);assert.equal(one.outcomes.filter(x=>!x.ok).length,f.SOURCES.length-1);const two=await f.refresh({ledger:one.ledger,archive,fetcher,now});assert.equal(two.changed,false);assert.equal(two.ledger.events.length,1)});

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

test('generic winter port roundups without named-ship headlines require source review',()=>{
 const known=[{key:'lee-a-tregurtha',name:'Lee A. Tregurtha',aliases:['Lee A Tregurtha']}];
 const source=f.SOURCES[0];
 const item={title:'Winter harbor traffic roundup',text:'Lee A Tregurtha arrived in Duluth for winter layup in Superior.',
   date:'2027-01-18T11:00:00Z',url:'https://www.duluthharborcam.com/2027/01/winter-roundup.html'};
 const d=f.classify(item,source,known,'2026-27');
 assert.equal(d.reason,'review');assert.equal(d.review.why,'ship_not_explicit_in_headline');
});


test('twenty monitored reporting inputs and separate human-review tiers are declared',()=>{
 const names=new Set(f.SOURCES.map(s=>s.id));
 assert.equal(f.SOURCES.length,20);
 assert.equal(names.size,20);
 for(const s of f.SOURCES){assert.match(s.url,/^https:\/\//);assert.ok(s.host);assert.ok(['publish','review'].includes(s.mode));}
 for(const id of ['interlake','hopa-news','thunder-bay-port','cleveland-port','shipwatcher','great-lakes-now','marinelink'])assert.ok(names.has(id),id);
 assert.equal(f.SOURCE_CATALOG.externalBoards.length,1);
});
test('a newspaper story that otherwise matches stays in source review, not the public ledger',async()=>{
 const src=f.SOURCES.find(s=>s.id==='boatnerd-news');
 const rss='<rss><item><title>Lee A Tregurtha arrived in Duluth for winter layup</title><link>https://www.boatnerd.com/winter-report/</link><pubDate>Mon, 15 Feb 2027 11:00:00 GMT</pubDate><description>Lee A Tregurtha arrived in Duluth for winter layup.</description></item></rss>';
 const fetcher=async url=>url===src.url?{ok:true,text:async()=>rss}:{ok:false,status:503};
 const archive={seasons:[{records:[{id:'lee-a-tregurtha',name:'Lee A. Tregurtha',identity:{key:'lee-a-tregurtha'},aliases:[]}]}]};
 const result=await f.refresh({ledger:s.freshSeason('2026-27'),archive,fetcher,now:'2027-02-16T12:00:00Z'});
 assert.equal(result.ledger.events.length,0);
 assert.ok(result.reviews.some(r=>r.url==='https://www.boatnerd.com/winter-report/'&&r.why==='editorial_review_required'));
});

test('expanded network polls at most four sources concurrently and preserves source-order results',async()=>{
 let busy=0,peak=0;
 const fetcher=async()=>{
  busy++;peak=Math.max(peak,busy);
  await new Promise(resolve=>setTimeout(resolve,2));
  busy--;
  return {ok:false,status:503};
 };
 const out=await f.refresh({ledger:s.freshSeason('2026-27'),archive:{seasons:[]},fetcher,now:'2027-01-01T12:00:00Z'});
 assert.ok(peak>=2,'polls are concurrent');
 assert.ok(peak<=4,'provider load is bounded');
 assert.deepEqual(out.outcomes.map(x=>x.source),f.SOURCES.map(x=>x.id));
 assert.equal(out.ledger.events.length,0);
});
test('an explicit dated Interlake operator report remains source-linked and is not an AIS inference',()=>{
 const operator=f.SOURCES.find(x=>x.id==='interlake');
 const vessel=[{name:'Lee A. Tregurtha',key:'lee-a-tregurtha',aliases:['Lee A Tregurtha']}];
 const article={title:'Lee A Tregurtha arrived in Duluth for winter layup',
  text:'Lee A Tregurtha berthed in Superior for winter layup.',
  date:'2027-01-19T11:00:00Z',
  url:'https://www.interlakesteamship.com/media/newsroom/lee-a-tregurtha-winter/'};
 const d=f.classify(article,operator,vessel,'2026-27');
 assert.equal(d.reason,'accepted');
 assert.equal(d.event.source.class,'operator');
 assert.equal(d.event.confidence,'reported');
 assert.equal(d.event.harborId,'superior');
});

test('the expanded source network includes US, Canada, owners and ship reporting',()=>{
 const ids=f.SOURCES.map(s=>s.id);
 assert.equal(ids.length,20);
 for(const id of ['boatnerd-port-news','shipwatcher','great-lakes-now','cleveland-port','thunder-bay-port','interlake','lca','algoma','boatnerd-roster'])
   assert.ok(ids.includes(id),id);
 assert.equal(new Set(ids).size,ids.length);
 for(const s of f.SOURCES){assert.ok(s.url.startsWith('https://'));assert.ok(s.host);assert.ok(s.publisher)}
});
test('broad harbor reporting creates review leads but no automatic layup records',async()=>{
 const source=f.SOURCES.find(s=>s.id==='boatnerd-port-news');
 const article={title:'Lee A Tregurtha arrived at Thunder Bay for winter layup',
   text:'Lee A Tregurtha arrived at the Port of Thunder Bay to begin winter layup.',
   date:'2027-01-16T12:00:00Z',url:'https://www.boatnerd.com/winter-arrival/'};
 const rss='<rss><channel><item><title>'+article.title+'</title><link>'+article.url+
   '</link><pubDate>Sat, 16 Jan 2027 12:00:00 GMT</pubDate><description>'+article.text+'</description></item></channel></rss>';
 const fetcher=async url=>url===source.url?{ok:true,text:async()=>rss}:{ok:false,status:503};
 const archive={seasons:[{records:[{id:'lee-a-tregurtha',name:'Lee A. Tregurtha',identity:{key:'lee-a-tregurtha'},aliases:['Lee A Tregurtha']}]}]};
 const result=await f.refresh({ledger:s.freshSeason('2026-27'),archive,fetcher,now:'2027-01-17T00:00:00Z'});
 assert.equal(result.ledger.events.length,0);
 assert.ok(result.reviews.some(x=>x.url===article.url&&x.why==='editorial_review_required'));
 assert.ok(result.outcomes.find(x=>x.source===source.id)?.reviewed===1);
});
test('exact seasonal BoatNerd roster URL is found but a previous winter is rejected',()=>{
 const html='<html><a href="https://www.boatnerd.com/winter-lay-up-list-2025-2026/">Winter Lay-Up List 2025-2026</a>'+
  '<a href="/winter-lay-up-list-2026-2027/">Winter Lay-Up List 2026-2027</a></html>';
 assert.equal(f.discoverWinterRoster(html,'2026-27'),'https://www.boatnerd.com/winter-lay-up-list-2026-2027/');
 assert.equal(f.discoverWinterRoster('<a href="/winter-lay-up-list-2025-2026/">Winter Lay-Up List 2025-2026</a>','2026-27'),null);
 assert.equal(f.discoverWinterRoster('<a href="https://attacker.example/winter-lay-up-list-2026-2027/">Winter Lay-Up List 2026-2027</a>','2026-27'),null);
});
test('winter roster discovery does not promote any vessel to confirmed automatically',async()=>{
 const roster=f.SOURCES.find(x=>x.id==='boatnerd-roster');
 const fetcher=async url=>url===roster.url?{ok:true,text:async()=>'<a href="/winter-lay-up-list-2026-2027/">Winter Lay-Up List 2026-2027</a>'}:{ok:false,status:503};
 const result=await f.refresh({ledger:s.freshSeason('2026-27'),archive:{seasons:[]},fetcher,now:'2027-01-04T10:00:00Z'});
 assert.equal(result.ledger.events.length,0);
 assert.ok(result.reviews.some(x=>x.why==='winter_roster_discovered'&&x.url.includes('2026-2027')));
});

test('regional news discovery can generate leads but cannot certify a vessel',async()=>{
 const source=f.SOURCES.find(x=>x.id==='news-sarnia-stclair');
 assert.equal(source.mode,'review');
 const story={title:'Lee A Tregurtha arrived for winter layup in Sarnia',
 text:'Lee A Tregurtha docked in Sarnia for winter layup.',date:'2027-01-18T12:00:00Z',
 url:'https://news.google.com/rss/articles/fictional-source-test-only'};
 const rss='<rss><channel><item><title>'+story.title+'</title><link>'+story.url+
 '</link><pubDate>Mon, 18 Jan 2027 12:00:00 GMT</pubDate><description>'+story.text+'</description></item></channel></rss>';
 const fetcher=async url=>url===source.url?{ok:true,text:async()=>rss}:{ok:false,status:503};
 const archive={seasons:[{records:[{id:'lee-a-tregurtha',identity:{key:'lee-a-tregurtha'},name:'Lee A. Tregurtha',aliases:['Lee A Tregurtha']}]}]};
 const result=await f.refresh({ledger:s.freshSeason('2026-27'),archive,fetcher,now:'2027-01-19T00:00:00Z'});
 assert.equal(result.ledger.events.length,0);
 assert.ok(result.reviews.some(x=>x.url===story.url&&x.why==='editorial_review_required'));
});

test('two independent specialist reports create one sourced reported arrival, never confirmed',async()=>{
 const ship='Lee A Tregurtha',title=ship+' arrived for winter layup in Superior';
 const first=f.SOURCES.find(x=>x.id==='boatnerd-port-news');
 const second=f.SOURCES.find(x=>x.id==='shipwatcher');
 const make=(url,date)=>'<rss><channel><item><title>'+title+'</title><link>'+url+'</link><pubDate>'+date+
  '</pubDate><description>'+ship+' docked for winter layup in Superior.</description></item></channel></rss>';
 const oneUrl='https://www.boatnerd.com/lee-layup/',twoUrl='https://shipwatcher-news.com/lee-layup/';
 const fetcher=async url=>url===first.url?{ok:true,text:async()=>make(oneUrl,'Sat, 16 Jan 2027 12:00:00 GMT')}:
   url===second.url?{ok:true,text:async()=>make(twoUrl,'Sun, 17 Jan 2027 12:00:00 GMT')}:{ok:false,status:503};
 const archive={seasons:[{records:[{id:'lee-a-tregurtha',name:'Lee A. Tregurtha',aliases:['Lee A Tregurtha'],identity:{key:'lee-a-tregurtha'}}]}]};
 const start=s.freshSeason('2026-27'),result=await f.refresh({ledger:start,archive,fetcher,now:'2027-01-18T00:00:00Z'});
 assert.equal(result.ledger.events.length,1);
 const event=result.ledger.events[0];
 assert.equal(event.confidence,'reported');
 assert.equal(event.kind,'arrival');
 assert.equal(event.supportingSources.length,1);
 assert.notEqual(new URL(event.source.url).hostname,new URL(event.supportingSources[0].url).hostname);
 assert.ok(event.summary.includes('different publisher domains'));
 const again=await f.refresh({ledger:result.ledger,archive,fetcher,now:'2027-01-19T00:00:00Z'});
 assert.equal(again.changed,false);assert.equal(again.ledger.events.length,1);
});
test('two regional news searches cannot corroborate and invent a laid-up vessel',()=>{
 const known=[{key:'lee-a-tregurtha',name:'Lee A. Tregurtha',aliases:['Lee A Tregurtha']}];
 const mk=id=>({source:{kind:'discovery'},event:{vessel:{key:known[0].key,name:known[0].name},kind:'arrival',
  harborId:'sarnia',date:'2027-01-17',source:{url:'https://news.google.com/rss/articles/'+id,title:'Lee A Tregurtha arrived for winter layup in Sarnia',publisher:'Regional Discovery',class:'journalistic_report'}}});
 assert.equal(f.corroborate([mk('a'),mk('b')],known,s.freshSeason('2026-27'),'2027-01-18T00:00:00Z').length,0);
});
test('independent reports more than three days apart do not auto corroborate',()=>{
 const known=[{key:'lee-a-tregurtha',name:'Lee A. Tregurtha',aliases:['Lee A Tregurtha']}];
 const mk=(host,date)=>({source:{kind:'maritime'},event:{vessel:{key:known[0].key,name:known[0].name},kind:'arrival',
  harborId:'superior',date,source:{url:'https://'+host+'/report',title:'Lee A Tregurtha arrived for winter layup at Superior',publisher:host,class:'journalistic_report'}}});
 assert.equal(f.corroborate([mk('boatnerd.com','2027-01-02'),mk('shipwatcher-news.com','2027-01-10')],known,s.freshSeason('2026-27'),'2027-01-11T00:00:00Z').length,0);
});
