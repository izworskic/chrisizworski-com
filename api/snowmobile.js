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
 *
 * The actual DNR-fetch + scoring pipeline for one region lives in
 * lib/snowmobile/build-region.mjs (computeRegionDetail), shared with
 * api/snowmobile-route.js so the route planner routes over the exact same
 * scored geometry a region's detail page shows, through the same cache.
 */
function send(res,payload,status=200){res.status(status);res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex, nofollow');res.json(payload);}

module.exports=async function(req,res){
  if(req.method!=='GET')return send(res,{error:'Method not allowed'},405);
  const now=new Date();
  const regionParam=String(req.query?.region||'').trim();
  const {REGION_CACHE,REGION_CACHE_MS,loadLib,loadClosures,buildRegion,regionSummary,computeRegionDetail}=await import('../lib/snowmobile/build-region.mjs');

  if(regionParam){
    const cached=REGION_CACHE.get(regionParam);
    try{
      const result=await computeRegionDetail(regionParam);
      if(!result.ok)return send(res,result.body,result.status);
      return send(res,result.payload);
    }catch(error){
      if(cached)return send(res,{...cached.payload,operational:{...cached.payload.operational,dataState:'stale-last-known',staleReason:String(error?.message||error)}});
      return send(res,{error:'Live snowmobile source bundle unavailable',generatedAt:now.toISOString(),detail:String(error?.message||error)},503);
    }
  }

  const cacheKey='__statewide__';
  const cached=REGION_CACHE.get(cacheKey);
  if(cached&&Date.now()-cached.savedAt<REGION_CACHE_MS)return send(res,{...cached.payload,operational:{...cached.payload.operational,dataState:'cached-fresh'}});
  try{
    const {sources,engine,harness,REGIONS,OUT_OF_SCOPE_NOTE}=await loadLib();
    const lib={sources,engine,harness};
    const season=engine.isSnowmobileSeason(now);
    const closuresR=await loadClosures(sources);
    const closures=closuresR.features,closuresOk=closuresR.ok;
    const ctx={season,closures,closuresOk,lib};

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
    REGION_CACHE.set(cacheKey,{savedAt:Date.now(),payload});
    return send(res,payload);
  }catch(error){
    if(cached)return send(res,{...cached.payload,operational:{...cached.payload.operational,dataState:'stale-last-known',staleReason:String(error?.message||error)}});
    return send(res,{error:'Live snowmobile source bundle unavailable',generatedAt:now.toISOString(),detail:String(error?.message||error)},503);
  }
};
