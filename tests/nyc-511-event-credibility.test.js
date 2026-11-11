'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeEvent,matchCrossing,getCached511,refresh511,EVENTS_URL,SIGNS_URL}=require('../lib/nyc-crossing/ny511');

const clock=Date.parse('2026-11-10T20:30:00Z');
const z=iso=>({time:Date.parse(iso),nanos:0,timeZoneId:'America/New_York',utcOffset:-18000000});
const location={'route-designator':'I-95',
 'primary-location':{'geo-location':{latitude:40.852,longitude:-73.955}}};
const event=()=>({'event-id':'CARS-bridge-1',status:'CURRENT',priority:5,
 headline:{category:'roadwork',code:'bridge maintenance'},
 description:'Bridge maintenance on the documented approach',
 'update-time':z('2026-11-10T20:24:00Z'),
 'update-expiry-time':z('2026-11-11T02:00:00Z'),
 details:[{'start-time':z('2026-11-10T20:00:00Z'),
 'end-time':z('2026-11-10T22:00:00Z'),
 locations:[location]}]});

test('CARS ZonedDateTime epoch milliseconds normalize to a real ISO event timestamp',()=>{
 const active=normalizeEvent(event(),clock);
 assert.equal(active.crossingId,'gwb');
 assert.equal(active.updatedAt,'2026-11-10T20:24:00.000Z');
 assert.equal(Number.isFinite(Date.parse(active.updatedAt)),true);
 assert.doesNotMatch(JSON.stringify(active),/\[object Object\]/);
 assert.equal(normalizeEvent(event(),Date.parse('2026-11-10T23:00:00Z')),null);
 assert.equal(normalizeEvent({...event(),status:'FUTURE'},clock),null);
 assert.equal(normalizeEvent({...event(),status:'CANCELLED'},clock),null);
 assert.equal(normalizeEvent({...event(),'update-time':{invalid:'shape'}},clock),null);
 assert.equal(normalizeEvent({...event(),'update-time':z('2026-11-11T12:00:00Z')},clock),null);
});

test('NYSDOT no-active-reporting condition is never a real incident',()=>{
 const noActive={...event(),headline:{category:'nysdot-road-conditions',code:'no active reporting'},
 description:'I-95 (George Washington Bridge): No Active Reporting.'};
 assert.equal(normalizeEvent(noActive,clock),null);
 assert.equal(normalizeEvent({...event(),description:'No Active Reporting for this section.'},clock),null);
 const closure=normalizeEvent({...event(),headline:{category:'closure',code:'closed'},
 description:'Lower level closed on the bridge'},clock);
 assert.equal(closure.penaltyPoints,12);
});

test('stale police-activity records and open HOV operations cannot become live incidents',()=>{
 const stale={...event(),headline:{category:'obstruction',code:'police activity'},
   description:'I-278 bridge: police activity',priority:4,
   'update-time':z('2025-09-24T11:47:43Z')};
 assert.equal(normalizeEvent(stale,clock),null);
 const benign={...event(),headline:{category:'obstruction',code:'police activity'},
   description:'Verrazzano high occupancy lane open, no lane obstruction'};
 assert.equal(normalizeEvent(benign,clock),null);
 const current={...event(),headline:{category:'obstruction',code:'police activity'},
   description:'Police response is blocking a lane near the crossing'};
 assert.equal(normalizeEvent(current,clock).crossingId,'gwb');
});
test('active detail selection avoids future detail location and chooses current detail',()=>{
 const future={'start-time':z('2026-11-11T09:00:00Z'),
   'end-time':z('2026-11-11T12:00:00Z'),locations:[{
      'route-designator':'I-95','primary-location':{'geo-location':{latitude:40.852,longitude:-73.955}}}]};
 const nowDetail={'start-time':z('2026-11-10T19:00:00Z'),
   'end-time':z('2026-11-10T22:00:00Z'),locations:[{
      'route-designator':'I-495','primary-location':{'geo-location':{latitude:40.744,longitude:-73.963}}}]};
 const e={...event(),details:[future,nowDetail]};
 assert.equal(normalizeEvent(e,clock).crossingId,'queens-midtown');
 assert.equal(normalizeEvent({...event(),details:[future]},clock),null);
});

test('crossing advisories reject distant approach work but retain near-bridge incidents',()=>{
 assert.equal(matchCrossing('I-95',[40.816,-73.900]),null);
 assert.equal(matchCrossing('I-95',[40.852,-73.955]),'gwb');
 assert.equal(matchCrossing('',[40.852,-73.955]),'gwb');
 assert.equal(matchCrossing('',[40.830,-73.925]),null);
});

function world(){
 const store=new Map(),env={NY511_USERNAME:'test-user',NY511_PASSWORD:'test-password',
 TOOL_STATE_URL:'https://state.example',VERCEL_OIDC_TOKEN:'test-token'};
 const fetchImpl=async (url,opts={})=>{
   if(url===env.TOOL_STATE_URL){
     const [op,key,value,flag]=JSON.parse(opts.body);
     if(op==='GET')return {ok:true,json:async()=>({result:store.get(key)||null})};
     if(op==='SET'){let result='OK';if(flag==='NX'&&store.has(key))result=null;
       else store.set(key,value);return {ok:true,json:async()=>({result})};}
   }
   if(String(url).startsWith(EVENTS_URL)){
     const query=new URL(url);
     return {ok:true,json:async()=>query.searchParams.get('routeDesignator')==='I-95'?[event()]:[],headers:{get:()=>null}};
   }
   if(String(url)===SIGNS_URL)return {ok:true,json:async()=>[],headers:{get:()=>null}};
   throw Error('Unexpected test request');
 };
 return {store,env,fetchImpl};
}

test('mixed cached CARS incidents remove stale HOV messages without erasing a verified closure',async()=>{
 const w=world();
 await refresh511({...w,now:clock});
 const key='nyc:511ny:events:v1',record=JSON.parse(w.store.get(key));
 const existing=record.items[0];
 existing.category='closure';existing.code='closed';
 record.items.push({...existing,id:'HOV-OPEN-2025',category:'obstruction',code:'police activity',
   description:'Verrazzano high occupancy lane open',updatedAt:'2025-09-24T11:47:43.000Z'});
 w.store.set(key,JSON.stringify(record));
 const snapshot=await getCached511(w);
 assert.ok(snapshot.events.updatedAt);
 assert.equal(snapshot.events.items.length,1);
 assert.equal(snapshot.crossings.gwb.incidentCount,1);
 assert.equal(snapshot.events.items[0].id,existing.id);
});
test('fresh feed has dated current incidents; old invalid cache and pseudo-events do not surface',async()=>{
 const w=world(),report=await refresh511({...w,now:clock});
 assert.equal(report.eventsStatus,'UPDATED');
 assert.equal(report.eventsCount,1);
 const initial=await getCached511(w);
 assert.equal(initial.crossings.gwb.incidentCount,1);
 assert.match(initial.events.items[0].updatedAt,/^2026-11-10T20:24/);
 const key='nyc:511ny:events:v1',record=JSON.parse(w.store.get(key));
 record.items[0].updatedAt='[object Object]';
 w.store.set(key,JSON.stringify(record));
 const unsafe=await getCached511(w);
 assert.equal(unsafe.events.updatedAt,null);
 assert.equal(unsafe.crossings.gwb.incidentCount,0);
 assert.ok(unsafe.signs.updatedAt);
 record.items[0].updatedAt='2026-11-10T20:24:00.000Z';
 record.items[0].code='no active reporting';
 w.store.set(key,JSON.stringify(record));
 const pseudo=await getCached511(w);
 assert.ok(pseudo.events.updatedAt);
 assert.equal(pseudo.events.items.length,0);
 assert.equal(pseudo.crossings.gwb.incidentCount,0);
});
