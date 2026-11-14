'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {weatherRules,officialTrend,buildWeatherStory}=require('../lib/space-coast-weather-story');
const NOW=Date.parse('2026-11-02T12:00:00Z');
const mission={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name:'Falcon 9 | Crew-13',net:'2026-11-04T12:00:00Z',netPrecision:'minute'};
const base={status:'not-verified',povPercent:null,
  agencyWeather:{status:'not-verified'},health:{status:'ok',checkedAt:'2026-11-02T11:55:00Z'}};

test('weather rule interpretations are bounded to named published concerns',()=>{
  const guides=weatherRules(['Cumulus Cloud Rule','Flight Through Precipitation','not on a list']);
  assert.equal(guides.length,2);
  assert.match(guides[0].explanation,/electric fields/);
  assert.equal(weatherRules(['unverified'])[0],undefined);
});
test('trend distinguishes forecast revisions from actual scrub or GO',()=>{
  const out=officialTrend({kind:'official-pov-revised',povPercent:70,priorPovPercent:30});
  assert.match(out,/rose 40 percentage points/);
  assert.match(out,/not a confirmed scrub/);
  assert.match(officialTrend({kind:'official-pov-revised',povPercent:20,priorPovPercent:60}),/fell 40/);
});
test('verified 45WS PDF receives primary authority and dated next forecast only if reported',()=>{
  const d={...base,status:'mission-matched-current',povPercent:60,
    officialUrl:'https://45thweathersquadron.nebula.spaceforce.mil/assets/LaunchForecasts/mission.pdf',
    issuedAt:'2026-11-02T10:00:00Z',nextForecastDate:'2026-11-03',
    primaryConcerns:['Cumulus Cloud Rule'],
    latestChange:{kind:'official-pov-revised',povPercent:60,priorPovPercent:40}};
  const story=buildWeatherStory(mission,d,NOW);
  assert.equal(story.stage,'official-forecast');
  assert.match(story.explanation,/60% chance of violating/);
  assert.match(story.explanation,/not the probability/);
  assert.match(story.changes,/rose 20/);
  assert.match(story.nextUpdate,/November 3/);
  assert.equal(story.rules[0].label,'Cumulus Cloud Rule');
  assert.equal(story.sourceUrl,d.officialUrl);
});
test('unreadable primary PoV produces no invented number or good-weather claim',()=>{
  const story=buildWeatherStory(mission,{...base,status:'mission-matched-current',
    primaryConcerns:[],nextForecastDate:null},NOW);
  assert.equal(story.stage,'official-forecast');
  assert.match(story.explanation,/could not be safely extracted/);
  assert.doesNotMatch(story.explanation,/\d+%/);
});
test('NASA favorable weather stays separate from official PDF and PoV',()=>{
  const report={status:'nasa-reported-current',reportedFavorablePercent:55,
    sourceUrl:'https://www.nasa.gov/blogs/commercialcrew/2026/11/03/weather-55-favorable/',
    publishedAt:'2026-11-02T10:00:00Z',
    primaryConcerns:['Thick Cloud Layers Rule'],
    timeline:[{reportedFavorablePercent:55,priorFavorablePercent:60}]};
  const story=buildWeatherStory(mission,{...base,agencyWeather:report},NOW);
  assert.equal(story.stage,'nasa-reported');
  assert.match(story.explanation,/NASA reports/);
  assert.match(story.explanation,/55% chance of favorable/);
  assert.match(story.explanation,/original official squadron PDF/);
  assert.match(story.changes,/fell 5 points/);
  assert.doesNotMatch(story.explanation,/45%/);
});
test('verified PDF takes precedence even when NASA also reports weather',()=>{
  const d={...base,status:'mission-matched-current',povPercent:40,
    officialUrl:'https://45thweathersquadron.nebula.spaceforce.mil/assets/LaunchForecasts/mission.pdf',
    agencyWeather:{status:'nasa-reported-current',reportedFavorablePercent:30},
    primaryConcerns:[]};
  const story=buildWeatherStory(mission,d,NOW);
  assert.equal(story.stage,'official-forecast');
  assert.match(story.agencyComparison,/not compared mathematically/);
});
test('far future target is early-planning, not storm-free',()=>{
  const future={...mission,net:'2026-11-18T16:00:00Z'};
  const story=buildWeatherStory(future,base,NOW);
  assert.equal(story.stage,'early-planning');
  assert.match(story.explanation,/No forecast does not mean favorable weather/);
});
test('day-only schedule is never treated as launch-weather timing',()=>{
  const day={...mission,netPrecision:'day',tbdTime:true};
  const story=buildWeatherStory(day,base,NOW);
  assert.equal(story.stage,'day-only');
  assert.match(story.headline,/hour is not confirmed/);
});
test('monitor outage is not confused with a weather forecast',()=>{
  const overdue=buildWeatherStory(mission,{...base,health:{status:'overdue'}},NOW);
  assert.equal(overdue.stage,'monitor-overdue');
  assert.match(overdue.nextUpdate,/official launch forecast/);
  assert.match(overdue.headline,/official forecast/);
});
test('no source in forecast window stays explicitly unverified',()=>{
  const story=buildWeatherStory(mission,base,NOW);
  assert.equal(story.stage,'no-verified-forecast');
  assert.match(story.explanation,/cannot be interpreted as favorable/);
});

const {FORECAST_PAGE,firstPartyBlocked}=require('../lib/space-coast-weather-story');
const blockedChecks=[
  {id:'45ws-home',status:'unavailable',links:0},
  {id:'45ws-forecast-support',status:'unavailable',links:0},
  {id:'45ws-sitemap',status:'unavailable',links:0},
  {id:'45ws-parent-weather',status:'unavailable',links:0}];
test('a blocked squadron site sends visitors to the official forecast page',()=>{
  const story=buildWeatherStory(mission,{...base,health:{...base.health,status:'partial',sourceChecks:blockedChecks}},NOW);
  assert.equal(story.stage,'official-site-blocked');
  assert.equal(story.officialPageUrl,FORECAST_PAGE);
  assert.match(story.explanation,/not because the weather looks good or bad/);
});
test('one readable squadron page is not reported as blocked',()=>{
  const mixed=blockedChecks.map(x=>x.id==='45ws-home'?{...x,status:'checked-no-links'}:x);
  assert.equal(firstPartyBlocked({sourceChecks:mixed}),false);
  assert.equal(buildWeatherStory(mission,{...base,health:{...base.health,sourceChecks:mixed}},NOW).stage,
    'no-verified-forecast');
});
test('launch-week stages carry the official page; distant and verified stages do not',()=>{
  assert.equal(buildWeatherStory(mission,base,NOW).officialPageUrl,FORECAST_PAGE);
  assert.equal(buildWeatherStory(mission,{...base,health:{status:'overdue'}},NOW).officialPageUrl,FORECAST_PAGE);
  const far={...mission,net:'2026-11-20T12:00:00Z'};
  assert.equal(buildWeatherStory(far,base,NOW).officialPageUrl,undefined);
  const verified=buildWeatherStory(mission,{...base,status:'mission-matched-current',povPercent:10,
    officialUrl:'https://45thweathersquadron.nebula.spaceforce.mil/assets/LaunchForecasts/x.pdf'},NOW);
  assert.equal(verified.officialPageUrl,undefined);
});
test('story copy keeps the network ban on em dashes',()=>{
  for(const s of [buildWeatherStory(mission,base,NOW),
    buildWeatherStory(mission,{...base,health:{status:'overdue'}},NOW),
    buildWeatherStory(mission,{...base,health:{status:'partial',sourceChecks:blockedChecks}},NOW)])
    assert.doesNotMatch(JSON.stringify(s),/\u2014/);
});
