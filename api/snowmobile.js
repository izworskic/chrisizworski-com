let cache=null;
function send(res,payload,status=200){res.status(status);res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex, nofollow');res.json(payload);}
function reportDate(raw){if(!raw)return null;const cleaned=String(raw).replace(/(\d+)(st|nd|rd|th)/,'$1').replace('@',' ');const d=new Date(cleaned);return Number.isFinite(d.getTime())?d.toISOString():null;}
function parseSourceTime(value){
  if(value==null||value==='')return null;
  let raw=value;
  if(typeof raw==='string'&&/^\d+$/.test(raw.trim()))raw=Number(raw.trim());
  if(typeof raw==='number'&&Number.isFinite(raw)&&raw<1e12)raw*=1000;
  const d=new Date(raw);return Number.isFinite(d.getTime())?d.toISOString():null;
}
function newestIso(values){
  const valid=values.map(parseSourceTime).filter(Boolean).map(x=>new Date(x)).sort((a,b)=>b-a);
  return valid[0]?.toISOString()||null;
}
function reportHazards(text=''){
  const s=String(text).toLowerCase(),out=[];
  if(/standing water|water hole|water on|wet swamp|water near/.test(s))out.push('WATER');
  if(/\bmud|muddy|soft dirt/.test(s))out.push('MUD');
  if(/logging|log trucks|timber operation/.test(s))out.push('LOGGING');
  if(/road riding|road section|road shoulder/.test(s))out.push('ROAD');
  if(/\bicy|ice base|bare ice/.test(s))out.push('ICE');
  return [...new Set(out)];
}
function conditionBand(raw=''){
  const s=String(raw).toLowerCase();
  if(/excellent/.test(s))return'EXCELLENT';
  if(/poor|bad|bare|mud/.test(s))return'POOR';
  if(/fair|mixed/.test(s))return'FAIR';
  if(/good|great/.test(s))return'GOOD';
  return null;
}
function groomingSummary(reports=[]){
  const known=reports.filter(r=>r?.lastGroomedAt);
  if(!known.length)return {state:'UNKNOWN',label:'Grooming not verified',known:0,recent:0};
  const recent=known.filter(r=>['LIVE','VERY_RECENT','RECENT'].includes(r.groomingFreshness?.state));
  const aging=known.filter(r=>r.groomingFreshness?.state==='AGING');
  if(recent.length===known.length)return {state:'RECENT',label:known.length>1?'Both club grooming fields are within 24h':'Club grooming field is within 24h',known:known.length,recent:recent.length};
  if(recent.length)return {state:'MIXED',label:`${recent.length} of ${known.length} club grooming fields are within 24h`,known:known.length,recent:recent.length};
  if(aging.length)return {state:'AGING',label:'Latest structured grooming evidence is more than 24h old',known:known.length,recent:0};
  return {state:'STALE',label:'Structured grooming fields are stale',known:known.length,recent:0};
}
module.exports=async function(req,res){
  if(req.method!=='GET')return send(res,{error:'Method not allowed'},405);
  const now=new Date();if(cache&&Date.now()-cache.savedAt<300000)return send(res,{...cache.payload,operational:{...cache.payload.operational,dataState:'cached-fresh'}});
  try{
    const [{fetchDnrCorridor,fetchDnrClosures,fetchClub,fetchWeather},{isSnowmobileSeason,freshness,featureLatitude,corridorSection,closureForSegment,scoreSegment,routeDecision,confidence,rankRideWindows},{interpretClubReport}]=await Promise.all([
      import('../lib/snowmobile/sources.mjs'),import('../lib/snowmobile/engine.mjs'),import('../lib/snowmobile/harness.mjs')
    ]);
    const [dnrR,closuresR,grayR,gayR,weatherR]=await Promise.allSettled([fetchDnrCorridor(),fetchDnrClosures(),fetchClub('grayling'),fetchClub('gaylord'),fetchWeather()]);
    if(dnrR.status==='rejected')throw dnrR.reason;
    const season=isSnowmobileSeason(now),dnr=dnrR.value;
    const closures=closuresR.status==='fulfilled'?(closuresR.value.features||[]):[];
    const gray=grayR.status==='fulfilled'?grayR.value:null,gay=gayR.status==='fulfilled'?gayR.value:null,weather=weatherR.status==='fulfilled'?weatherR.value:{};
    for(const r of [gray,gay])if(r){r.reportedAt=reportDate(r.reportedRaw);r.lastGroomedAt=reportDate(r.lastGroomedRaw);r.freshness=freshness(r.reportedAt,'report');r.groomingFreshness=freshness(r.lastGroomedAt,'grooming');r.hazards=reportHazards(r.reportText);}
    const features=(dnr.features||[]).filter(f=>f?.geometry);
    const segments=features.slice(0,300).map((f,i)=>{
      const p=f.properties||{},lat=featureLatitude(f.geometry),section=corridorSection(lat);
      const report=section==='gaylord'||section==='waters'?gay:gray;
      const wx=section==='gaylord'||section==='waters'?weather?.gaylord:weather?.grayling;
      const base={id:p.Unique_ID||`seg-${i+1}`,section,latitude:lat,trailNetwork:p.Trail_Netw||null,groomingSponsor:p.Groom_Spon||null,sourceStatusField:p.Status||null,surface:p.Surface||null,onRoad:p.On_Road||null,miles:Number(p.Miles)||null,comments:p.Comments||null,properties:p,geometry:f.geometry};
      const verifiedClosure=closuresR.status==='fulfilled'?closureForSegment(base,closures):null;
      return {...base,...scoreSegment(base,{clubReport:report,weather:wx,season,verifiedClosure})};
    });
    const route=routeDecision(segments,{season,closureLayerVerified:closuresR.status==='fulfilled'});
    const sectionOrder=['grayling','frederic','waters','gaylord'];
    const sectionLabels={grayling:'Grayling',frederic:'Frederic',waters:'Waters',gaylord:'Gaylord'};
    const sections=sectionOrder.map(key=>{const ss=segments.filter(s=>s.section===key);const d=routeDecision(ss,{season,closureLayerVerified:closuresR.status==='fulfilled'});return {key,label:sectionLabels[key],segmentCount:ss.length,...d};});
    const timing=rankRideWindows(weather,season);
    const grooming=groomingSummary([gray,gay].filter(Boolean));
    const trailEdited=newestIso(features.map(f=>f?.properties?.EditDate));
    const closureEdited=newestIso(closures.map(f=>f?.properties?.last_edite||f?.properties?.created_da));
    const newestDatedSource=newestIso([gray?.reportedAt,gay?.reportedAt,weather?.grayling?.generatedAt,weather?.gaylord?.generatedAt,trailEdited,closureEdited]);
    const decisionFeedCount=[
      features.length>0,
      closuresR.status==='fulfilled',
      gray&&!gray.error,
      gay&&!gay.error,
      weatherR.status==='fulfilled'&&(!weather?.grayling?.error||!weather?.gaylord?.error)
    ].filter(Boolean).length;
    const sourceSummary={decisionFeedCount,contextFeedCount:1,newestDatedSource,trailEdited,closureEdited,label:`${decisionFeedCount} decision feed${decisionFeedCount===1?'':'s'} + NOAA snow map`};
    const coverage=features.length?Math.min(1,segments.length/features.length):0;
    const contradictions=[];
    for(const [area,r] of [['Grayling',gray],['Gaylord',gay]]){
      if(r?.condition&&r?.freshness?.state&&!['STALE','UNKNOWN'].includes(r.freshness.state)&&r?.groomingFreshness?.state==='STALE'){
        contradictions.push({type:'STALE_GROOMING_FIELD',area,severity:'medium',message:`${area} has a current/recent condition report beside a stale structured “last groomed” field. The stale grooming date is not averaged into current grooming evidence.`});
      }
    }
    const closedSegments=segments.filter(s=>s.veto||s.band==='CLOSED');
    if(closedSegments.length){
      for(const [area,r] of [['Grayling',gray],['Gaylord',gay]]){
        if(r?.condition&&/good|excellent/i.test(r.condition)){
          contradictions.push({type:'OFFICIAL_CLOSURE_OVERRIDES_FAVORABLE_CLUB_CONDITION',area,severity:'high',message:`A favorable ${area} club condition cannot override a matched official DNR closure on a required corridor segment.`});
        }
      }
    }
    const requestOidc=Array.isArray(req.headers?.['x-vercel-oidc-token'])?req.headers['x-vercel-oidc-token'][0]:(req.headers?.['x-vercel-oidc-token']||'');
    const jevPairs=(await Promise.all([['grayling',gray],['gaylord',gay]].filter(([,r])=>r?.reportText).map(async([key,r])=>[key,await interpretClubReport({text:r.reportText,source:r.name,structuredCondition:r.condition},requestOidc)])));
    const jevReports=Object.fromEntries(jevPairs);
    for(const [key,r] of [['grayling',gray],['gaylord',gay]]){
      const interpreted=jevReports[key],structured=conditionBand(r?.condition);
      if(interpreted?.accepted&&interpreted.condition&&structured&&interpreted.condition!==structured){
        contradictions.push({type:'JEV_STRUCTURED_CONDITION_MISMATCH',area:key==='grayling'?'Grayling':'Gaylord',severity:'low',message:`JEV read the narrative as ${interpreted.condition}, while the club’s structured condition field is ${structured}. The structured club field remains authoritative; JEV does not alter the score.`});
      }
    }
    const conflicts=contradictions.length;
    const conf=confidence({officialFresh:true,closureLayerVerified:closuresR.status==='fulfilled',clubReports:[gray,gay].filter(Boolean),weatherFresh:weatherR.status==='fulfilled',segmentCoverage:coverage,conflicts});
    const payload={generatedAt:now.toISOString(),season:{active:season,officialWindow:'Dec. 1–Mar. 31'},
      route:{name:'Grayling → Frederic → Waters → Gaylord',...route,confidence:conf},sections,timing,grooming,sourceSummary,contradictions,
      segments,
      scoredGeometry:{type:'FeatureCollection',features:segments.map(s=>({type:'Feature',properties:{id:s.id,section:s.section,trailNetwork:s.trailNetwork,groomingSponsor:s.groomingSponsor,score:s.score,band:s.band,legalState:s.legalState,surface:s.surface,onRoad:s.onRoad,miles:s.miles,reasons:s.reasons},geometry:s.geometry}))},
      geometry:{type:'FeatureCollection',features},closures:{verified:closuresR.status==='fulfilled',features:closures},
      reports:{grayling:gray,gaylord:gay},weather,
      sources:[
        {name:'Michigan DNR designated snowmobile trails',url:'https://www.michigan.gov/dnr/things-to-do/snowmobiling/where',authority:'official designated-trail geometry and attributes'},
        {name:'Michigan DNR temporary trail closures',url:'https://www.michigan.gov/dnr/about/newsroom/closures',authority:'official current closure/detour evidence'},
        {name:'MISORVA trail reports',url:'https://misorva.org/trail-report/',authority:'club/operator condition evidence; DNR does not control timeliness or accuracy'},
        {name:'NOAA / NOHRSC snow analysis',url:'https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer',authority:'regional analyzed snow depth; context only, not trail base'},
        {name:'National Weather Service',url:'https://weather.gov/',authority:'weather forecast'}
      ],
      truthBoundary:{naturalSnowIsTrailBase:false,nohrscSnowDepthIsTrailBase:false,forecastSnowIsAccumulatedSnow:false,openDoesNotMeanGood:true,missingClosureIsNotConfirmedOpen:true,statusFieldDoesNotSetLegalState:true,jevCannotSetLegalStatus:true},
      operational:{dataState:'fresh',jev:jevReports,sourceFailures:{closures:closuresR.status==='rejected'?String(closuresR.reason):null,weather:weatherR.status==='rejected'?String(weatherR.reason):null},modelBoundary:'JEV can only classify bounded report relevance. It cannot invent facts, set legal status, alter geometry, or convert snow depth into trail base.'}
    };
    cache={savedAt:Date.now(),payload};return send(res,payload);
  }catch(error){
    if(cache)return send(res,{...cache.payload,operational:{...cache.payload.operational,dataState:'stale-last-known',staleReason:String(error?.message||error)}});
    return send(res,{error:'Live snowmobile source bundle unavailable',generatedAt:now.toISOString(),detail:String(error?.message||error)},503);
  }
};