const test=require('node:test');
const assert=require('node:assert/strict');
const road=require('../api/trail-ridge-road')._test;
const launch=require('../api/space-coast-launch')._test;
const geyser=require('../api/yellowstone-geysers')._test;
const clear={shortForecast:'Sunny',temperature:50,windSpeed:'5 mph',probabilityOfPrecipitation:{value:0}};

test('empty or incomplete alpine evidence cannot become a workable travel-weather assessment',()=>{
  assert.equal(road.weatherAssessment([],[]).level,'unknown');
  assert.equal(road.weatherAssessment([{}],[]).level,'unknown');
  assert.equal(road.weatherAssessment([clear],null).level,'unknown');
  assert.equal(road.weatherAssessment([clear],[]).level,'workable');
  assert.equal(road.weatherAssessment([],[{properties:{event:'Winter Storm Warning'}}]).level,'high');
  assert.equal(road.weatherAssessment([{shortForecast:'Snow'}],null).level,'high');
});
test('launch visibility keeps missing rain and wind unknown and honors the strongest wind in a range',()=>{
  assert.equal(launch.weatherGrade({}).level,'unknown');
  assert.equal(launch.weatherGrade({...clear,probabilityOfPrecipitation:{value:null}}).level,'unknown');
  assert.equal(launch.weatherGrade(clear).level,'good');
  assert.equal(launch.weatherGrade({...clear,windSpeed:'10 to 25 mph'}).level,'mixed');
  const thunder=launch.weatherGrade({shortForecast:'Thunderstorms'});
  assert.equal(thunder.level,'poor');
  assert.doesNotMatch(thunder.detail,/chance 0%/);
});
test('only usable, nonexpired geyser windows can be presented as current predictions',()=>{
  const now=Date.parse('2026-09-17T18:00:00Z');
  const record={geyserName:'Old Faithful',userName:'Contributor',prediction:'2026-09-17T19:00:00Z',windowOpen:'2026-09-17T18:50:00Z',windowClose:'2026-09-17T19:10:00Z'};
  for(const invalid of [{geyserName:'Old Faithful'}, {...record,windowOpen:'2026-09-17T20:00:00Z'}, {...record,windowClose:'2026-09-17T17:59:00Z'}, {...record,expiration:'2026-09-17T17:59:00Z'}])assert.equal(geyser.selectCurrent([invalid],now).find(x=>x.geyserName==='Old Faithful').available,false);
  assert.equal(geyser.selectCurrent([record],now).find(x=>x.geyserName==='Old Faithful').available,true);
});


test('Trail Ridge will not call a partial sunny period workable', () => {
  const partial=[{shortForecast:'Sunny',windSpeed:'8 mph',temperature:52,probabilityOfPrecipitation:{value:null}}];
  const result=trail.weatherAssessment(partial,[]);
  assert.equal(result.level,'unknown');
});
