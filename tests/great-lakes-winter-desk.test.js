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

test('forecast date selection remains local across spring and autumn clock changes',()=>{
  const spring=new Date('2027-03-14T04:30:00Z'); // March 13 11:30 PM Detroit time
  assert.equal(D.dateKey(spring,'America/Detroit'),'2027-03-13');
  assert.equal(D.targetKey(spring,'America/Detroit','tomorrow'),'2027-03-14');
  assert.equal(D.targetKey(spring,'America/Detroit','third'),'2027-03-15');
  const autumn=new Date('2026-11-01T04:30:00Z'); // November 1 12:30 AM Detroit time
  assert.equal(D.dateKey(autumn,'America/Detroit'),'2026-11-01');
  assert.equal(D.targetKey(autumn,'America/Detroit','tomorrow'),'2026-11-02');
  assert.equal(D.targetKey(new Date('bad'),'America/Detroit','tomorrow'),null);
});

test('winter route policies are named and sourced but never converted to live access',()=>{
  const data=JSON.parse(fs.readFileSync(path.join(base,'route-access-evidence.json'),'utf8'));
  const now=new Date('2026-11-17T18:00:00Z');
  assert.equal(data.schemaVersion,1);
  assert.equal(data.operatorAccessReady,false);
  for(const place of D.PLACES){
    const row=data.routes[place.id];
    assert.equal(row.routeId,place.id);
    assert.equal(row.routePage,place.official);
    assert.equal(row.conditionsPage,place.conditions);
    assert.equal(row.policy.sourceUrl,place.official);
    assert.equal(row.observations.length,0);
    const status=D.routeAccess(data,place,{day:'today'},now);
    assert.equal(status.kind,'unknown');
    assert.equal(status.blocks,false);
    assert.equal(status.policy.text,row.policy.text);
    assert.match(status.message,/not confirmed/);
  }
});
test('operator reports require exact route and visit day, stale positives are ignored',()=>{
  const place=D.getPlace('munising-snowshoe');
  const now=new Date('2026-11-17T18:00:00Z');
  const day=D.targetKey(now,place.tz,'today');
  const document=()=>({schemaVersion:1,operatorAccessReady:false,routes:{
    [place.id]:{routeId:place.id,routePage:place.official,conditionsPage:place.conditions,observations:[]}
  }});
  const evidence=(status,overrides={})=>({
    routeId:place.id,scope:'exact-route',reviewMethod:'human-official-notice',routeExplicit:true,
    sourceUrl:place.conditions,sourceStatement:'Official notice specifically names the marked Pictured Rocks snowshoe trail.',
    checkedAt:'2026-11-17T17:30:00Z',publishedAt:'2026-11-17T17:00:00Z',
    validFrom:day,validThrough:day,status,...overrides
  });
  const closed=document();closed.routes[place.id].observations=[evidence('closed')];
  assert.equal(D.routeAccess(closed,place,{day:'today'},now).kind,'closed');
  assert.equal(D.routeAccess(closed,place,{day:'today'},now).blocks,true);
  assert.equal(D.routeAccess(closed,place,{day:'tomorrow'},now).kind,'unknown');
  const other=document();other.routes[place.id].observations=[evidence('closed',{routeId:'munising-falls'})];
  assert.equal(D.routeAccess(other,place,{day:'today'},now).kind,'unknown');
  const broad=document();broad.routes[place.id].observations=[evidence('closed',{scope:'park-wide'})];
  assert.equal(D.routeAccess(broad,place,{day:'today'},now).kind,'unknown');
  const old=document();old.routes[place.id].observations=[evidence('open',{checkedAt:'2026-11-15T16:00:00Z'})];
  assert.equal(D.routeAccess(old,place,{day:'today'},now).kind,'unknown');
  const range=document();range.routes[place.id].observations=[evidence('open',{validThrough:'2026-11-18'})];
  assert.equal(D.routeAccess(range,place,{day:'today'},now).kind,'unknown');
  const positive=document();positive.routes[place.id].observations=[evidence('open')];
  assert.equal(D.routeAccess(positive,place,{day:'today'},now).kind,'reported-open');
  const future=document();future.routes[place.id].observations=[evidence('closed',{publishedAt:'2026-11-18T16:00:00Z'})];
  assert.equal(D.routeAccess(future,place,{day:'today'},now).kind,'unknown');
});
test('conflicting exact-route reports are a block, and forecast cannot reverse them',()=>{
  const place=D.getPlace('meyers-lakeshore');
  const now=new Date('2026-11-17T19:00:00Z');
  const day=D.targetKey(now,place.tz,'today');
  const row={routeId:place.id,routePage:place.official,conditionsPage:place.conditions,
    observations:['open','closed'].map(status=>({
      routeId:place.id,scope:'exact-route',reviewMethod:'human-official-notice',routeExplicit:true,
      sourceUrl:place.conditions,sourceStatement:'Official operator says route specifically controlled on this selected date.',
      checkedAt:'2026-11-17T18:30:00Z',publishedAt:'2026-11-17T18:00:00Z',
      validFrom:day,validThrough:day,status
    }))};
  const record={schemaVersion:1,operatorAccessReady:false,routes:{[place.id]:row}};
  const access=D.routeAccess(record,place,{day:'today'},now);
  assert.equal(access.kind,'conflict');
  assert.equal(access.blocks,true);
  const outcome=D.recommend({goal:'coast',effort:'full'},{[place.id]:{status:'closed',verified:access.blocks}});
  assert.equal(outcome.kind,'blocked');
  assert.match(access.message,/conflict/);
});
test('the visit-day access evidence updates with selection and cannot be inferred from weather',()=>{
  const html=source('index.html'),js=source('app.js');
  for(const id of ['route-day','route-access','route-policy','route-policy-link'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(js,/routeAccess\(state\.routeDocument,requestedPlace,state,new Date\(\)\)/);
  assert.match(js,/loadRouteEvidence\(\)/);
  assert.match(js,/renderRouteEvidence\(place,access\)/);
  assert.match(js,/blocked\?access\.message/);
});
