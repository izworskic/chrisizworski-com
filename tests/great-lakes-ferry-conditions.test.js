import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/great-lakes-ferry-conditions.js";
function response(){
 return {code:200,head:{},body:null,setHeader(k,v){this.head[k]=v},status(n){this.code=n;return this},json(payload){this.body=payload;return this}};
}
test("NWS ferry forecast rejects unrecognized route IDs without fetching",async()=>{
 const old=global.fetch;let called=false;global.fetch=async()=>{called=true;throw Error("unexpected")};
 try{const res=response();await handler({method:"GET",query:{id:"arbitrary"}},res);assert.equal(res.code,400);assert.equal(called,false)}finally{global.fetch=old}
});
test("NWS ferry forecast provides gateway provenance and limited fields",async()=>{
 const old=global.fetch;const urls=[];
 global.fetch=async url=>{
  urls.push(String(url));
  return{ok:true,json:async()=>String(url).includes("/points/")?
   {properties:{forecastHourly:"https://api.weather.gov/gridpoints/APX/1,1/forecast/hourly"}}:
   {properties:{updateTime:"2026-10-18T12:00:00Z",periods:[{startTime:"2026-10-18T13:00:00-04:00",temperature:55,temperatureUnit:"F",windSpeed:"10 mph",windDirection:"NW",shortForecast:"Clear"}]}}};
 };
 try{
  const res=response();await handler({method:"GET",query:{id:"beaver"}},res);
  assert.equal(res.code,200);
  assert.equal(res.body.type,"shore-hourly-forecast");
  assert.equal(res.body.periods.length,1);
  assert.match(res.body.gateway,/Charlevoix/);
  assert.match(res.body.disclaimer,/not open-water marine weather/);
  assert.equal(urls.length,2);
  assert.ok(urls.every(u=>u.startsWith("https://api.weather.gov/")));
 }finally{global.fetch=old}
});
test("NWS failure returns unavailable without a fake fair-weather signal",async()=>{
 const old=global.fetch;global.fetch=async()=>({ok:false});
 try{const res=response();await handler({method:"GET",query:{id:"ss-badger"}},res);assert.equal(res.code,503);assert.match(res.body.error,/unavailable/i)}finally{global.fetch=old}
});