'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {buildSnapshot,chargeFor,CROSSINGS}=require('../lib/nyc-crossing/engine');
const {
  normalizeTraffic,
  normalizeNycdotTraffic,
  mergeTraffic,
  fetchTraffic,
  normalizeMapboxResponse,
  fetchMapboxTraffic,
  MAPBOX_PROBES,
  MAPBOX_CACHE_TIMEOUT_MS,
  MAPBOX_ROUTE_TIMEOUT_MS,
  NYCDOT_LINKS,
  _internal: trafficInternal
}=require('../lib/nyc-crossing/traffic');

test('peak Lincoln applies toll, zone charge and crossing credit',()=>{
  const r=chargeFor(CROSSINGS.find(x=>x.id==='lincoln'),{payment:'ny-ezpass',travelAt:'2026-10-05T08:00:00',vehicle:{type:'car'},destinationZone:true});
  assert.equal(r.toll,1679);assert.equal(r.zone,600);assert.equal(r.credit,300);assert.equal(r.total,2279);
});

test('overnight has no crossing credit',()=>{
  const r=chargeFor(CROSSINGS.find(x=>x.id==='lincoln'),{payment:'ny-ezpass',travelAt:'2026-10-05T23:00:00',vehicle:{type:'car'},destinationZone:true});
  assert.equal(r.zone,225);assert.equal(r.credit,0);
});

test('East River bridge has no crossing toll but zone charge',()=>{
  const r=chargeFor(CROSSINGS.find(x=>x.id==='brooklyn'),{payment:'ny-ezpass',travelAt:'2026-10-05T08:00:00',vehicle:{type:'car'},destinationZone:true});
  assert.equal(r.toll,0);assert.equal(r.zone,900);
});

test('Queensboro is in the crossing set and does not invent a bridge toll',()=>{
  const crossing=CROSSINGS.find(x=>x.id==='queensboro');
  assert.ok(crossing);
  const r=chargeFor(crossing,{payment:'ny-ezpass',travelAt:'2026-10-05T08:00:00',vehicle:{type:'car'},destinationZone:true});
  assert.equal(r.toll,0);
  assert.equal(r.zone,900);
});

test('Queensboro commercial traffic is review-only instead of falsely cleared',()=>{
  const s=buildSnapshot({vehicle:{type:'large-truck'},payment:'ny-ezpass'});
  assert.equal(s.routes.find(r=>r.id==='queensboro').eligibility.state,'REVIEW');
});

test('missing live routes never create a fastest recommendation',()=>{
  const s=buildSnapshot({vehicle:{type:'car'},payment:'ny-ezpass'});
  assert.equal(s.recommendationState,'COST_ONLY');
  assert.equal(s.fastest,null);
  assert.ok(s.routes.every(r=>r.etaMinutes===null));
});

test('commercial vehicles are prohibited from restricted NYC DOT bridges',()=>{
  const s=buildSnapshot({vehicle:{type:'large-truck'},payment:'ny-ezpass'});
  assert.equal(s.routes.find(r=>r.id==='brooklyn').eligibility.state,'PROHIBITED');
});

const now=new Date('2026-10-05T23:45:00Z');
const sample={
  crossingDisplayName:'Lincoln Tunnel',
  travelDirection:'ToNY',
  isDataAvailable:true,
  isCrossingClosed:false,
  routeTravelTime:12,
  routeTravelTimeHist:9,
  routeSpeed:18,
  routeSpeedHist:27,
  timeStamp:'7:44 PM',
  routeName:'NJ-495',
  facilityModifier:'Center',
  infomationalText:'Heavy'
};

test('Port Authority route includes historical delay and speed evidence',()=>{
  const traffic=normalizeTraffic([sample],now);
  const route=traffic.routes[0];
  assert.equal(route.crossingId,'lincoln');
  assert.equal(route.etaMinutes,12);
  assert.equal(route.baselineMinutes,9);
  assert.equal(route.delayMinutes,3);
  assert.equal(route.speedMph,18);
  assert.equal(route.historicalSpeedMph,27);
  assert.equal(route.trafficClass,'Heavy');
});

test('official crossing times render without claiming full-trip fastest',()=>{
  const traffic=normalizeTraffic([sample],now);
  const s=buildSnapshot({traffic});
  const lincoln=s.routes.find(r=>r.id==='lincoln');
  assert.equal(lincoln.etaMinutes,12);
  assert.equal(lincoln.delayMinutes,3);
  assert.equal(s.fastest,null);
  assert.equal(s.recommendationState,'LIVE_CROSSING_CONDITIONS');
  assert.equal(s.routes.find(r=>r.id==='holland').etaMinutes,null);
});

test('stale, closed, wrong direction, missing and zero Port Authority readings are rejected',()=>{
  for(const change of [
    {timeStamp:'6:00 PM'},
    {timeStamp:'7:46 PM'},
    {isCrossingClosed:true},
    {isDataAvailable:false},
    {travelDirection:'ToNJ'},
    {routeTravelTime:null},
    {routeTravelTime:0}
  ]) assert.equal(normalizeTraffic([{...sample,...change}],now).routes.length,0);
});

function nycdotTsv({linkId='4456510',travelTime='210',speed='23',status='0',dataAsOf='10/5/2026 19:44:00',linkName='QMT W Toll Plaza - Manhattan Side'}={}){
  const headers=['Id','Speed','TravelTime','Status','DataAsOf','linkId','linkPoints','EncodedPolyLine','EncodedPolyLineLvls','Owner','Transcom_id','Borough','linkName'];
  const values=['1',speed,travelTime,status,dataAsOf,linkId,'40.0,-73.0 40.1,-73.1','','','MTA Bridges & Tunnels',linkId,'Manhattan',linkName];
  return headers.join('\t')+'\n'+values.join('\t')+'\n';
}

test('NYC DOT link map has audited inbound live segments',()=>{
  assert.equal(NYCDOT_LINKS['4456510'].crossingId,'queens-midtown');
  assert.equal(NYCDOT_LINKS['4456501'].crossingId,'hugh-carey');
  assert.equal(NYCDOT_LINKS['4616339'].crossingId,'brooklyn');
  assert.equal(NYCDOT_LINKS['4616340'].crossingId,'manhattan');
  assert.equal(NYCDOT_LINKS['4456452'].crossingId,'rfk');
  assert.equal(NYCDOT_LINKS['4763652'].crossingId,'verrazzano');
});

test('fresh NYC DOT QMT reading becomes a scoped live crossing time',()=>{
  const routes=normalizeNycdotTraffic(nycdotTsv(),now);
  assert.equal(routes.length,1);
  assert.equal(routes[0].crossingId,'queens-midtown');
  assert.equal(routes[0].etaMinutes,3.5);
  assert.equal(routes[0].speedMph,23);
  assert.equal(routes[0].scope,'CROSSING_ONLY');
  assert.equal(routes[0].linkId,'4456510');
});

test('NYC DOT rejects stale, bad-status, zero-time, zero-speed and unexpected-name readings',()=>{
  assert.equal(normalizeNycdotTraffic(nycdotTsv({dataAsOf:'10/5/2026 19:00:00'}),now).length,0);
  assert.equal(normalizeNycdotTraffic(nycdotTsv({status:'1'}),now).length,0);
  assert.equal(normalizeNycdotTraffic(nycdotTsv({travelTime:'0'}),now).length,0);
  assert.equal(normalizeNycdotTraffic(nycdotTsv({speed:'0'}),now).length,0);
  assert.equal(normalizeNycdotTraffic(nycdotTsv({linkName:'Wrong segment'}),now).length,0);
});

test('mixed official traffic surfaces multiple crossings but never ranks unlike segment scopes',()=>{
  const pa=normalizeTraffic([sample],now).routes;
  const dot=normalizeNycdotTraffic(nycdotTsv(),now);
  const traffic=mergeTraffic(pa,dot,now);
  const s=buildSnapshot({traffic});
  assert.equal(s.routes.find(r=>r.id==='lincoln').etaMinutes,12);
  assert.equal(s.routes.find(r=>r.id==='queens-midtown').etaMinutes,3.5);
  assert.equal(s.fastest,null);
  assert.equal(s.recommendationState,'LIVE_CROSSING_CONDITIONS');
});

test('Mapbox fallback crossings are explicit when live routing is unavailable',()=>{
  const s=buildSnapshot({});
  assert.match(s.routes.find(r=>r.id==='williamsburg').trafficPending,/Mapbox/);
  assert.match(s.routes.find(r=>r.id==='queensboro').trafficPending,/Mapbox/);
});

test('Mapbox fallback has a strict latency budget',()=>{
  assert.ok(MAPBOX_CACHE_TIMEOUT_MS <= 1000);
  assert.ok(MAPBOX_ROUTE_TIMEOUT_MS <= 3000);
});

test('Mapbox bridge probes are pinned through the intended crossings',()=>{
  assert.equal(MAPBOX_PROBES.queensboro.coordinates.length,3);
  assert.equal(MAPBOX_PROBES.williamsburg.coordinates.length,3);
  assert.equal(MAPBOX_PROBES.queensboro.scope,'CROSSING_APPROACH');
  assert.equal(MAPBOX_PROBES.williamsburg.scope,'CROSSING_APPROACH');
});

test('Mapbox traffic response exposes current, typical and delay minutes',()=>{
  const route=normalizeMapboxResponse('queensboro',{
    code:'Ok',
    waypoints:[{distance:4},{distance:2},{distance:5}],
    routes:[{
      duration:480,
      duration_typical:300,
      distance:2600,
      legs:[{incidents:[{description:'Lane restriction'}]},{incidents:[]}]
    }]
  },new Date('2026-10-06T23:00:00Z'));
  assert.equal(route.crossingId,'queensboro');
  assert.equal(route.etaMinutes,8);
  assert.equal(route.baselineMinutes,5);
  assert.equal(route.delayMinutes,3);
  assert.equal(route.baselineKind,'MAPBOX_TYPICAL_TRAFFIC');
  assert.equal(route.sourceName,'Mapbox live traffic routing');
  assert.equal(route.mapboxDistanceMeters,2600);
  assert.equal(route.incident,'Lane restriction');
});

test('Mapbox probe rejects routes that detour far beyond the fixed crossing corridor',()=>{
  assert.throws(()=>normalizeMapboxResponse('williamsburg',{
    code:'Ok',
    routes:[{duration:900,duration_typical:600,distance:12000,legs:[]}],
    waypoints:[]
  }),/sanity checks/);
});

test('Mapbox accepts the repo-standard MAPBOX_TOKEN environment variable',async()=>{
  trafficInternal.clearMapboxCache();
  const calls=[];
  const fetchImpl=async(url,options={})=>{
    calls.push(String(url));
    if(String(url).includes('api.mapbox.com')){
      return {
        ok:true,
        json:async()=>({
          code:'Ok',
          waypoints:[{distance:1},{distance:1},{distance:1}],
          routes:[{duration:300,duration_typical:360,distance:2400,legs:[]}]
        })
      };
    }
    return {ok:true,json:async()=>({result:null})};
  };
  const result=await fetchMapboxTraffic({
    env:{MAPBOX_TOKEN:'repo-standard-token'},
    fetchImpl,
    now:new Date('2026-10-06T23:00:00Z')
  });
  assert.ok(calls.some(url=>url.includes('access_token=repo-standard-token')));
  assert.ok(['LIVE','PARTIAL'].includes(result.state));
});

test('Mapbox accepts MAPBOX_KEY used by the Vercel project',async()=>{
  trafficInternal.clearMapboxCache();
  const calls=[];
  const fetchImpl=async(url)=>{
    calls.push(String(url));
    if(String(url).includes('api.mapbox.com')){
      return {
        ok:true,
        json:async()=>({
          code:'Ok',
          waypoints:[{distance:1},{distance:1},{distance:1}],
          routes:[{duration:300,duration_typical:360,distance:2400,legs:[]}]
        })
      };
    }
    return {ok:true,json:async()=>({result:null})};
  };
  const result=await fetchMapboxTraffic({
    env:{MAPBOX_KEY:'vercel-mapbox-key'},
    fetchImpl,
    now:new Date('2026-10-06T23:00:00Z')
  });
  assert.ok(calls.some(url=>url.includes('access_token=vercel-mapbox-key')));
  assert.ok(['LIVE','PARTIAL'].includes(result.state));
});

test('Mapbox failure diagnostics expose status without leaking the token',async()=>{
  trafficInternal.clearMapboxCache();
  const result=await fetchMapboxTraffic({
    env:{MAPBOX_TOKEN:'secret-test-token'},
    fetchImpl:async(url)=>({
      ok:false,
      status:403,
      json:async()=>({message:'Forbidden for this token'})
    }),
    now:new Date('2026-10-06T23:00:00Z')
  });
  assert.equal(result.state,'UNAVAILABLE');
  assert.match(result.reason,/queensboro: HTTP 403/);
  assert.match(result.reason,/williamsburg: HTTP 403/);
  assert.match(result.reason,/Forbidden for this token/);
  assert.doesNotMatch(result.reason,/secret-test-token/);
});

test('Mapbox traffic is skipped cleanly when no token is configured',async()=>{
  const result=await fetchMapboxTraffic({env:{},fetchImpl:async()=>{throw Error('should not fetch')}});
  assert.equal(result.state,'NOT_CONFIGURED');
  assert.equal(result.routes.length,0);
});

test('authority fetch failure keeps times unavailable',async()=>{
  const traffic=await fetchTraffic(async()=>{throw Error('network')});
  assert.equal(traffic.state,'UNAVAILABLE');
  assert.equal(traffic.routes.length,0);
});
