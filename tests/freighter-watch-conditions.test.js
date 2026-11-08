'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/freighter-watch-conditions.js');
const {forecastHref,windMph,period,alert}=handler._test;
function fakeRes(){
 const h={};
 return {code:200,headers:h,body:null,
  setHeader(k,v){h[k]=v;},status(n){this.code=n;return this;},
  json(x){this.body=x;return this;}
 };
}
const point={properties:{forecastHourly:'https://api.weather.gov/gridpoints/APX/10,20/forecast/hourly'}};
const forecast={properties:{updateTime:'2026-11-08T17:00:00Z',periods:[{
 startTime:'2026-11-08T17:00:00Z',endTime:'2026-11-08T18:00:00Z',
 temperature:45,temperatureUnit:'F',windSpeed:'5 to 14 mph',windDirection:'NW',
 shortForecast:'Sunny',isDaytime:true,probabilityOfPrecipitation:{value:20}
}]}};
const alerts={features:[{id:'https://api.weather.gov/alerts/urn:test',properties:{
 event:'Wind Advisory',severity:'Moderate',onset:'2026-11-08T16:00:00Z',
 expires:'2026-11-09T00:00:00Z'
}}]};
async function withFetch(mock,action){
 const old=global.fetch;global.fetch=mock;
 try{return await action();}finally{global.fetch=old;}
}
const req=place=>({method:'GET',query:{place}});
test('forecast URL pins weather.gov HTTPS hourly only',()=>{
 assert.equal(forecastHref(point.properties.forecastHourly),point.properties.forecastHourly);
 assert.equal(forecastHref('https://evil.com/gridpoints/APX/10,20/forecast/hourly'),null);
 assert.equal(forecastHref('http://api.weather.gov/gridpoints/APX/10,20/forecast/hourly'),null);
 assert.equal(forecastHref('https://api.weather.gov/alerts/active'),null);
});
test('wind and hourly metadata retain actual wind maxima and forecast intervals',()=>{
 assert.equal(windMph('5 to 14 mph'),14);
 assert.equal(windMph('15 kt'),17);
 assert.equal(windMph('N/A'),null);
 assert.deepEqual([period(forecast.properties.periods[0]).temperatureF,
   period(forecast.properties.periods[0]).windMph], [45,14]);
 assert.equal(alert(alerts.features[0]).severity,'Moderate');
});
test('site allowlist rejects arbitrary locations and non GET',async()=>{
 const bad=fakeRes();await handler(req('not-a-site'),bad);
 assert.equal(bad.code,400);
 assert.equal(bad.headers['X-Robots-Tag'],'noindex, nofollow');
 const method=fakeRes();await handler({method:'POST',query:{place:'soo'}},method);
 assert.equal(method.code,405);
});
test('six site requests use fixed verified forecast points and pass only bounded hourly fields',async()=>{
 const calls=[];
 await withFetch(async url=>{
  calls.push(String(url));
  const obj=String(url).includes('/points/')?point:String(url).includes('/alerts/active')?alerts:forecast;
  return {ok:true,json:async()=>obj};
 },async()=>{
  const res=fakeRes();await handler(req('soo'),res);
  assert.equal(res.code,200);
  assert.equal(res.body.site.id,'soo');
  assert.match(res.body.site.accessUrl,/lrd\.usace\.army\.mil/);
  assert.equal(res.body.weather.ok,true);
  assert.equal(res.body.weather.periods[0].windMph,14);
  assert.equal(res.body.weather.alerts[0].event,'Wind Advisory');
  assert.equal(res.body.weather.alertsStatus,'available');
  assert.match(calls[0],/^https:\/\/api\.weather\.gov\/points\/46\.5030,-84\.3530$/);
  assert.equal(calls.length,3);
  assert.equal(res.headers['X-Robots-Tag'],'noindex, nofollow');
 });
});
test('alerts failure is separate and cannot be treated as all-clear',async()=>{
 await withFetch(async url=>{
  if(String(url).includes('alerts/active'))throw Error('alerts service down');
  return {ok:true,json:async()=>String(url).includes('/points/')?point:forecast};
 },async()=>{
  const res=fakeRes();await handler(req('duluth'),res);
  assert.equal(res.body.weather.ok,true);
  assert.equal(res.body.weather.alertsStatus,'unavailable');
 });
});
test('NWS outage returns named public site with weather unverified, never a false clear forecast',async()=>{
 await withFetch(async()=>{throw Error('NWS outage')},async()=>{
  const res=fakeRes();await handler(req('saginaw'),res);
  assert.equal(res.code,200);
  assert.equal(res.body.ok,true);
  assert.equal(res.body.site.name,'Wenonah Park riverfront');
  assert.equal(res.body.weather.ok,false);
  assert.equal(res.body.weather.alertsStatus,'unavailable');
  assert.equal(res.headers['Cache-Control'],'no-store');
 });
});
