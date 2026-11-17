'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../previews/great-lakes-winter-desk');
const D=require(path.join(base,'core.js'));
const source=name=>fs.readFileSync(path.join(base,name),'utf8');
const at='2026-11-17T16:00:00Z';
const sample=(issue=at,periods=[])=>({properties:{updateTime:issue,periods}});

test('three documented distinct land outings, exact official source and country-side identities',()=>{
  assert.equal(D.PLACES.length,3);
  assert.deepEqual(D.PLACES.map(p=>p.goal).sort(),['coast','falls','snowshoe']);
  for(const p of D.PLACES){
    assert.match(p.official,/^https:\/\/(?:www\.)?(?:nps\.gov|dnr\.state\.mn\.us)\//);
    assert.match(p.conditions,/^https:\/\/(?:www\.)?(?:nps\.gov|dnr\.state\.mn\.us)\//);
    assert.match(p.google,/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    assert.ok(D.safeGoogleUrl(p));
    assert.ok(!/maps\/dir\/|\/maps\/dir\?/.test(p.google));
    assert.match(p.photoPage,/^https:\/\//);
    assert.match(p.photoCredit,/National Park Service|Commons/);
    assert.match(p.photoNote,/archive|Archival|current/i);
  }
});

test('published visitor length sets a genuine choice, not a dummy filter',()=>{
  assert.equal(D.recommend({goal:'falls',effort:'short'}).kind,'candidate');
  assert.equal(D.recommend({goal:'snowshoe',effort:'half'}).place.id,'munising-snowshoe');
  assert.equal(D.recommend({goal:'coast',effort:'full'}).place.id,'meyers-lakeshore');
  assert.equal(D.recommend({goal:'coast',effort:'short'}).kind,'effort-mismatch');
  assert.equal(D.recommend({goal:'snowshoe',effort:'short'}).kind,'effort-mismatch');
  assert.equal(D.recommend({goal:'falls',effort:'half'}).kind,'candidate');
});

test('explicit operator closure outranks weather and any activity match',()=>{
  const access={'munising-snowshoe':{status:'closed',verified:true,source:'https://www.nps.gov/piro/planyourvisit/conditions.htm'}};
  assert.equal(D.recommend({goal:'snowshoe',effort:'half'},access).kind,'blocked');
  assert.equal(D.recommend({goal:'snowshoe',effort:'half'},{'munising-snowshoe':{status:'closed',verified:false}}).kind,'candidate');
  assert.equal(D.recommend({goal:'snowshoe',effort:'half'},{'munising-snowshoe':{status:'unknown'}}).access.status,'unknown');
});

test('dangerous lake-ice path and washed-out Munising Falls Trail never become options',()=>{
  assert.ok(D.PLACES.every(p=>!p.id.includes('ice-caves')));
  assert.ok(D.PLACES.every(p=>!p.id.includes('munising-falls')));
  assert.match(D.getPlace('meyers-lakeshore').why,/NOT a route across frozen Lake Superior/);
  assert.match(D.getPlace('munising-snowshoe').why,/Munising Falls Trail is separately closed/);
});

test('named place maps are search-only and invalid navigation is rejected',()=>{
  assert.equal(D.safeGoogleUrl({google:'https://www.google.com/maps/dir/?api=1&destination=restricted'}),null);
  assert.equal(D.safeGoogleUrl({google:'https://evil.example/maps/search/?api=1&query=abc'}),null);
});

test('forecast issue timestamp missing and stale disallow a positive weather summary',()=>{
  const now=new Date('2026-11-17T17:00:00Z');
  assert.equal(D.forecastWindow(sample('2026-11-16T08:00:00Z',[]),now,'America/Chicago','today').status,'stale');
  assert.equal(D.forecastWindow({properties:{periods:[]}},now,'America/Chicago','today').status,'unknown');
  assert.equal(D.forecastWindow(sample('2026-11-16T14:00:00Z',[]),now,'America/Chicago','today').status,'stale');
  assert.equal(D.forecastWindow(sample('2026-11-18T14:00:00Z',[]),now,'America/Chicago','today').status,'stale');
});

test('forecast is date-localized and excludes past periods and nighttime',()=>{
  const now=new Date('2026-11-17T15:30:00Z');
  const rows=[
    {startTime:'2026-11-17T08:00:00-06:00',endTime:'2026-11-17T09:00:00-06:00',isDaytime:true,temperature:23,temperatureUnit:'F',windSpeed:'8 mph',shortForecast:'Sunny',probabilityOfPrecipitation:{value:2}},
    {startTime:'2026-11-17T10:00:00-06:00',endTime:'2026-11-17T11:00:00-06:00',isDaytime:true,temperature:26,temperatureUnit:'F',windSpeed:'9 to 15 mph',shortForecast:'Partly Cloudy',probabilityOfPrecipitation:{value:15}},
    {startTime:'2026-11-17T20:00:00-06:00',endTime:'2026-11-17T21:00:00-06:00',isDaytime:false,temperature:18,temperatureUnit:'F',windSpeed:'10 mph',shortForecast:'Snow',probabilityOfPrecipitation:{value:70}},
    {startTime:'2026-11-18T11:00:00-06:00',endTime:'2026-11-18T12:00:00-06:00',isDaytime:true,temperature:20,temperatureUnit:'F',windSpeed:'16 mph',shortForecast:'Snow',probabilityOfPrecipitation:{value:57}}
  ];
  const doc=sample('2026-11-17T15:00:00Z',rows);
  const today=D.forecastWindow(doc,now,'America/Chicago','today');
  assert.equal(today.status,'available');
  assert.equal(today.hours.length,1);
  assert.equal(today.hours[0].temperature,26);
  assert.equal(today.hours[0].precip,15);
  assert.equal(D.forecastWindow(doc,now,'America/Chicago','tomorrow').hours.length,1);
});

test('forecast classifications are qualitative, never trail safety or false precision',()=>{
  assert.deepEqual(D.classifyWeather({windSpeed:'35 mph',shortForecast:'Clear'}),{kind:'advisory',label:'Strong forecast wind'});
  assert.equal(D.classifyWeather({shortForecast:'Snow Likely',windSpeed:'5 mph'}).kind,'variable');
  assert.equal(D.classifyWeather({temperature:0,temperatureUnit:'F',shortForecast:'Clear'}).kind,'advisory');
  const src=source('core.js');
  assert.doesNotMatch(src,/safe to walk|ice is safe|guaranteed trail|open now/i);
});

test('noindex prototype, source-first HTML and real optional image/map fallback',()=>{
  const html=source('index.html');
  assert.match(html,/robots" content="noindex,nofollow,noarchive"/);
  assert.match(html,/id="stage-title">Walk toward the Upper Falls/);
  assert.match(html,/https:\/\/www\.dnr\.state\.mn\.us\/state-parks\/gooseberry-falls\/self-tour-waterfalls-walk\.html/);
  assert.match(html,/<noscript>/);
  for(const id of ['stage-photo','stage-title','photo-missing','stage-status','stage-blocker','weather-hours','weather-unavailable','coast-map','map-fallback','conditions-link','maps-link','desk-status'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.doesNotMatch(html,/pagead2\.googlesyndication|canonical.*winter-field-desk/);
});

test('selection, error, weather race guards and map synchronization exist',()=>{
  const app=source('app.js');
  assert.match(app,/req!==state\.request/);
  assert.match(app,/state\.chosen!==place\.id/);
  assert.match(app,/marker\.setStyle/);
  assert.match(app,/forecastWindow/);
  assert.match(app,/new AbortController/);
  assert.match(app,/place\.id===state\.chosen/);
  assert.match(app,/weatherUnknown/);
  assert.match(app,/C\.safeGoogleUrl/);
});

test('photo rights and NPS archival caveats retained as data, not inferred from weather',()=>{
  const go=D.getPlace('gooseberry-upper'),mun=D.getPlace('munising-snowshoe'),bay=D.getPlace('meyers-lakeshore');
  assert.match(go.photoCredit,/Chris Light.*CC BY-SA 4\.0/);
  assert.match(mun.photoCredit,/National Park Service/);
  assert.match(bay.photoNote,/Summer archive/);
  assert.match(bay.why,/ice caves/);
  assert.equal(D.SOURCE_REVIEWED,'2026-11-17');
});

test('mobile first answer precedes controls and stays synchronized to selected outing',()=>{
  const html=source('index.html'),js=source('app.js'),css=source('desk.css');
  assert.match(html,/id="quick-outing"/);
  assert.match(html,/id="quick-reason"/);
  assert.match(html,/id="quick-source"/);
  assert.ok(html.indexOf('id="quick-outing"')<html.indexOf('class="workbench"'));
  assert.match(js,/\$\('quick-outing'\)\.textContent=/);
  assert.match(js,/\$\('quick-source'\)\.href=place\.conditions/);
  assert.match(css,/\.immediate-answer/);
});

test('the hourly forecast has an explicit accessible inspection control',()=>{
  const html=source('index.html'),js=source('app.js');
  assert.match(html,/id="weather-hour-insight"/);
  assert.match(js,/inspect\.className='hour-choose'/);
  assert.match(js,/inspect\.addEventListener\('click'/);
  assert.match(js,/aria-pressed/);
  assert.match(js,/NWS forecast, not observed trail conditions/);
});

test('map tile errors display a usable fallback rather than an unmarked blank map',()=>{
  const html=source('index.html'),js=source('app.js');
  assert.match(html,/id="map-fallback"/);
  assert.match(html,/data-place="gooseberry-upper"/);
  assert.match(js,/basemap\.on\('tileerror'/);
  assert.match(js,/\$\('map-fallback'\)\.hidden=false/);
});

test('source scanner reachability never becomes an opening or safety verdict',()=>{
  const place=D.getPlace('gooseberry-upper');
  const now=new Date('2026-11-17T17:00:00Z');
  const baseline={schemaVersion:1,accessVerified:false,places:{
    [place.id]:{sourceUrl:place.conditions,reachability:'REACHED',operatorAccess:'NOT_DETERMINED',retrievedAt:'2026-11-17T16:30:00Z'}
  }};
  assert.equal(D.sourceReachability(baseline,place,now).kind,'reached');
  assert.match(D.sourceReachability(baseline,place,now).message,/access remains unverified/);
  assert.equal(D.sourceReachability({...baseline,accessVerified:true},place,now).kind,'unavailable');
  const other={...baseline,places:{[place.id]:{...baseline.places[place.id],sourceUrl:'https://evil.example/'}}};
  assert.equal(D.sourceReachability(other,place,now).kind,'unavailable');
  const old={...baseline,places:{[place.id]:{...baseline.places[place.id],retrievedAt:'2026-11-15T16:00:00Z'}}};
  assert.equal(D.sourceReachability(old,place,now).kind,'stale');
  const future={...baseline,places:{[place.id]:{...baseline.places[place.id],retrievedAt:'2026-11-18T16:00:00Z'}}};
  assert.equal(D.sourceReachability(future,place,now).kind,'stale');
});

test('source desk remains a separate live evidence dimension, not forecast-driven access',()=>{
  const html=source('index.html'),js=source('app.js');
  for(const id of ['source-direct','source-signal'])assert.ok(html.includes('id="'+id+'"'));
  assert.match(js,/renderSourceDesk\(place\)/);
  assert.match(js,/loadSourceDesk\(\)/);
  assert.match(js,/sourceReachability\(state\.sourceDocument,place,new Date\(\)\)/);
  assert.match(js,/No usable hourly forecast is available/);
  assert.match(js,/\$\('stage-photo'\)!==img/);
});
