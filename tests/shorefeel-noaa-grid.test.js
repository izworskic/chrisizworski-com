'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/shorefeel.js');

const pad=n=>String(n).padStart(2,'0');
const makeResponse=(body,ok=true)=>({ok,status:ok?200:503,
 text:async()=>typeof body==='string'?body:JSON.stringify(body),
 json:async()=>typeof body==='string'?JSON.parse(body):body});
function hourly(temp){
 const date=new Date(),h=new Date(Date.UTC(date.getUTCFullYear(),
   date.getUTCMonth(),date.getUTCDate(),date.getUTCHours()));
 return {properties:{periods:[{
  startTime:h.toISOString(),temperature:temp,temperatureUnit:'F',
  windSpeed:'8 mph',windDirection:'NE',relativeHumidity:{value:48},
  isDaytime:true,shortForecast:'Mostly Clear'}]}};
}
function buoy(now){
 const stamp=[now.getUTCFullYear(),pad(now.getUTCMonth()+1),
  pad(now.getUTCDate()),pad(now.getUTCHours()),pad(now.getUTCMinutes())].join(' ');
 return '#YY MM DD hh mm ATMP WTMP\n'+stamp+' 14.5 12.6\n';
}
test('NWS points grid identity and NOAA SBLM4 sensor have honest API provenance',async()=>{
 const original=global.fetch;
 let same=false,fixed=true;
 const now=new Date();
 global.fetch=async target=>{
  const u=String(target);
  if(u.includes('api.weather.gov/points/43.6714,-83.9068'))return makeResponse({
   properties:{forecastHourly:'https://api.weather.gov/gridpoints/DTX/100,60/forecast/hourly',
    gridId:'DTX',gridX:100,gridY:60}});
  if(u.includes('api.weather.gov/points/43.6714,-84.1000'))return makeResponse({
   properties:{forecastHourly:'https://api.weather.gov/gridpoints/DTX/95,60/forecast/hourly',
    gridId:'DTX',gridX:same?100:95,gridY:60}});
  if(u.includes('/gridpoints/DTX/100,60/forecast/hourly'))return makeResponse(hourly(82));
  if(u.includes('/gridpoints/DTX/95,60/forecast/hourly'))return makeResponse(hourly(86));
  if(u.includes('/SBLM4.txt'))return makeResponse(fixed?buoy(now):'',fixed);
  return makeResponse('',false);
 };
 const call=async()=>{
  const res={setHeader(){return this;},status(code){this.code=code;return this;},
   json(value){this.data=value;return this;},end(){return this;}};
  await handler({method:'GET',query:{lake:'huron',place:'saginaw-bay'}},res);
  assert.equal(res.code,200);return res.data;
 };
 try{
  const d=await call();
  assert.equal(d.shorelinePhysics.gridRelationship.status,'distinct-grid');
  assert.equal(d.shorelinePhysics.paired.nwsDifferenceF,-4);
  assert.equal(d.shorelinePhysics.status,'insufficient-data','NOAA water still missing');
  assert.equal(d.shorelinePhysics.independentMarineAir.stationId,'SBLM4');
  assert.equal(d.shorelinePhysics.independentMarineAir.tempF,58.1);
  assert.match(d.shorelinePhysics.independentMarineAir.location,/not the park beach/);
  same=true;
  const s=await call();
  assert.equal(s.shorelinePhysics.gridRelationship.status,'same-grid');
  assert.equal(s.shorelinePhysics.paired,null);
  assert.equal(s.shorelinePhysics.noIndependentTemperatureDifference,true);
  fixed=false;
  const m=await call();
  assert.equal(m.shorelinePhysics.independentMarineAir,null);
  assert.equal(m.shorelinePhysics.gridRelationship.status,'same-grid');
 }finally{global.fetch=original;}
});
