/* Great Lakes Winter Field Assignment Desk. Preview only.
 * Official access evidence is separate from weather. No forecast can open a closed park.
 * Pure decision logic is exported for Node tests and browser use.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GreatLakesWinterDesk=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SOURCE_REVIEWED='2026-11-17';
  const PLACES=Object.freeze([
    {
      id:'gooseberry-upper', goal:'falls', region:'Minnesota North Shore', label:'GOOSEBERRY / MINNESOTA',
      title:'Walk toward the Upper Falls', short:'The short winter waterfall walk',
      lat:47.1441,lon:-91.4695,tz:'America/Chicago',effort:'short',
      featured:'The Gooseberry River tumbles across a succession of ancient lava ledges. In winter, the walk toward Upper Falls keeps the waterfall experience close to the visitor center, without committing you to the longer and less-maintained paths.',
      why:'Minnesota DNR identifies the approach to Upper Falls as its only maintained winter waterfall walking trail. Its longer summer waterfall circuits are not that route.',
      blocker:'Confirm the current park notices and walking surface. The park guide is not a same-day report of plowing or ice.',
      length:'Short visitor-center approach, not the full Falls View Loop',
      official:'https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour-waterfalls-walk.html',
      conditions:'https://www.dnr.state.mn.us/trailconditions/index.html',
      entrance:'https://www.dnr.state.mn.us/state-parks/park.html?id=spk00172',
      arrival:'Gooseberry Falls State Park Visitor Center, Minnesota',
      google:'https://www.google.com/maps/search/?api=1&query=Gooseberry%20Falls%20State%20Park%20Visitor%20Center%20Minnesota',
      photo:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1e/Winter_falls_468.jpg/500px-Winter_falls_468.jpg',
      photoPage:'https://commons.wikimedia.org/wiki/File:Winter_falls_468.jpg',
      photoCredit:'Chris Light / Wikimedia Commons, CC BY-SA 4.0, December 1982. Archived winter scene.',
      photoAlt:'Historic winter photograph of the Gooseberry River waterfall near the highway bridge',
      photoNote:'Archival winter view, not a photo of current ice or trail conditions.',
      weatherPoint:{lat:47.144,lon:-91.47},
      supported:['short','half','full']
    },
    {
      id:'munising-snowshoe', goal:'snowshoe', region:'Michigan Upper Peninsula',label:'MUNISING / MICHIGAN',
      title:'Follow the blue posts into the snow',short:'The marked Pictured Rocks snowshoe loop',
      lat:46.42,lon:-86.61,tz:'America/Detroit',effort:'half',
      featured:'East of Munising, blue trail posts lead a forest loop through beech, maple and conifers. It is a snowshoe trail by design, rather than a ski track that walkers are borrowing.',
      why:'The National Park Service marks a 2.65-mile lollipop loop. The adjacent groomed ski tracks are not for snowshoes. The Munising Falls Trail is separately closed due to washout and is not part of this outing.',
      blocker:'Check winter road and parking notices, snowfall, and the NPS conditions page before leaving. The Munising Falls Trail closure is not lifted by good weather.',
      length:'2.65-mile marked snowshoe loop',
      official:'https://www.nps.gov/thingstodo/snowshoeing-at-pictured-rocks.htm',
      conditions:'https://www.nps.gov/piro/planyourvisit/conditions.htm',
      entrance:'https://www.nps.gov/piro/planyourvisit/winter-road-closures.htm',
      arrival:'Pictured Rocks Ski Trail Parking Area, East City Limits Road, Munising, Michigan',
      google:'https://www.google.com/maps/search/?api=1&query=Pictured%20Rocks%20ski%20trail%20parking%20East%20City%20Limits%20Road%20Munising',
      photo:'https://www.nps.gov/common/uploads/cropped_image/primary/751C9AA8-C64F-4206-5DFFEFE6650D4E9A.jpg?mode=crop&quality=85&width=1100',
      photoPage:'https://www.nps.gov/thingstodo/snowshoeing-at-pictured-rocks.htm',
      photoCredit:'National Park Service photograph, Pictured Rocks snowshoe trail. Archival winter scene.',
      photoAlt:'Snowshoer on a marked forest trail in Pictured Rocks National Lakeshore',
      photoNote:'Park archive, not a live look at the trail.',
      weatherPoint:{lat:46.42,lon:-86.61},
      supported:['half','full']
    },
    {
      id:'meyers-lakeshore', goal:'coast', region:'Wisconsin South Shore',label:'BAYFIELD / WISCONSIN',
      title:'Find the sandstone above the lake',short:'The overland Apostle Islands Lakeshore Trail',
      lat:46.9,lon:-91.04,tz:'America/Chicago',effort:'full',
      featured:'From Meyers Beach, the Lakeshore Trail climbs through hardwoods and ravines toward the red sandstone above Superior. In winter the steps and narrow approaches can collect ice even when the lake looks quiet.',
      why:'NPS describes a 3.6-mile round trip to the Crevasse on rugged overland trail. This is NOT a route across frozen Lake Superior to the ice caves. The park controls ice-cave access separately.',
      blocker:'The trail can be steep, slippery or deeply snowed in. Confirm NPS conditions and Meyers Beach parking before setting out. Never treat lake ice as the trail.',
      length:'3.6-mile round trip to the Crevasse, with rugged sections',
      official:'https://www.nps.gov/apis/planyourvisit/hiking.htm',
      conditions:'https://www.nps.gov/apis/planyourvisit/conditions.htm',
      entrance:'https://www.nps.gov/apis/planyourvisit/directions.htm',
      arrival:'Meyers Beach, Bayfield County, Wisconsin',
      google:'https://www.google.com/maps/search/?api=1&query=Meyers%20Beach%20Apostle%20Islands%20Wisconsin',
      photo:'https://www.nps.gov/apis/images/100_2791.jpg?autorotate=false&maxwidth=1100',
      photoPage:'https://www.nps.gov/apis/planyourvisit/hiking.htm',
      photoCredit:'National Park Service photograph of Lakeshore Trail steps. Summer archive.',
      photoAlt:'Steep stone and log steps along the Apostle Islands Lakeshore Trail in green summer forest',
      photoNote:'Summer archive shows the terrain, NOT current winter footing.',
      weatherPoint:{lat:46.9,lon:-91.04},
      supported:['full']
    }
  ]);
  const GOALS=Object.freeze({falls:'Frozen waterfall walk',snowshoe:'Snowshoe forest',coast:'Sandstone coast'});
  const EFFORTS=['short','half','full'];
  const EFFORT_LABELS={short:'A short outing',half:'A half day outside',full:'An extended outing'};
  function getPlace(id){return PLACES.find(p=>p.id===id)||null;}
  function validPref(prefs){
    return {goal:Object.hasOwn(GOALS,prefs?.goal)?prefs.goal:'falls',
      effort:EFFORTS.includes(prefs?.effort)?prefs.effort:'short',
      day:['today','tomorrow','third'].includes(prefs?.day)?prefs.day:'today'};
  }
  function recommend(prefs,accessById={}){
    const p=validPref(prefs);
    const candidate=PLACES.find(place=>place.goal===p.goal);
    if(!candidate)return {kind:'none',reason:'No sourced outing matches that interest yet.',prefs:p,place:null};
    const closure=accessById[candidate.id];
    if(closure?.status==='closed'&&closure?.verified===true){
      return {kind:'blocked',reason:'The land manager reports this outing closed. Do not recommend it.',prefs:p,place:candidate,access:closure};
    }
    if(!candidate.supported.includes(p.effort)){
      return {kind:'effort-mismatch',reason:'This documented outing does not fit the selected time and effort. Change your pace or choose another winter interest.',prefs:p,place:candidate};
    }
    return {kind:'candidate',place:candidate,prefs:p,reason:'Activity and effort match the published route description.',access:closure||{status:'check',verified:false}};
  }
  function dateKey(date,tz){
    if(!(date instanceof Date)||!Number.isFinite(date.valueOf()))return null;
    return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  }
  function targetKey(now,tz,day){
    const shift=day==='tomorrow'?1:day==='third'?2:0;
    return dateKey(new Date(now.getTime()+shift*86400000),tz);
  }
  function parseWind(value){
    if(typeof value!=='string')return null;
    const matches=[...value.matchAll(/(\d+(?:\.\d+)?)/g)].map(x=>Number(x[1]));
    return matches.length?Math.max(...matches):null;
  }
  function classifyWeather(hour){
    const wind=parseWind(hour?.windSpeed),temp=Number.isFinite(hour?.temperature)?hour.temperature:null;
    const forecast=String(hour?.shortForecast||'');
    if(/thunderstorm|blizzard|ice storm|freezing rain/i.test(forecast))return {kind:'advisory',label:'Potential disruptive weather'};
    if(wind!==null&&wind>=30)return {kind:'advisory',label:'Strong forecast wind'};
    if(temp!==null&&hour?.temperatureUnit==='F'&&temp<=0)return {kind:'advisory',label:'Very cold forecast air'};
    if(/snow|sleet|rain/i.test(forecast))return {kind:'variable',label:'Precipitation in the forecast'};
    return {kind:'neutral',label:'Review forecast details'};
  }
  function forecastWindow(json,now,tz,day){
    const update=json?.properties?.updateTime||json?.properties?.generatedAt;
    const updateTime=new Date(update||NaN).getTime();
    if(!Number.isFinite(updateTime))return {status:'unknown',note:'The weather feed has no trustworthy issue timestamp.',hours:[]};
    const ageHours=(now.getTime()-updateTime)/3600000;
    if(ageHours>6||ageHours< -0.2)return {status:'stale',note:'NWS issue time is outside the six-hour freshness window.',issued:update,hours:[]};
    const periods=Array.isArray(json?.properties?.periods)?json.properties.periods:[];
    const key=targetKey(now,tz,day);
    const candidates=periods.filter(h=>h?.startTime&&dateKey(new Date(h.startTime),tz)===key&&h.isDaytime!==false);
    const future=candidates.filter(h=>new Date(h.endTime||h.startTime).getTime()>now.getTime());
    const hours=future.slice(0,10).map(h=>({
      time:h.startTime,temperature:Number.isFinite(h.temperature)?h.temperature:null,
      tempUnit:h.temperatureUnit||'',wind:h.windSpeed||'',
      forecast:h.shortForecast||'Forecast detail unavailable',
      precip:Number.isFinite(h.probabilityOfPrecipitation?.value)?h.probabilityOfPrecipitation.value:null,
      ...classifyWeather(h)
    }));
    return {status:hours.length?'available':'empty',note:hours.length?'NWS hourly forecast, not a trail or access report.':'No future daytime NWS periods for that day.',issued:update,day:key,hours};
  }
  function safeGoogleUrl(place){
    return /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/.test(place?.google||'')?place.google:null;
  }
  return {PLACES,GOALS,EFFORT_LABELS,SOURCE_REVIEWED,validPref,getPlace,recommend,
    dateKey,targetKey,parseWind,classifyWeather,forecastWindow,safeGoogleUrl};
});
