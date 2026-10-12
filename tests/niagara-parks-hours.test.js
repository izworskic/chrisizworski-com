'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalize,normalizeVenue,getCanadianHours,ENDPOINT}=require('../lib/niagara-falls/parks-hours.js');
const {plan}=require('../lib/niagara-falls/planner.js');
const {items,operating}=require('../lib/niagara-falls/catalog.js');
const reviewedAt='2026-10-12T14:00:00.000Z';
function row(id,name,slug,open,start,end){
 return {id,name,slug:[slug],hours:{open,opening_hours:start,closing_hours:end}};
}
function sample(journeyHours={open:true,opening_hours:'09:00:00',closing_hours:'19:00:00'},cruiseHours={open:true,opening_hours:'09:30:00',closing_hours:'16:30:00'}){
 const a=row(1072,'Journey Behind the Falls','visit/attractions/journey-behind-the-falls/',journeyHours.open,journeyHours.opening_hours,journeyHours.closing_hours);
 const b=row(1068,'Niagara City Cruises','visit/attractions/hornblower-niagara-cruises/',cruiseHours.open,cruiseHours.opening_hours,cruiseHours.closing_hours);
 return {attractions:[a,b]};
}
function planCA(date,extra={},payload=sample()){
 const official=normalize(payload,date,reviewedAt);
 return plan({visit_date:date,arrival_local:'10:00',duration_minutes:360,starting_side:'CA',priority:'boat',adults:2,youth:0,...extra},new Date(reviewedAt),official);
}
test('official Oct 12 publishes both attractions but Oct 13 cruise schedule differs',()=>{
 const day12=normalize(sample(undefined,{open:'1',opening_hours:'09:00:00',closing_hours:'20:00:00'}),'2026-10-12',reviewedAt);
 const day13=normalize(sample(),'2026-10-13',reviewedAt);
 assert.equal(day12.status,'PUBLISHED');assert.equal(day12.venues.cruise.close,'20:00');
 assert.equal(day13.venues.cruise.open,'09:30');assert.equal(day13.venues.cruise.close,'16:30');
 assert.equal(day13.venues.journey.close,'19:00');
});
test('published closed is distinct from unpublished false/null future placeholder',()=>{
 const closed=normalize(sample({open:false,opening_hours:'09:00:00',closing_hours:'16:00:00'},{open:false,opening_hours:'09:30:00',closing_hours:'19:30:00'}),'2026-12-25',reviewedAt);
 assert.equal(closed.venues.journey.status,'CLOSED');assert.equal(closed.venues.cruise.status,'CLOSED');
 assert.equal(operating(items.find(x=>x.id==='journey'),'2026-12-25',closed).status,'CLOSED');
 const unpublished=normalize(sample({open:false,opening:null,closing:null},{open:false,opening:null,closing:null}),'2027-04-15',reviewedAt);
 assert.equal(unpublished.status,'UNPUBLISHED');assert.equal(unpublished.venues.journey.status,'UNKNOWN');
 assert.equal(operating(items.find(x=>x.id==='journey'),'2027-04-15',unpublished).status,'UNKNOWN');
});
test('official date must match the requested date; one-day published hours never leak into another date',()=>{
 const feed=normalize(sample(),'2026-10-13',reviewedAt);
 assert.equal(operating(items.find(x=>x.id==='journey'),'2026-10-14',feed).status,'UNKNOWN');
 assert.equal(operating(items.find(x=>x.id==='journey'),'2026-10-13',feed).status,'PUBLISHED_SCHEDULE');
});
test('wrong operator identifier, spelling, duplicated id, or missing fields fail closed',()=>{
 let wrong=sample();wrong.attractions[0].slug=['not-the-authority'];let o=normalize(wrong,'2026-10-13',reviewedAt);
 assert.equal(o.venues.journey.status,'UNKNOWN');
 wrong=sample();wrong.attractions.push({...wrong.attractions[0]});o=normalize(wrong,'2026-10-13',reviewedAt);
 assert.equal(o.venues.journey.status,'UNKNOWN');
 wrong=sample({open:true,opening_hours:'noon',closing_hours:'evening'});o=normalize(wrong,'2026-10-13',reviewedAt);
 assert.equal(o.venues.journey.status,'UNKNOWN');
 assert.throws(()=>normalize({notAttractions:[]},'2026-10-13',reviewedAt));
});
test('Ontario itinerary uses official future-date boat hours without crossing borders',()=>{
 const r=planCA('2026-10-13');
 assert.equal(r.schedule_feed.status,'PUBLISHED');
 assert.equal(r.schedule_feed.requested_date,'2026-10-13');
 assert.equal(r.cross_border_auto_planned,false);
 assert.ok(r.stops.some(x=>x.id==='cruise'));
 assert.equal(r.stops.find(x=>x.id==='cruise').schedule.close,'16:30');
 assert.equal(r.costs[0].prices_complete,false);
});
test('after official cruise closing, the engine cannot recommend a cruise',()=>{
 const r=planCA('2026-10-13',{arrival_local:'17:00',duration_minutes:120});
 assert.ok(!r.stops.some(x=>x.id==='cruise'));
 assert.ok(r.excluded.some(x=>x.id==='cruise')||r.source_health.some(x=>x.entity_id==='cruise'&&x.status==='PUBLISHED_SCHEDULE'));
});
test('official closure never becomes a live attraction in a generated route',()=>{
 const r=planCA('2026-12-25',{},sample({open:false,opening_hours:'09:00:00',closing_hours:'16:00:00'},{open:false,opening_hours:'09:30:00',closing_hours:'19:30:00'}));
 assert.ok(r.stops.every(x=>x.type==='view'));
 assert.ok(r.excluded.some(x=>x.id==='journey'&&x.reason==='PUBLISHED_CLOSED'));
});
test('unknown future schedule does not become a confirmed closure',()=>{
 const r=planCA('2027-04-15',{},sample({open:false,opening:null,closing:null},{open:false,opening:null,closing:null}));
 assert.ok(r.excluded.some(x=>x.reason==='HOURS_NOT_VERIFIED'));
 assert.ok(!r.excluded.some(x=>x.reason==='PUBLISHED_CLOSED'));
});
test('date-specific schedule HTTP request and timestamp are preserved',async()=>{
 const called=[];const now=new Date('2026-10-12T14:00:00Z');
 const response=await getCanadianHours('2026-10-13',{fetcher:async(url)=>{called.push(url);return {ok:true,headers:{get:()=> '250000'},json:async()=>sample()};},now,useCache:false});
 assert.deepEqual(called,[ENDPOINT+'2026-10-13']);
 assert.equal(response.status,'PUBLISHED');
 assert.equal(response.checked_at,now.toISOString());
});
test('HTTP outage and malformed body degrade to unavailable, never an invented open',async()=>{
 const date='2026-10-14';
 for(const fetcher of [async()=>{throw Error('offline');},async()=>({ok:true,headers:{get:()=>null},json:async()=>({oops:[]})}),async()=>({ok:false,status:503,headers:{get:()=>null}})]){
  const response=await getCanadianHours(date,{fetcher,useCache:false});
  assert.equal(response.status,'SOURCE_UNAVAILABLE');assert.equal(response.checked_at,null);
 }
});
test('reject impossible date before issuing network requests',async()=>{
 let count=0;
 await assert.rejects(getCanadianHours('2026-02-30',{fetcher:async()=>{count++;}}));
 assert.equal(count,0);
});
