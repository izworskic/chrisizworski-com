'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeEvent,normalizeSign,matchCrossing,nextLink,getCached511,getPollHealth,refresh511,EVENTS_URL,EVENT_ROUTES,SIGNS_URL,eventsPage}=require('../lib/nyc-crossing/ny511');
const {buildSnapshot}=require('../lib/nyc-crossing/engine');
const fs=require('node:fs');
const path=require('node:path');
const event={ 'event-id':'nyc-1',description:'Crash blocks right lane',priority:1,
 headline:{category:'Incident',code:'Crash'},
 locations:[{'route-designator':'I-95','link-direction':'northbound',
 'primary-location':{'geo-location':{latitude:40.852,longitude:-73.955}}}],
 details:{'start-time':'2026-10-09T10:00:00Z','end-time':'2026-10-10T10:00:00Z','update-time':'2026-10-09T20:00:00Z'}};
const at=Date.parse('2026-10-09T21:00:00Z');
test('migration guide TMDD 3.0 fields map to GWB incident and priority penalty',()=>{
 const r=normalizeEvent(event,at);
 assert.equal(r.crossingId,'gwb');assert.equal(r.id,'nyc-1');
 assert.equal(r.category,'Incident');assert.equal(r.code,'Crash');
 assert.equal(r.priority,1);assert.equal(r.penaltyPoints,7);
 assert.equal(r.direction,'northbound');
});
test('future, expired and non-NYC roadway events are not active',()=>{
 assert.equal(normalizeEvent(event,Date.parse('2026-10-11T12:00:00Z')),null);
 assert.equal(normalizeEvent(event,Date.parse('2026-10-08T12:00:00Z')),null);
 const far={...event,locations:[{'route-designator':'I-95',
 'primary-location':{'geo-location':{latitude:42.8,longitude:-73.7}}}]};
 assert.equal(normalizeEvent(far,at),null);
});
test('routeId chooses corridor before proximity fallback; off-corridor points rejected',()=>{
 assert.equal(matchCrossing('I-495',[40.761,-74.005]),'lincoln');
 assert.equal(matchCrossing('I-495',[40.744,-73.963]),'queens-midtown');
 assert.equal(matchCrossing('',[42.5,-75]),null);
});
test('current nested TMDD CARS Detail locations, geometry and full-report text match NYC crossings',()=>{
 const nested={'event-id':'nested-1',headline:{category:'Incident',code:'Crash'},priority:2,
   'update-time':'2026-11-10T09:03:00Z',
   'full-report-texts':[{'report-medium':'CURRENT',description:'Right lane blocked'}],
   details:[{'start-time':'2026-11-10T08:00:00Z','end-time':'2026-11-10T11:00:00Z',
     locations:[{'route-designator':'I-495','primary-location':{'geo-location':{latitude:40.744,longitude:-73.963}}}]}]};
 const r=normalizeEvent(nested,Date.parse('2026-11-10T09:30:00Z'));
 assert.equal(r.crossingId,'queens-midtown');
 assert.equal(r.description,'Right lane blocked');
 assert.equal(r.updatedAt,'2026-11-10T09:03:00.000Z');
 assert.equal(r.penaltyPoints,7);
 assert.equal(normalizeEvent(nested,Date.parse('2026-11-10T11:01:00Z')),null);
 const geo={...nested,details:[{locations:[]}],geometry:{type:'Point',coordinates:[-73.963,40.744]},routeId:'I-495'};
 assert.equal(normalizeEvent(geo,Date.parse('2026-11-10T09:30:00Z')).crossingId,'queens-midtown');
});
test('CARS ZonedDateTime epoch-millisecond objects format as ISO and gate future work',()=>{
 const now=Date.parse('2026-11-10T20:30:00-05:00');
 const incident={...event,'update-time':{time:now-15*60*1000,utcOffset:-18000,timeZoneId:'America/New_York'},
   details:[{'start-time':{time:now-60*60*1000,utcOffset:-18000},
     'end-time':{time:now+60*60*1000,utcOffset:-18000},locations:event.locations}]};
 const current=normalizeEvent(incident,now);
 assert.ok(current);
 assert.equal(current.updatedAt,new Date(now-15*60*1000).toISOString());
 assert.doesNotMatch(current.updatedAt,/\[object Object\]/);
 const future=structuredClone(incident);
 future.details[0]['start-time'].time=now+60*60*1000;
 assert.equal(normalizeEvent(future,now),null);
 const expired=structuredClone(incident);
 expired.details[0]['end-time'].time=now-1;
 assert.equal(normalizeEvent(expired,now),null);
});
test('planned reports, no-active-reporting status and future roadwork cannot create false bridge incidents',()=>{
 const now=Date.parse('2026-11-11T01:30:00Z');
 const base={...event,details:[{'start-time':{time:now-3600000},'end-time':{time:now+3600000},locations:event.locations}]};
 assert.equal(normalizeEvent({...base,category:'PLANNED'},now),null);
 assert.equal(normalizeEvent({...base,category:'FORECAST'},now),null);
 assert.equal(normalizeEvent({...base,status:'REOPENED'},now),null);
 assert.equal(normalizeEvent({...base,headline:{category:'nysdot-road-conditions',code:'no active reporting'}},now),null);
 assert.equal(normalizeEvent({...base,description:'I-95 no active reporting on roadway'},now),null);
 const plannedReport={...base,'full-report-texts':[{'report-medium':'PLANNED',description:'Closure on Wednesday'}]};
 assert.equal(normalizeEvent(plannedReport,now),null);
});
test('recurring construction appears only in its documented active occurrence',()=>{
 const now=Date.parse('2026-11-11T01:30:00Z');
 const detail={'start-time':{time:now-3600000},'end-time':{time:now+86400000},
   'recurrent-times':[{'time-zone':'America/New_York',period:{'days-of-week':{bits:127}}}],
   locations:event.locations};
 const planned={...event,headline:{category:'roadwork',code:'roadwork'},details:[detail]};
 assert.equal(normalizeEvent(planned,now),null,'date range alone is not a 24-hour lane closure');
 const future=structuredClone(planned);
 future.details[0].scheduleOccurrences=[{startTime:{time:now+3600000},endTime:{time:now+7200000}}];
 assert.equal(normalizeEvent(future,now),null);
 const current=structuredClone(planned);
 current.details[0].scheduleOccurrences=[{startTime:{time:now-900000},endTime:{time:now+900000}}];
 const active=normalizeEvent(current,now);
 assert.equal(active.crossingId,'gwb');
 assert.equal(active.category,'roadwork');
 const unknown=structuredClone(planned);
 unknown.details[0].scheduleOccurrences=[{startTime:{time:'bad'},endTime:{time:now+900000}}];
 assert.equal(normalizeEvent(unknown,now),null);
});
test('a seven-kilometer I-95 advisory must not masquerade as a George Washington Bridge event',()=>{
 const near=event;
 const distant={...event,locations:[{'route-designator':'I-95',
   'primary-location':{'geo-location':{latitude:40.901,longitude:-73.950}}}]};
 assert.equal(normalizeEvent(near,at).crossingId,'gwb');
 assert.equal(normalizeEvent(distant,at),null);
});
test('route-designator filtered pagination retains crossing and rejects another source route',()=>{
 for(const route of EVENT_ROUTES){
   const page=eventsPage(route);
   assert.equal(new URL(page).searchParams.get('routeDesignator'),route);
   assert.equal(new URL(page).searchParams.get('offset'),'0');
 }
 const next=eventsPage('I-95').replace('offset=0','offset=200');
 assert.equal(nextLink('<'+next+'>; rel="next"','I-95'),next);
 assert.throws(()=>nextLink('<'+next+'>; rel="next"','I-278'),/route changed/);
 assert.throws(()=>nextLink('<https://attacker.example/events>; rel="next"','I-95'),/origin/);
});
test('sign phases are matched and text is sanitized for display',()=>{
 const sign={id:'sign-12',status:'active',location:{latitude:40.761,longitude:-74.005,routeId:'I-495'},
 messages:[{phases:[{text:'<b>LINCOLN TUNNEL</b>'},{text:'LEFT LANE CLOSED'}]}]};
 const normalized=normalizeSign(sign);
 assert.equal(normalized.crossingId,'lincoln');
 assert.match(normalized.message,/LEFT LANE CLOSED/);
 assert.doesNotMatch(normalized.message,/<b>/);
 assert.equal(normalizeSign({...sign,status:'offline'}),null);
});
test('link pagination follows next and rejects origin changes',()=>{
 assert.equal(nextLink('<https://nysdot.carsprogram.org/carsapi_v1/api/events?limit=100&offset=100>; rel="next"'),
 'https://nysdot.carsprogram.org/carsapi_v1/api/events?limit=100&offset=100');
 assert.equal(nextLink(''),null);
 assert.throws(()=>nextLink('<https://attacker.example/steal>; rel="next"'),/origin/);
});
function mockWorld(){
 const store=new Map(),calls=[];const env={NY511_USERNAME:'unit-user',NY511_PASSWORD:'unit-pass',
   TOOL_STATE_URL:'https://state.example',VERCEL_OIDC_TOKEN:'unit-redis-token'};
 const fetchImpl=async (url,opts={})=>{
   calls.push({url:String(url),headers:opts.headers||{},body:opts.body});
   if(url==='https://state.example'){
     const [action,key,val,flag,n]=JSON.parse(opts.body);
     let result=null;
     if(action==='GET')result=store.get(key)||null;
     if(action==='SET'){
       if(flag==='NX'&&store.has(key))result=null;
       else{store.set(key,val);result='OK';}
     }
     return {ok:true,json:async()=>({result})};
   }
   if(String(url).startsWith(EVENTS_URL)){
     const u=new URL(url);
     assert(EVENT_ROUTES.includes(u.searchParams.get('routeDesignator')));
     assert.equal(u.searchParams.get('limit'),'200');
     return {ok:true,json:async()=>u.searchParams.get('routeDesignator')==='I-95'?[event]:[],headers:{get:()=>null}};
   }
   if(url===SIGNS_URL){
     return {ok:true,json:async()=>[{id:'s1',status:'active',location:{latitude:40.852,longitude:-73.955,routeId:'I-95'},
       messages:[{phases:[{text:'GWB: EXPECT DELAYS'}]}]}],headers:{get:()=>null}};
   }
   throw Error('Unexpected upstream');
 };
 return {store,calls,env,fetchImpl};
}
test('cron refresh stores successful feeds and subsequent reads contact Redis only',async()=>{
 const w=mockWorld();
 // Use the fixture's observation time, not the CI runner wall clock.
 const first=await refresh511({...w,now:at});
 assert.equal(first.state,'UPDATED');assert.equal(first.eventsCount,1);assert.equal(first.signsCount,1);
 const upstream=w.calls.filter(x=>x.url!==w.env.TOOL_STATE_URL);
 assert.equal(upstream.length,EVENT_ROUTES.length+1);
 assert.ok(upstream.every(x=>x.headers.Authorization.startsWith('Basic ')));
 assert.ok(upstream.every(x=>!x.url.includes('unit-user')&&!x.url.includes('unit-pass')));
 const callsBefore=w.calls.length;
 const cache=await getCached511(w);
 assert.equal(w.calls.length,callsBefore+2);
 assert.equal(cache.crossings.gwb.incidentCount,1);
 assert.equal(cache.crossings.gwb.signCount,1);
 assert.equal(cache.crossings.gwb.penaltyPoints,7);
 assert.equal((await refresh511({...w,now:at})).state,'ALREADY_POLLED');
 assert.equal(w.calls.filter(x=>x.url!==w.env.TOOL_STATE_URL).length,EVENT_ROUTES.length+1);
});
test('refresh excludes expired incidents but still fetches sign messages at a fixed clock',async()=>{
 const w=mockWorld();
 const expiredAt=Date.parse('2026-10-11T12:00:00Z');
 const summary=await refresh511({...w,now:expiredAt});
 assert.equal(summary.state,'UPDATED');
 assert.equal(summary.eventsCount,0);
 assert.equal(summary.signsCount,1);
 const cache=await getCached511(w);
 assert.equal(cache.crossings.gwb.incidentCount,0);
 assert.equal(cache.crossings.gwb.signCount,1);
});
test('missing credentials never poll; poll failure retains stale cache',async()=>{
 const w=mockWorld();
 assert.equal((await refresh511({env:{},fetchImpl:w.fetchImpl})).state,'NOT_CONFIGURED');
 await refresh511({...w,now:at});
 // Simulate feed records from previous successful run with a stale timestamp.
 for(const key of ['nyc:511ny:events:v1','nyc:511ny:signs:v1']){
   const v=JSON.parse(w.store.get(key));v.updatedAt='2026-09-01T00:00:00Z';
   w.store.set(key,JSON.stringify(v));
 }
 w.store.delete('nyc:511ny:refresh-lock:v1');
 const failingFetch=async(url,options)=>url===w.env.TOOL_STATE_URL?w.fetchImpl(url,options):Promise.reject(new Error('provider failed'));
 const failed=await refresh511({env:w.env,fetchImpl:failingFetch,now:at});
 assert.equal(failed.state,'STALE_CACHE');
 const cached=await getCached511(w);
 assert.equal(cached.state,'STALE');
 assert.equal(cached.crossings.gwb.incidentCount,1);
});
test('cache failures return safe timeout diagnostics without exposing credentials',async()=>{
 const w=mockWorld();
 const cacheFailure=async()=>{const error=new Error('do not print sensitive infrastructure detail');error.name='TimeoutError';throw error;};
 const snapshot=await getCached511({env:w.env,fetchImpl:cacheFailure});
 assert.equal(snapshot.state,'CACHE_UNAVAILABLE');
 assert.equal(snapshot.cacheIssue,'TIMEOUT');
 assert.doesNotMatch(JSON.stringify(snapshot),/sensitive infrastructure|unit-redis-token/);
 const poll=await refresh511({env:w.env,fetchImpl:cacheFailure});
 assert.equal(poll.state,'CACHE_UNAVAILABLE');
 assert.equal(poll.reason,'CACHE_TIMEOUT');
});
test('partial 511NY poll identifies failed events separately from fresh signs without exposing request details',async()=>{
 const w=mockWorld();
 const onlyEventsFail=async(url,opts)=>{
   if(String(url).startsWith('https://nysdot.carsprogram.org/')){
     return {ok:false,status:503,json:async()=>({}),headers:{get:()=>null}};
   }
   return w.fetchImpl(url,opts);
 };
 const result=await refresh511({...w,fetchImpl:onlyEventsFail,now:at});
 assert.equal(result.state,'PARTIAL');
 assert.equal(result.eventsStatus,'UPSTREAM_HTTP_503');
 assert.equal(result.signsStatus,'UPDATED');
 assert.equal(result.eventsCount,null);
 assert.equal(result.signsCount,1);
 assert.equal(result.healthStored,true);
 const health=await getPollHealth(w);
 assert.equal(health.eventsStatus,'UPSTREAM_HTTP_503');
 assert.equal(health.signsStatus,'UPDATED');
 assert.equal(health.eventsCount,null);
 assert.doesNotMatch(JSON.stringify(health),/unit-user|unit-pass|carsprogram.org|provider failed/);
 assert.doesNotMatch(JSON.stringify(result),/unit-user|unit-pass|carsprogram.org/);
 const snapshot=await getCached511(w);
 assert.equal(snapshot.state,'STALE');
 assert.equal(snapshot.events.updatedAt,null);
 assert.ok(snapshot.signs.updatedAt);
});

async function render511InBrowser(snapshot){
 const vm=require('node:vm');
 const src=fs.readFileSync(path.join(__dirname,'../public/assets/nyc-crossing.js'),'utf8');
 const nodes=Object.fromEntries(['crossingForm','results','answer','trafficStatus','departureIntelligence'].map(id=>[
   id,{innerHTML:'',textContent:'',className:'',addEventListener(){}}
 ]));
 class FormDataStub{*[Symbol.iterator](){}}
 const browser={
   document:{getElementById:id=>nodes[id],hidden:false},
   Intl,Date,Math,URLSearchParams,FormData:FormDataStub,
   fetch:async()=>({ok:true,json:async()=>snapshot}),
   setInterval:()=>0,
 };
 vm.runInNewContext(src,browser);
 await new Promise(resolve=>setImmediate(resolve));
 return nodes;
}

test('unsuccessful event cache writes never claim a current incident snapshot',async()=>{
 const w=mockWorld();
 const failingSet=async(url,opts)=>{
   if(url===w.env.TOOL_STATE_URL){
     const cmd=JSON.parse(opts.body);
     if(cmd[0]==='SET'&&cmd[1]==='nyc:511ny:events:v1')
       return {ok:true,json:async()=>({result:null})};
   }
   return w.fetchImpl(url,opts);
 };
 const report=await refresh511({...w,fetchImpl:failingSet,now:at});
 assert.equal(report.state,'PARTIAL');
 assert.equal(report.eventsStatus,'CACHE_WRITE_FAILED');
 assert.equal(report.signsStatus,'UPDATED');
 assert.equal((await getCached511(w)).events.updatedAt,null);
});
test('full CARS event page without pagination metadata is not cached as complete',async()=>{
 const w=mockWorld();
 const truncated=async(url,opts)=>{
   if(String(url).startsWith(EVENTS_URL)&&new URL(url).searchParams.get('routeDesignator')==='I-95')
     return {ok:true,json:async()=>Array.from({length:200},()=>event),headers:{get:()=>null}};
   return w.fetchImpl(url,opts);
 };
 const report=await refresh511({...w,fetchImpl:truncated,now:at});
 assert.equal(report.state,'PARTIAL');
 assert.equal(report.eventsStatus,'PAGINATION_INCOMPLETE');
 assert.equal((await getCached511(w)).events.updatedAt,null);
});
test('upstream authorization failure does not invent an empty incident list',async()=>{
 const w=mockWorld();
 const unauth=async(url,opts)=>{
   if(String(url).startsWith(EVENTS_URL))return {ok:false,status:401,json:async()=>({})};
   return w.fetchImpl(url,opts);
 };
 const report=await refresh511({...w,fetchImpl:unauth,now:at});
 assert.equal(report.eventsStatus,'UPSTREAM_HTTP_401');
 assert.equal((await getPollHealth(w)).eventsStatus,'UPSTREAM_HTTP_401');
 assert.equal((await getCached511(w)).events.updatedAt,null);
});
test('sign-only 511NY refresh never repeats the incident-feed placeholder across crossing rows',async()=>{
 const now=new Date().toISOString();
 const snapshot=buildSnapshot({ny511:{
   state:'STALE',updatedAt:now,
   events:{updatedAt:null,items:[]},
   signs:{updatedAt:now,items:[]},
   crossings:{}
 }});
 const nodes=await render511InBrowser(snapshot);
 assert.doesNotMatch(nodes.results.innerHTML,/Incident feed awaiting first update|mapped 511NY incident/);
 assert.equal((nodes.answer.innerHTML.match(/511NY incident updates are not verified right now/g)||[]).length,1);
 assert.match(nodes.answer.innerHTML,/https:\/\/511ny.org\//);
 assert.equal((nodes.results.innerHTML.match(/class="disruption"/g)||[]).length,0);
});

test('fresh 511NY events and signs appear only on affected crossings; stale incidents are suppressed',async()=>{
 const now=new Date().toISOString();
 const sample={gwb:{
   incidentCount:1,events:[{category:'Incident',description:'Verified roadway closure'}],
   signCount:1,signs:[{message:'LEFT LANE CLOSED'}],penaltyPoints:12
 }};
 const live=buildSnapshot({ny511:{
   state:'LIVE',updatedAt:now,events:{updatedAt:now},signs:{updatedAt:now},crossings:sample
 }});
 const fresh=await render511InBrowser(live);
 assert.equal((fresh.results.innerHTML.match(/class="disruption"/g)||[]).length,1);
 assert.match(fresh.results.innerHTML,/Verified roadway closure/);
 assert.match(fresh.results.innerHTML,/nearby 511NY road advisor/);
 assert.doesNotMatch(fresh.results.innerHTML,/mapped 511NY incident/);
 assert.match(fresh.results.innerHTML,/LEFT LANE CLOSED/);
 assert.doesNotMatch(fresh.results.innerHTML,/Incident feed awaiting first update/);
 const stale=buildSnapshot({ny511:{
   state:'STALE',updatedAt:now,events:{updatedAt:'2026-01-01T00:00:00Z'},signs:{updatedAt:now},crossings:sample
 }});
 const partial=await render511InBrowser(stale);
 assert.doesNotMatch(partial.results.innerHTML,/Verified roadway closure|mapped 511NY incident/);
 assert.match(partial.results.innerHTML,/LEFT LANE CLOSED/);
});

test('incident layer is additive and cannot fabricate incomparable fastest routes',()=>{
 const incident={state:'LIVE',updatedAt:new Date().toISOString(),events:{updatedAt:new Date().toISOString()},signs:{updatedAt:new Date().toISOString()},
 crossings:{gwb:{incidentCount:1,events:[{description:'Crash'}],penaltyPoints:7,signCount:0,signs:[]}}};
 const s=buildSnapshot({ny511:incident,traffic:{state:'PARTIAL',routes:[{crossingId:'gwb',etaMinutes:6}],comparable:false}});
 assert.equal(s.routes.find(r=>r.id==='gwb').disruptionPenaltyPoints,7);
 assert.equal(s.fastest,null);assert.equal(s.preferred,null);
 const comparison=buildSnapshot({ny511:incident,traffic:{state:'LIVE',routes:[{crossingId:'gwb',etaMinutes:6},{crossingId:'lincoln',etaMinutes:8}],comparable:true}});
 assert.equal(comparison.fastest.id,'gwb'); // raw ETA preserved
 assert.equal(comparison.preferred.id,'lincoln'); // incident advisory penalty in comparable ranking
});
test('stale incidents stay visible but do not affect ranking decisions',()=>{
 const outdated='2026-09-01T00:00:00Z';
 const s=buildSnapshot({ny511:{state:'STALE',updatedAt:outdated,events:{updatedAt:outdated},signs:{updatedAt:outdated},
   crossings:{gwb:{incidentCount:1,penaltyPoints:12,events:[{description:'old closure'}],signCount:0,signs:[]}}},
   traffic:{state:'PARTIAL',routes:[{crossingId:'gwb',etaMinutes:10}],comparable:false}});
 const gwb=s.routes.find(r=>r.id==='gwb');
 assert.equal(gwb.disruption.incidentCount,1);
 assert.equal(gwb.disruptionPenaltyPoints,0);
 assert.equal(s.ny511.state,'STALE');
});
test('canonical route and sitemap untouched, cron protected and credentials absent from client',()=>{
 const root=path.join(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'public/nyc-crossing/index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'public/assets/nyc-crossing.js'),'utf8');
 const vercel=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/nyc-crossing\/"/);
 assert.ok(vercel.crons.some(c=>c.path==='/api/flight-assignment?flightV3=1&action=cron'&&c.schedule==='*/5 * * * *'));
 assert.ok(!vercel.crons.some(c=>c.path==='/api/nyc-511?action=cron'));
 const cronSource=fs.readFileSync(path.join(root,'lib/flight-v3.js'),'utf8');
 assert.match(cronSource,/nyc-crossing\/ny511'\)\.refresh511\(\)/);
 assert.doesNotMatch(js,/nysdot\.carsprogram|nyapi\.carsprogram|NY511_USERNAME|NY511_PASSWORD/);
 assert.ok(!('username' in require('../lib/nyc-crossing/ny511')));
});
