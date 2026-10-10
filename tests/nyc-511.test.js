'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeEvent,normalizeSign,matchCrossing,nextLink,getCached511,refresh511,EVENTS_URL,SIGNS_URL}=require('../lib/nyc-crossing/ny511');
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
   UPSTASH_REDIS_REST_URL:'https://redis.example',UPSTASH_REDIS_REST_TOKEN:'unit-redis-token'};
 const fetchImpl=async (url,opts={})=>{
   calls.push({url:String(url),headers:opts.headers||{},body:opts.body});
   if(url==='https://redis.example'){
     const [action,key,val,flag,n]=JSON.parse(opts.body);
     let result=null;
     if(action==='GET')result=store.get(key)||null;
     if(action==='SET'){
       if(flag==='NX'&&store.has(key))result=null;
       else{store.set(key,val);result='OK';}
     }
     return {ok:true,json:async()=>({result})};
   }
   if(String(url).startsWith('https://nysdot.carsprogram.org/')){
     return {ok:true,json:async()=>[event],headers:{get:()=>null}};
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
 const upstream=w.calls.filter(x=>x.url!==w.env.UPSTASH_REDIS_REST_URL);
 assert.equal(upstream.length,2);
 assert.ok(upstream.every(x=>x.headers.Authorization.startsWith('Basic ')));
 assert.ok(upstream.every(x=>!x.url.includes('unit-user')&&!x.url.includes('unit-pass')));
 const callsBefore=w.calls.length;
 const cache=await getCached511(w);
 assert.equal(w.calls.length,callsBefore+2);
 assert.equal(cache.crossings.gwb.incidentCount,1);
 assert.equal(cache.crossings.gwb.signCount,1);
 assert.equal(cache.crossings.gwb.penaltyPoints,7);
 assert.equal((await refresh511({...w,now:at})).state,'ALREADY_POLLED');
 assert.equal(w.calls.filter(x=>x.url!==w.env.UPSTASH_REDIS_REST_URL).length,2);
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
 const failingFetch=async(url,options)=>url===w.env.UPSTASH_REDIS_REST_URL?w.fetchImpl(url,options):Promise.reject(new Error('provider failed'));
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
