/* Shared interpretation contract for conditions-based outdoor windows.
 * Different phenomena have independent engines. No cross-species or cross-activity score.
 * UMD: tested with node:test, consumed in first-party browser assets. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ThisWeekEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const REGION_OPTIONS=[
    {id:'bay-city',name:'Bay City / Saginaw Bay'},
    {id:'traverse-city',name:'Traverse City'},
    {id:'marquette',name:'Marquette / Upper Peninsula'}
  ];
  const ROCK_NAMES={
    'agate-beach-grand-marais':'Agate Beach, Grand Marais',
    'muskallonge-lake-state-park':'Muskallonge Lake State Park',
    'crisp-point':'Crisp Point Lighthouse beach',
    'mclain-state-park':'F.J. McLain State Park',
    'presque-isle-park':'Presque Isle Park, Marquette',
    'black-river-harbor':'Black River Harbor',
    'petoskey-state-park':'Petoskey State Park',
    'fishermans-island-state-park':"Fisherman's Island State Park",
    'vans-beach-leland':"Van's Beach, Leland",
    'frankfort-beach':'Frankfort Public Beach',
    'wilderness-state-park':'Wilderness State Park',
    'hoeft-state-park':'P.H. Hoeft State Park',
    'rockport-state-recreation-area':'Rockport State Recreation Area'
  };
  const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
  const validDate=s=>typeof s==='string'&&DATE_RE.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
  const fmtDate=s=>validDate(s)?new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'}):null;
  const ageMinutes=(when,now)=>{const ts=Date.parse(when||'');return Number.isFinite(ts)?(now-ts)/60000:null;};
  const fresh=(when,now,maxM=180)=>{const m=ageMinutes(when,now);return m!=null&&m>=-15&&m<=maxM;};
  const make=(id,state,headline,reason,trigger,source,updated,scope,details='')=>({
    id,state,headline,reason,trigger,source,updated:updated||null,scope,details
  });
  function shed(data,now=Date.now(),place='Bay City'){
    const source='NOAA snow analysis + NWS forecast · modeled cover, not observed sheds';
    const when=data?.forecastUpdatedAt||data?.generatedAt||null;
    if(!data||data.error)return make('shed','unavailable','Search window unavailable','The forecast feed did not return usable data. No ground-visibility conclusion is possible.','Retry the feed; inspect snow at your intended property.',source,null,place);
    if(data.season!=='SEARCH_SEASON')return make('shed','seasonal','Not the core shed-search window','January–April is broad calendar context. Neither season nor the weather can date when any buck drops antlers.','Return in late winter; check local snow before searching.',source,when,place);
    if(!fresh(when,now))return make('shed','unavailable','Forecast needs refreshing','The NWS forecast timestamp is absent or outside the freshness window.','Refresh the dedicated shed search planner.',source,when,place);
    if(!Array.isArray(data.daily)||data.daily.length<3)return make('shed','unavailable','No usable seven-day outlook','Not enough complete forecast days.','Check official forecast and actual snow cover.',source,when,place);
    const snowy=data.snowDepth?.status;
    const trend=data.snowTrend?.status;
    const retreats=['persistently_bare','recent_retreat','possible_brief_thaw'];
    const disagrees=(snowy==='modeled-cover'&&retreats.includes(trend))||
      (snowy==='modeled-bare'&&['covered','thinning'].includes(trend));
    const trendNote=disagrees?'NOAA and the separate model history disagree; treat local snow as unknown.':
      trend==='persistently_bare'?'The historical model has been near zero for at least seven days, but shaded cover may differ.':
      trend==='recent_retreat'?'The separate historical model shows recent retreat; persistence remains uncertain.':
      trend==='possible_brief_thaw'?'The model shows a possible one-day thaw, not proven exposed ground.':
      trend==='thinning'?'The historical model shows thinning, not necessarily exposed ground.':'The 14-day model history is unavailable or not decisive.';
    const tomorrow=data.daily.slice(0,4);
    const thaw=tomorrow.some(d=>Number.isFinite(d.thawHours)&&d.thawHours>=5);
    if(snowy==='modeled-cover')return make('shed','check','Snow still modeled on the ground','NOAA shows snow at the regional sampling point. It can hide sheds, and deer in winter cover should not be disturbed.',thaw?'A thaw is forecast, but verify exposed ground before walking.':'Wait for retreating snow or exposed ground; do not push deer in deep cover.',source,when,place,'Regional models only; shaded timber may differ. '+trendNote);
    if(snowy==='modeled-bare')return make('shed','check','Possible exposed-ground window','NOAA shows no snow at the sampled regional point, but sheds and access remain unverified.','Inspect the actual property for clear ground and avoid winter deer concentrations.',source,when,place,'A clear snow grid cell never proves an antler is present. '+trendNote);
    return make('shed','check','Check the snow before deciding','Existing snow cover is unknown; the weather forecast cannot reconstruct it.','Inspect NOAA snow depth and actual ground conditions.',source,when,place);
  }
  function maple(data,now=Date.now(),place='Bay City'){
    const source='NWS freeze/thaw outlook · sap flow not directly observed';
    const when=data?.fetchedAt||null;
    if(!data||data.error)return make('maple','unavailable','Maple outlook unavailable','Cannot confirm current freeze/thaw conditions.','Retry the dedicated maple weather forecast.',source,null,place);
    if(data.phase==='OFF_SEASON')return make('maple','seasonal','Outside sap-weather monitoring','The maple engine is off-season; it does not claim trees are running.','Return during late winter and spring for overnight-freeze/daytime-thaw windows.',source,null,place);
    if(data.phase!=='WEATHER_WINDOW'||!fresh(when,now)||!Array.isArray(data.daily))return make('maple','unavailable','Current weather evidence missing','The source is incomplete or stale.','Open the maple planner for an updated forecast.',source,when,place);
    const best=data.summary||{};
    const date=fmtDate(best.bestDay);
    if(!date||!Number.isFinite(best.bestScore)||best.evaluatedDays<1)return make('maple','check','No complete freeze/thaw day','Not enough forecast hours to compare the week.','Recheck as more hourly data becomes available.',source,when,place);
    if(best.bestLevel==='FAVORABLE')return make('maple','opportunity','Freeze/thaw setup worth checking','Best forecast weather window: '+date+'. This is not measured sap flow; dormancy and buds still need a field check.','Inspect your maples and tree readiness before tapping.',source,when,place,'Seven-day weather heuristic.');
    if(best.bestLevel==='POSSIBLE')return make('maple','check','Possible sap-weather window','Best available freeze/thaw setup: '+date+'. Sap flow is not observed.','Watch overnight lows and daytime thawing; check trees locally.',source,when,place,'Seven-day weather heuristic.');
    return make('maple','wait','Weak freeze/thaw setup','Current forecast does not show a strong sap-weather pattern.','Watch for another overnight-freeze/daytime-thaw cycle.',source,when,place);
  }
  function rock(data,now=Date.now()){
    const source='Open-Meteo past 72h wind + NOAA NDBC + NWS shore alerts';
    const when=data?.generatedAt||null,scope='Michigan shorelines · statewide';
    if(!data||data.error||!fresh(when,now,120))return make('rock','unavailable','Beach evidence unavailable','Weather or source timestamp cannot be verified.','Refresh the rockhounding conditions tool.',source,when,scope);
    if(data.sources?.wind?.status!=='live'||data.sources?.alerts?.status!=='live')return make('rock','unavailable','Safety or wind data missing','A reliable shore recommendation requires current wind and alert coverage.','Check local NWS beach/marine warnings directly.',source,when,scope);
    const sites=Array.isArray(data.sites)?data.sites.filter(s=>ROCK_NAMES[s?.id]):[];
    if(!sites.length)return make('rock','unavailable','No verified public shore sample','The current source did not return approved sample locations.','Open the full rockhounding planner.',source,when,scope);
    const best=sites.find(s=>s.verdict?.code==='PRIME')||sites.find(s=>s.verdict?.code==='GOOD');
    if(best){
      const name=ROCK_NAMES[best.id],prime=best.verdict.code==='PRIME';
      return make('rock',prime?'opportunity':'check',prime?'Recently worked beach window':'Possible recently stirred beach',name+' · '+(best.verdict?.label||'Weather-based shore assessment')+'. Conditions vary by beach; collecting rules and safe access are not verified by this summary.','Use the full beach map to check exact warnings, permissions and water conditions before going.',source,when,scope,'Based on a recent 72-hour wind window, not seven-day rock finds.');
    }
    if(sites.some(s=>['STORM','BUILDING'].includes(s.verdict?.code)))return make('rock','wait','Some shorelines are still rough','Onshore wind or warnings may make beach edges unsafe at sampled locations.','Wait until winds and waves subside; compare individual shorelines.',source,when,scope);
    if(sites.some(s=>s.verdict?.code==='QUIET'||s.verdict?.code==='ANYTIME'))return make('rock','check','No strong fresh-stone signal','The sampled shoreline data does not show a standout post-storm window.','Watch the next onshore blow and a subsequent safe lull.',source,when,scope);
    return make('rock','unavailable','No dependable shore readout','The returned shoreline assessments were incomplete.','Recheck the source and NWS advisories.',source,when,scope);
  }
  function waterfowl(data,now=Date.now()){
    const source='NWS 72-hour freeze exposure + NOAA mapped ice context (where dated)';
    const place=data?.region?.name||'Selected Midwest wetland region';
    const when=data?.generatedAt||null;
    if(!data||data.error||!fresh(when,now,120))
      return make('waterfowl','unavailable','Freeze-line evidence unavailable','Current regional inputs are absent or stale. No migration conclusion is possible.','Use the full waterfowl tracker for independently dated surveys.',source,when,place);
    const weather=data.weather,shift=data.habitatShift||{};
    if(weather?.status!=='forecast'||!Number.isFinite(weather.longestFreezingRunHours)||!Number.isFinite(weather.forecastColdDegreeHours))
      return make('waterfowl','unavailable','NWS freeze signal missing','A current, complete hourly forecast is needed before interpreting marsh-freeze pressure.','Retry forecast and inspect nearby wetland reports.',source,when,place);
    const chart=shift.lakeChartStatus==='dated_official_chart';
    if(shift.marshPressure==='high'||shift.marshPressure==='building'){
      if(shift.status==='big_water_icing')
        return make('waterfowl','check','Marsh freeze and big-water icing','The modeled cold exposure is significant and the reference large-water chart shows heavy ice. Actual birds may move to rivers or farther along the flyway.','Check official access and recent dated bird counts, not assumed concentrations.',source,when,place,'Wetland ice is not directly observed in this summary.');
      const open=shift.status==='lake_refuge_possible'&&chart;
      return make('waterfowl','check',open?'Shallow-marsh freeze, mapped open-water potential':'Marsh-freezing pressure is building',
        'Forecast freezing: '+weather.longestFreezingRunHours+' consecutive hours, '+weather.forecastColdDegreeHours+' cold-degree hours. '+(open?'A NOAA lake chart identifies lower-ice conditions at a reference point.':'Actual marsh ice and bird concentrations remain unverified.'),
        'Look for dated local counts and publicly accessible large water; do not infer duck numbers from weather.',source,when,place,
        '72-hour forecast exposure, not an observed migration or confirmed marsh ice.');
    }
    return make('waterfowl','context','Limited marsh-freezing pressure in forecast','The coming 72 hours do not show a strong modeled shallow-marsh freeze. That does not indicate birds are absent.', 'Watch the next cold front and independent dated wetland observations.',source,when,place,'No regional bird count or migration probability is inferred.');
  }
  function eagle(){
    return make('eagle','context','Plan habitat, not eagle sightings','Open-water feeding concentrations and aerial displays are different behaviors. Live weather alone does not confirm either is happening.','Choose a public viewing corridor, check access and weather, and look for dated observed counts.', 'NWS viewing weather + source-dated survey observations in the field tool',null,'Michigan / Upper Midwest');
  }
  return {REGION_OPTIONS,ROCK_NAMES,ageMinutes,fresh,shed,maple,rock,waterfowl,eagle};
});
