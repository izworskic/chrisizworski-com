'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/michigan-ski.js');

function response(){
 return {code:200,headers:{},body:null,
 setHeader(k,v){this.headers[String(k).toLowerCase()]=v;},
 status(n){this.code=n;return this;},
 json(x){this.body=x;return this;}};
}
test('Michigan API integrates 18 NWS point grids, warning zones, and local storm report records',async()=>{
 const before=global.fetch;
 let requests=0;
 const now=Date.now();
 const time=new Date(now).toISOString();
 const ending=new Date(now+3600000).toISOString();
 global.fetch=async (input)=>{
  const url=new URL(input);
  requests++;
  let body;
  if(url.hostname==='api.weather.gov'&&url.pathname.startsWith('/points/')){
   const boyne=url.pathname.includes('45.163');
   body={properties:{forecastGridData:'https://api.weather.gov/gridpoints/TEST/1,1',
    forecastZone:'https://api.weather.gov/zones/forecast/'+(boyne?'MIZ022':'MIZ999'),
    county:'https://api.weather.gov/zones/county/'+(boyne?'MIC029':'MIC999')}};
  }else if(url.hostname==='api.weather.gov'&&url.pathname.startsWith('/gridpoints/')){
   body={properties:{updateTime:time,snowfallAmount:{values:[
    {validTime:time.replace(/T.*/,'T00:00:00Z')+'/PT240H',value:25.4}]},
    windDirection:{values:[{validTime:time+'/PT3H',value:290}]}}};
  }else if(url.hostname==='api.weather.gov'&&url.pathname==='/alerts/active'){
   body={features:[{geometry:null,properties:{event:'Lake Effect Snow Warning',
     affectedZones:['https://api.weather.gov/zones/forecast/MIZ022'],expires:ending,
     headline:'Lake-effect snow possible; dangerous travel'}}]};
  }else if(url.hostname==='mesonet.agron.iastate.edu'){
   body={features:[{properties:{typetext:'SNOW',lat:45.163,lon:-84.93,magnitude:'4.0',valid:time,
     city:'Boyne Falls',source:'Public',remark:'Storm total; unknown exact report interval'}}]};
  }else throw Error('Unexpected source URL: '+url.hostname+url.pathname);
  return {ok:true,status:200,json:async()=>body};
 };
 try {
  const res=response();await handler({method:'GET',url:'/api/michigan-ski'},res);
  assert.equal(res.code,200);
  assert.equal(res.headers['x-robots-tag'],'noindex, nofollow');
  assert.equal(res.body.resorts.length,18);
  assert.equal(res.body.health.nwsGridAvailable,18);
  assert.equal(res.body.health.nwsAlerts,'RECEIVED');
  assert.equal(res.body.health.localStormReports,'RECEIVED');
  assert.ok(res.body.resorts.some(x=>x.slug==='boyne-mountain'&&x.weather.alerts.some(a=>a.isLakeEffect)));
  assert.equal(res.body.resorts.filter(x=>x.weather.alerts.some(a=>a.isLakeEffect)).length,1);
  assert.ok(res.body.resorts.some(x=>x.slug==='boyne-mountain'&&x.weather.report24?.inches===4));
  assert.ok(requests>=38);
  const beforeCached=requests;const next=response();
  await handler({method:'GET',url:'/api/michigan-ski'},next);
  assert.equal(next.code,200);
  assert.equal(requests,beforeCached,'serve shared cached snapshot rather than re-fetch per visit');
  const blocked=response();await handler({method:'POST',url:'/api/michigan-ski'},blocked);
  assert.equal(blocked.code,405);assert.equal(requests,beforeCached);
  const noQueries=response();await handler({method:'GET',url:'/api/michigan-ski?lat=45'},noQueries);
  assert.equal(noQueries.code,400);assert.equal(requests,beforeCached);
 }finally{global.fetch=before;}
});
