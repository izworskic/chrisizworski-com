'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('public/michigan-shed-antlers/app.js','utf8');
test('forecast admission rejects wrong region, expired and malformed weather evidence',()=>{
 const fn=js.match(/function forecastCurrent\(packet,site,now=Date\.now\(\)\)\{[\s\S]*?\n \}/)?.[0];assert.ok(fn);
 const valid=vm.runInNewContext('('+fn+')');
 const now=Date.parse('2026-11-28T12:00:00Z'),d={highF:42,lowF:25,snowHours:0,rainHours:0,thawHours:5,maxWindMph:null};
 const packet={location:{id:'bay-city'},forecastUpdatedAt:new Date(now-12*3600000).toISOString(),daily:[28,29,30].map(i=>({...d,date:'2026-11-'+i}))};
 assert.equal(valid(packet,'bay-city',now),true);
 for(const x of [{...packet,forecastUpdatedAt:'2020-01-01T00:00:00Z'},{...packet,forecastUpdatedAt:null},{...packet,forecastUpdatedAt:new Date(now+60001).toISOString()},{...packet,location:{id:'marquette'}},{...packet,daily:[packet.daily[0],packet.daily[0],packet.daily[1]]},{...packet,daily:packet.daily.map(x=>({...x,highF:null}))}])assert.equal(valid(x,'bay-city',now),false);
 assert.match(js,/state\.data=null;state\.day=0;clearForecastMetrics\(\)/);
 assert.match(js,/if\(!data\)\{clearForecastMetrics\(\)/);
 assert.match(js,/if\(!forecastCurrent\(json,region\)\)throw/);
});
