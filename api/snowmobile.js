let cache=null;
function send(res,payload,status=200){
  res.status(status);res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex, nofollow');res.json(payload);
}
function reportDate(raw){
  if(!raw)return null;
  const cleaned=String(raw).replace(/(\d+)(st|nd|rd|th)/,'$1').replace('@',' ');
  const d=new Date(cleaned); return Number.isFinite(d.getTime())?d.toISOString():null;
}
module.exports=async function(req,res){
  if(req.method!=='GET')return send(res,{error:'Method not allowed'},405);
  const now=new Date();
  if(cache&&Date.now()-cache.savedAt<300000)return send(res,{...cache.payload,operational:{...cache.payload.operational,dataState:'cached-fresh'}});
  try{
    const [{fetchDnrCorridor,fetchClub,fetchWeather},{isSnowmobileSeason,freshness,scoreSegment,routeDecision,confidence},{interpretClubReport}]=await Promise.all([
      import('../lib/snowmobile/sources.mjs'),import('../lib/snowmobile/engine.mjs'),import('../lib/snowmobile/harness.mjs')
    ]);
    const [dnrR,grayR,gayR,weatherR]=await Promise.allSettled([fetchDnrCorridor(),fetchClub('grayling'),fetchClub('gaylord'),fetchWeather()]);
    if(dnrR.status==='rejected')throw dnrR.reason;
    const season=isSnowmobileSeason(now);
    const dnr=dnrR.value; const gray=grayR.status==='fulfilled'?grayR.value:null; const gay=gayR.status==='fulfilled'?gayR.value:null; const weather=weatherR.status==='fulfilled'?weatherR.value:{};
    for(const r of [gray,gay]) if(r){r.reportedAt=reportDate(r.reportedRaw);r.lastGroomedAt=reportDate(r.lastGroomedRaw);r.freshness=freshness(r.reportedAt,'report');r.groomingFreshness=freshness(r.lastGroomedAt,'grooming');}
    const features=(dnr.features||[]).filter(f=>f?.geometry);
    const segments=features.slice(0,250).map((f,i)=>{
      const p=f.properties||{}; const mid=i<features.length/2?'grayling':'gaylord'; const report=mid==='grayling'?gray:gay; const wx=weather?.[mid];
      const base={id:p.Unique_ID||`seg-${i+1}`,trailNetwork:p.Trail_Netw||null,groomingSponsor:p.Groom_Spon||null,officialStatus:p.Status||null,surface:p.Surface||null,onRoad:p.On_Road||null,miles:Number(p.Miles)||null,comments:p.Comments||null,properties:p,geometry:f.geometry};
      return {...base,...scoreSegment(base,{clubReport:report,weather:wx,season})};
    });
    const route=routeDecision(segments,{season});
    const coverage=features.length?Math.min(1,segments.length/features.length):0;
    const conf=confidence({officialFresh:true,clubReports:[gray,gay].filter(Boolean),weatherFresh:weatherR.status==='fulfilled',segmentCoverage:coverage,conflicts:0});
    const requestOidc=Array.isArray(req.headers?.['x-vercel-oidc-token'])?req.headers['x-vercel-oidc-token'][0]:(req.headers?.['x-vercel-oidc-token']||'');
    const jev=await Promise.all([gray,gay].filter(r=>r?.reportText).map(r=>interpretClubReport({text:r.reportText,source:r.name,allowedSegments:segments.slice(0,12).map(s=>s.id)},requestOidc)));
    const payload={
      generatedAt:now.toISOString(),season:{active:season,officialWindow:'Dec. 1–Mar. 31'},
      route:{name:'Grayling → Gaylord',...route,confidence:conf},
      segments,geometry:{type:'FeatureCollection',features:features},
      reports:{grayling:gray,gaylord:gay},weather,
      sources:[
        {name:'Michigan DNR designated snowmobile trails',url:'https://www.michigan.gov/dnr/things-to-do/snowmobiling/where',authority:'official geometry / designated trail attributes'},
        {name:'Michigan DNR closures',url:'https://www.michigan.gov/dnr/about/newsroom/closures',authority:'official closures / detours'},
        {name:'MISORVA trail reports',url:'https://misorva.org/trail-report/',authority:'club/operator condition evidence'},
        {name:'National Weather Service',url:'https://weather.gov/',authority:'weather forecast'}
      ],
      truthBoundary:{naturalSnowIsTrailBase:false,openDoesNotMeanGood:true,missingClosureIsNotConfirmedOpen:true,jevCannotSetLegalStatus:true},
      operational:{dataState:'fresh',jev,modelBoundary:'JEV can only classify bounded report relevance. It cannot invent facts, set legal status, alter geometry, or convert snow depth into trail base.'}
    };
    cache={savedAt:Date.now(),payload};return send(res,payload);
  }catch(error){
    if(cache)return send(res,{...cache.payload,operational:{...cache.payload.operational,dataState:'stale-last-known',staleReason:String(error?.message||error)}});
    return send(res,{error:'Live snowmobile source bundle unavailable',generatedAt:now.toISOString(),detail:String(error?.message||error)},503);
  }
};
