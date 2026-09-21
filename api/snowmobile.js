/*
 * Michigan Snowmobile Conditions API.
 *
 * Two response shapes, selected by the `region` query parameter, so a
 * statewide page never has to download all seven regions' full segment and
 * geometry data (that payload measured 26MB uncompressed in testing):
 *
 *   GET /api/snowmobile            -> lightweight statewide index: one
 *                                      compact summary object per region,
 *                                      no segment list, no geometry.
 *   GET /api/snowmobile?region=key -> full detail for exactly one region:
 *                                      scored segments, map geometry, full
 *                                      weather, and (for grayling-gaylord
 *                                      only) club reports and JEV.
 */
const CACHE=new Map();
const CACHE_MS=300000;
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
/* A segment carries only the attributes the UI actually reads. The raw
 * ArcGIS attribute bag and a duplicate unscored geometry copy are dropped;
 * scoredGeometry below is the single place geometry travels to the client. */
function trimSegment(s){
  return {id:s.id,section:s.section,trailNetwork:s.trailNetwork,groomingSponsor:s.groomingSponsor,groomType:s.groomType,officialStatus:s.officialStatus,surface:s.surface,onRoad:s.onRoad,miles:s.miles,comments:s.comments,county:s.county,score:s.score,band:s.band,legalState:s.legalState,reasons:s.reasons,veto:s.veto||false};
}
/* ArcGIS returns full double-precision coordinates (~15 significant
 * digits); six decimal places is sub-meter precision, plenty for a trail
 * line on a web map, and roughly halves the geometry payload. */
function roundCoords(node){
  if(Array.isArray(node)){
    if(node.length===2&&typeof node[0]==='number'&&typeof node[1]==='number')return [Math.round(node[0]*1e6)/1e6,Math.round(node[1]*1e6)/1e6];
    return node.map(roundCoords);
  }
  return node;
}
function scoredGeometryFrom(segments){
  return {type:'FeatureCollection',features:segments.filter(s=>s.geometry).map(s=>({type:'Feature',properties:{id:s.id,section:s.section,trailNetwork:s.trailNetwork,groomingSponsor:s.groomingSponsor,groomType:s.groomType,officialStatus:s.officialStatus,score:s.score,band:s.band,legalState:s.legalState,surface:s.surface,onRoad:s.onRoad,miles:s.miles,reasons:s.reasons},geometry:{...s.geometry,coordinates:roundCoords(s.geometry.coordinates)}}))};
}
/* Bounding box actually covered by a region's returned trail geometry, used
 * client-side both to frame the map and to request the correctly-located
 * NOAA snow-depth overlay for that region (never a hardcoded Grayling box). */
function bboxFromFeatures(features){
  let minLon=Infinity,minLat=Infinity,maxLon=-Infinity,maxLat=-Infinity;
  const visit=(node)=>{
    if(Array.isArray(node)){
      if(node.length===2&&typeof node[0]==='number'&&typeof node[1]==='number'){
        if(node[0]<minLon)minLon=node[0];if(node[0]>maxLon)maxLon=node[0];
        if(node[1]<minLat)minLat=node[1];if(node[1]>maxLat)maxLat=node[1];
      }else node.forEach(visit);
    }
  };
  for(const f of features)if(f?.geometry?.coordinates)visit(f.geometry.coordinates);
  if(!Number.isFinite(minLon))return null;
  const padLon=Math.max(0.05,(maxLon-minLon)*0.06),padLat=Math.max(0.05,(maxLat-minLat)*0.06);
  return {minLon:minLon-padLon,minLat:minLat-padLat,maxLon:maxLon+padLon,maxLat:maxLat+padLat};
}
/* Compact weather headline for the statewide index (no periods/hourly). */
/* Closures shown to a region's own map: only the closures that actually
 * matched one of that region's segments (via the same closureForSegment
 * name/number matching already used for scoring), not the full statewide
 * 186-record layer, which would be irrelevant clutter on every region and
 * roughly halves the point of scoping the fetch by region in the first place. */
function trimClosures(matched){
  return {type:'FeatureCollection',features:matched.filter(c=>c?.geometry).map(c=>({type:'Feature',properties:{trailName:c.properties?.TrailNameP||c.properties?.DNRTrail||null,detail:c.properties?.PublicComm||c.properties?.OpenClosed||null},geometry:{...c.geometry,coordinates:roundCoords(c.geometry.coordinates)}}))};
}
function weatherHeadline(w){
  if(!w||w.error)return {available:false};
  return {available:true,maxTempF:w.maxTempF,minTempF:w.minTempF,snowSignal:w.snowSignal,rainSignal:w.rainSignal,snowLowIn:w.snowLowIn,snowHighIn:w.snowHighIn,generatedAt:w.generatedAt||null};
}

async function buildLegacyCorridor({region,season,closures,closuresOk,lib}){
  const {fetchDnrCorridor,fetchClub,fetchWeather}=lib.sources;
  const {featureLatitude,corridorSection,closureForSegment,scoreSegment,routeDecision,confidence,rankRideWindows}=lib.engine;
  const {interpretClubReport}=lib.harness;
  const [dnrR,grayR,gayR,weatherR]=await Promise.allSettled([fetchDnrCorridor(),fetchClub('grayling'),fetchClub('gaylord'),fetchWeather()]);
  if(dnrR.status==='rejected')throw dnrR.reason;
  const dnr=dnrR.value;
  const gray=grayR.status==='fulfilled'?grayR.value:null,gay=gayR.status==='fulfilled'?gayR.value:null,weather=weatherR.status==='fulfilled'?weatherR.value:{};
  for(const r of [gray,gay])if(r){r.reportedAt=reportDate(r.reportedRaw);r.lastGroomedAt=reportDate(r.lastGroomedRaw);r.freshness=lib.engine.freshness(r.reportedAt,'report');r.groomingFreshness=lib.engine.freshness(r.lastGroomedAt,'grooming');r.hazards=reportHazards(r.reportText);}
  const features=(dnr.features||[]).filter(f=>f?.geometry);
  const matchedClosures=[];
  const segments=features.slice(0,300).map((f,i)=>{
    const p=f.properties||{},lat=featureLatitude(f.geometry),section=corridorSection(lat);
    const report=section==='gaylord'||section==='waters'?gay:gray;
    const wx=section==='gaylord'||section==='waters'?weather?.gaylord:weather?.grayling;
    const base={id:p.Unique_ID||p.GlobalID||`seg-${i+1}`,section,latitude:lat,trailNetwork:p.Trail_Netw||p.TrailNetwork||p.TrailNamePrimary||null,groomingSponsor:p.Groom_Spon||p.TrailGrooming||null,groomType:p.TrailGroomType||null,officialStatus:p.OpenClosedStatusSnowmobile||null,sourceStatusField:p.Status||p.TrailApprovalStatus||null,surface:p.Surface||p.SurfaceType||null,onRoad:p.On_Road||p.TrailOnRoad||null,miles:Number(p.Miles??p.SegmentLengthMiles)||null,comments:p.Comments||p.PublicComments||null,county:p.County||null,geometry:f.geometry};
    const verifiedClosure=closuresOk?closureForSegment(base,closures):null;
    if(verifiedClosure&&!matchedClosures.includes(verifiedClosure))matchedClosures.push(verifiedClosure);
    return {...base,...scoreSegment(base,{clubReport:report,weather:wx,season,verifiedClosure})};
  });
  const route=routeDecision(segments,{season,closureLayerVerified:closuresOk});
  const sectionOrder=['grayling','frederic','waters','gaylord'];
  const sectionLabels={grayling:'Grayling',frederic:'Frederic',waters:'Waters',gaylord:'Gaylord'};
  const sections=sectionOrder.map(key=>{const ss=segments.filter(s=>s.section===key);const d=routeDecision(ss,{season,closureLayerVerified:closuresOk});return {key,label:sectionLabels[key],segmentCount:ss.length,...d};});
  const timing=rankRideWindows(weather,season);
  const grooming=groomingSummary([gray,gay].filter(Boolean));
  const trailEdited=newestIso(features.map(f=>f?.properties?.last_edited_date||f?.properties?.EditDate));
  const closureEdited=newestIso(closures.map(f=>f?.properties?.last_edite||f?.properties?.created_da));
  const newestDatedSource=newestIso([gray?.reportedAt,gay?.reportedAt,weather?.grayling?.generatedAt,weather?.gaylord?.generatedAt,trailEdited,closureEdited]);
  const decisionFeedCount=[
    features.length>0,closuresOk,gray&&!gray.error,gay&&!gay.error,weatherR.status==='fulfilled'&&(!weather?.grayling?.error||!weather?.gaylord?.error)
  ].filter(Boolean).length;
  const sourceSummary={decisionFeedCount,contextFeedCount:1,newestDatedSource,trailEdited,closureEdited,label:`${decisionFeedCount} decision feed${decisionFeedCount===1?'':'s'} + NOAA snow map`};
  const coverage=features.length?Math.min(1,segments.length/features.length):0;
  const contradictions=[];
  for(const [area,r] of [['Grayling',gray],['Gaylord',gay]]){
    if(r?.condition&&r?.freshness?.state&&!['STALE','UNKNOWN'].includes(r.freshness.state)&&r?.groomingFreshness?.state==='STALE'){
      contradictions.push({type:'STALE_GROOMING_FIELD',area,severity:'medium',message:`${area} has a current/recent condition report beside a stale structured "last groomed" field. The stale grooming date is not averaged into current grooming evidence.`});
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
  const jevPairs=(await Promise.all([['grayling',gray],['gaylord',gay]].filter(([,r])=>r?.reportText).map(async([key,r])=>[key,await interpretClubReport({text:r.reportText,source:r.name,structuredCondition:r.condition})])));
  const jevReports=Object.fromEntries(jevPairs);
  for(const [key,r] of [['grayling',gray],['gaylord',gay]]){
    const interpreted=jevReports[key],structured=conditionBand(r?.condition);
    if(interpreted?.accepted&&interpreted.condition&&structured&&interpreted.condition!==structured){
      contradictions.push({type:'JEV_STRUCTURED_CONDITION_MISMATCH',area:key==='grayling'?'Grayling':'Gaylord',severity:'low',message:`JEV read the narrative as ${interpreted.condition}, while the club's structured condition field is ${structured}. The structured club field remains authoritative; JEV does not alter the score.`});
    }
  }
  const conflicts=contradictions.length;
  const conf=confidence({officialFresh:true,closureLayerVerified:closuresOk,clubReports:[gray,gay].filter(Boolean),weatherFresh:weatherR.status==='fulfilled',segmentCoverage:coverage,conflicts});
  return {
    key:region.key,label:region.label,shortLabel:region.shortLabel,hubTown:region.hubTown,hubLat:region.hubLat,hubLon:region.hubLon,description:region.description,
    mapCenter:region.mapCenter,legacyCorridor:true,cameraId:region.cameraId||null,
    route:{...route,confidence:conf},trailSource:{provider:dnr.provider||'Michigan DNR',fallbackReason:dnr.primaryError||null},
    sections,timing,grooming,sourceSummary,contradictions,
    segments:segments.map(trimSegment),segmentCount:features.length,
    scoredGeometry:scoredGeometryFrom(segments),bbox:bboxFromFeatures(features),
    closures:{verified:closuresOk,total:closures.length,matched:trimClosures(matchedClosures)},
    reports:{grayling:gray,gaylord:gay},weather,jev:jevReports
  };
}

async function buildFlatRegion({region,season,closures,closuresOk,lib}){
  const {fetchDnrTrailsByCounty,fetchWeatherFor}=lib.sources;
  const {featureLatitude,closureForSegment,scoreSegment,routeDecision,confidence,rankRideWindows}=lib.engine;
  const [dnrR,weatherR]=await Promise.allSettled([fetchDnrTrailsByCounty(region.counties),fetchWeatherFor(region.hubLat,region.hubLon)]);
  if(dnrR.status==='rejected')return {key:region.key,label:region.label,shortLabel:region.shortLabel,hubTown:region.hubTown,hubLat:region.hubLat,hubLon:region.hubLon,description:region.description,mapCenter:region.mapCenter,legacyCorridor:false,error:String(dnrR.reason?.message||dnrR.reason)};
  const dnr=dnrR.value;
  const weather=weatherR.status==='fulfilled'?weatherR.value:{error:String(weatherR.reason)};
  const features=(dnr.features||[]).filter(f=>f?.geometry);
  const matchedClosures=[];
  const segments=features.slice(0,900).map((f,i)=>{
    const p=f.properties||{},lat=featureLatitude(f.geometry);
    const base={id:p.Unique_ID||p.GlobalID||`seg-${region.key}-${i+1}`,section:region.key,latitude:lat,trailNetwork:p.Trail_Netw||p.TrailNetwork||p.TrailNamePrimary||null,groomingSponsor:p.Groom_Spon||p.TrailGrooming||null,groomType:p.TrailGroomType||null,officialStatus:p.OpenClosedStatusSnowmobile||null,sourceStatusField:p.Status||p.TrailApprovalStatus||null,surface:p.Surface||p.SurfaceType||null,onRoad:p.On_Road||p.TrailOnRoad||null,miles:Number(p.Miles??p.SegmentLengthMiles)||null,comments:p.Comments||p.PublicComments||null,county:p.County||null,geometry:f.geometry};
    const verifiedClosure=closuresOk?closureForSegment(base,closures):null;
    if(verifiedClosure&&!matchedClosures.includes(verifiedClosure))matchedClosures.push(verifiedClosure);
    return {...base,...scoreSegment(base,{clubReport:null,weather:!weather.error?weather:null,season,verifiedClosure})};
  });
  const route=routeDecision(segments,{season,closureLayerVerified:closuresOk});
  const timing=rankRideWindows({[region.key]:weather},season);
  const trailEdited=newestIso(features.map(f=>f?.properties?.last_edited_date||f?.properties?.EditDate));
  const closureEdited=newestIso(closures.map(f=>f?.properties?.last_edite||f?.properties?.created_da));
  const newestDatedSource=newestIso([weather?.generatedAt,trailEdited,closureEdited]);
  const decisionFeedCount=[features.length>0,closuresOk,weatherR.status==='fulfilled'&&!weather?.error].filter(Boolean).length;
  const sourceSummary={decisionFeedCount,contextFeedCount:1,newestDatedSource,trailEdited,closureEdited,label:`${decisionFeedCount} decision feed${decisionFeedCount===1?'':'s'} + NOAA snow map`};
  const coverage=features.length?Math.min(1,segments.length/features.length):0;
  const conf=confidence({officialFresh:true,closureLayerVerified:closuresOk,clubReports:[],weatherFresh:weatherR.status==='fulfilled'&&!weather?.error,segmentCoverage:coverage,conflicts:0});
  const worst=[...segments].filter(s=>Number.isFinite(s.score)).sort((a,b)=>a.score-b.score)[0]||null;
  return {
    key:region.key,label:region.label,shortLabel:region.shortLabel,hubTown:region.hubTown,hubLat:region.hubLat,hubLon:region.hubLon,description:region.description,
    mapCenter:region.mapCenter,legacyCorridor:false,counties:region.counties,
    route:{...route,confidence:conf},trailSource:{provider:dnr.provider||'Michigan DNR',fallbackReason:null},
    timing,grooming:{state:'UNKNOWN',label:'No configured local club evidence source for this region yet',known:0,recent:0},
    sourceSummary,contradictions:[],
    segments:segments.map(trimSegment),segmentCount:features.length,
    worstSegment:worst?trimSegment(worst):null,
    scoredGeometry:scoredGeometryFrom(segments),bbox:bboxFromFeatures(features),
    closures:{verified:closuresOk,total:closures.length,matched:trimClosures(matchedClosures)},
    weather,reports:null,jev:null
  };
}

async function loadLib(){
  const [sources,engine,harness,regionsMod]=await Promise.all([
    import('../lib/snowmobile/sources.mjs'),import('../lib/snowmobile/engine.mjs'),import('../lib/snowmobile/harness.mjs'),import('../lib/snowmobile/regions.mjs')
  ]);
  return {sources,engine,harness,REGIONS:regionsMod.REGIONS,OUT_OF_SCOPE_NOTE:regionsMod.OUT_OF_SCOPE_NOTE};
}
async function loadClosures(sources){
  try{const json=await sources.fetchDnrClosures();return {ok:true,features:json.features||[]};}
  catch(error){return {ok:false,features:[],error:String(error?.message||error)};}
}
async function buildRegion(region,ctx){
  const built=region.legacyCorridor
    ?await buildLegacyCorridor({region,...ctx}).catch((error)=>({key:region.key,label:region.label,shortLabel:region.shortLabel,hubTown:region.hubTown,hubLat:region.hubLat,hubLon:region.hubLon,description:region.description,mapCenter:region.mapCenter,legacyCorridor:true,error:String(error?.message||error)}))
    :await buildFlatRegion({region,...ctx});
  return built;
}
function regionSummary(built){
  return {
    key:built.key,label:built.label,shortLabel:built.shortLabel,hubTown:built.hubTown,hubLat:built.hubLat,hubLon:built.hubLon,description:built.description,mapCenter:built.mapCenter,
    legacyCorridor:!!built.legacyCorridor,error:built.error||null,
    route:built.route?{score:built.route.score,band:built.route.band,routeState:built.route.routeState,confidence:built.route.confidence,critical:built.route.critical?{trailNetwork:built.route.critical.trailNetwork,band:built.route.critical.band,reasons:built.route.critical.reasons}:null}:null,
    segmentCount:built.segmentCount||0,grooming:built.grooming?{state:built.grooming.state,label:built.grooming.label}:null,
    weather:weatherHeadline(built.legacyCorridor?built.weather?.grayling:built.weather),
    hasClubEvidence:!!built.reports,hasCamera:!!built.cameraId
  };
}
module.exports=async function(req,res){
  if(req.method!=='GET')return send(res,{error:'Method not allowed'},405);
  const now=new Date();
  const regionParam=String(req.query?.region||'').trim();
  const cacheKey=regionParam||'__statewide__';
  const cached=CACHE.get(cacheKey);
  if(cached&&Date.now()-cached.savedAt<CACHE_MS)return send(res,{...cached.payload,operational:{...cached.payload.operational,dataState:'cached-fresh'}});
  try{
    const {sources,engine,harness,REGIONS,OUT_OF_SCOPE_NOTE}=await loadLib();
    const lib={sources,engine,harness};
    const season=engine.isSnowmobileSeason(now);
    const closuresR=await loadClosures(sources);
    const closures=closuresR.features,closuresOk=closuresR.ok;
    const ctx={season,closures,closuresOk,lib};

    if(regionParam){
      const region=REGIONS.find((r)=>r.key===regionParam);
      if(!region)return send(res,{error:'Unknown region',knownRegions:REGIONS.map((r)=>r.key)},404);
      const built=await buildRegion(region,ctx);
      const payload={generatedAt:now.toISOString(),season:{active:season,officialWindow:'Dec. 1\u2013Mar. 31'},region:built,
        sources:[
          {name:'Michigan DNR designated snowmobile trails',url:'https://www.michigan.gov/dnr/things-to-do/snowmobiling/where',authority:'official designated-trail geometry and attributes, statewide'},
          {name:'Michigan DNR temporary trail closures',url:'https://www.michigan.gov/dnr/about/newsroom/closures',authority:'official current closure/detour evidence, statewide'},
          ...(built.reports?[{name:'MISORVA trail reports',url:'https://misorva.org/trail-report/',authority:'club/operator condition evidence; DNR does not control timeliness or accuracy'}]:[]),
          {name:'NOAA / NOHRSC snow analysis',url:'https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer',authority:'regional analyzed snow depth; context only, not trail base'},
          {name:'National Weather Service',url:'https://weather.gov/',authority:'weather forecast'}
        ],
        truthBoundary:{naturalSnowIsTrailBase:false,nohrscSnowDepthIsTrailBase:false,forecastSnowIsAccumulatedSnow:false,openDoesNotMeanGood:true,missingClosureIsNotConfirmedOpen:true,statusFieldDoesNotSetLegalState:true,explicitSnowmobileOpenClosedStatusIsAuthoritative:true,jevCannotSetLegalStatus:true},
        operational:{dataState:'fresh',sourceFailures:{closures:closuresOk?null:closuresR.error},modelBoundary:'JEV can only classify the bounded overall condition expressed by club narrative text, and only where a club source is configured. Structured club fields remain authoritative. JEV cannot invent facts, set legal status, alter geometry or timestamps, or convert snow depth into trail base.'}
      };
      CACHE.set(cacheKey,{savedAt:Date.now(),payload});
      return send(res,payload);
    }

    const built=await Promise.all(REGIONS.map((region)=>buildRegion(region,ctx)));
    const summaries=built.map(regionSummary);
    const ranked=summaries.filter((r)=>!r.error&&Number.isFinite(r.route?.score)).sort((a,b)=>b.route.score-a.route.score);
    const totalSegments=summaries.reduce((n,r)=>n+(r.segmentCount||0),0);
    const payload={
      generatedAt:now.toISOString(),season:{active:season,officialWindow:'Dec. 1\u2013Mar. 31'},
      statewide:{regionCount:REGIONS.length,totalSegments,bestRegionKey:ranked[0]?.key||null,outOfScopeNote:OUT_OF_SCOPE_NOTE,closuresVerified:closuresOk,closureCount:closures.length},
      regions:summaries,
      sources:[
        {name:'Michigan DNR designated snowmobile trails',url:'https://www.michigan.gov/dnr/things-to-do/snowmobiling/where',authority:'official designated-trail geometry and attributes, statewide'},
        {name:'Michigan DNR temporary trail closures',url:'https://www.michigan.gov/dnr/about/newsroom/closures',authority:'official current closure/detour evidence, statewide'},
        {name:'National Weather Service',url:'https://weather.gov/',authority:'weather forecast, one grid point per region'}
      ],
      operational:{dataState:'fresh',sourceFailures:{closures:closuresOk?null:closuresR.error}}
    };
    CACHE.set(cacheKey,{savedAt:Date.now(),payload});
    return send(res,payload);
  }catch(error){
    if(cached)return send(res,{...cached.payload,operational:{...cached.payload.operational,dataState:'stale-last-known',staleReason:String(error?.message||error)}});
    return send(res,{error:'Live snowmobile source bundle unavailable',generatedAt:now.toISOString(),detail:String(error?.message||error)},503);
  }
};
