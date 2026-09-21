/*
 * Michigan Snowmobile Conditions route planner.
 *
 * GET /api/snowmobile-route?region=<key>&from=lat,lon&to=lat,lon
 *
 * Finds the shortest legally-ridable path between two points along one
 * region's official DNR trail geometry. Reuses the exact same scored
 * region data (and its 5-minute cache) that GET /api/snowmobile?region=
 * already computes, via lib/snowmobile/build-region.mjs, so a route is
 * always consistent with what that region's detail page currently shows:
 * same closures, same DNR status, same season state, no second DNR fetch.
 *
 * This is deterministic graph pathfinding (lib/snowmobile/routing.mjs),
 * not a JEV decision. JEV never touches geometry, distance or legal
 * status anywhere in this codebase; see routing.mjs's header comment for
 * why it plays no role in computing a route.
 */
function send(res,payload,status=200){res.status(status);res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex, nofollow');res.json(payload);}
function fail(res,payload,status){res.setHeader('Cache-Control','no-store');return send(res,payload,status);}

function parsePoint(value){
  const parts=String(value??'').split(',');
  if(parts.length!==2)return null;
  const lat=Number(parts[0]),lon=Number(parts[1]);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180)return null;
  return {lat,lon};
}

module.exports=async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return fail(res,{error:'Method not allowed'},405);}
  const regionParam=String(req.query?.region||'').trim();
  const from=parsePoint(req.query?.from);
  const to=parsePoint(req.query?.to);
  if(!regionParam)return fail(res,{error:'Provide region=<key>'},400);
  if(!from)return fail(res,{error:'Provide from=lat,lon'},400);
  if(!to)return fail(res,{error:'Provide to=lat,lon'},400);

  try{
    const {computeRegionDetail}=await import('../lib/snowmobile/build-region.mjs');
    const {planRoute}=await import('../lib/snowmobile/routing.mjs');
    const result=await computeRegionDetail(regionParam);
    if(!result.ok)return fail(res,result.body,result.status);
    const built=result.payload.region;
    if(built.error)return fail(res,{error:'Region trail data is unavailable right now',detail:built.error},503);

    const route=planRoute(built.scoredGeometry,{fromLat:from.lat,fromLon:from.lon,toLat:to.lat,toLon:to.lon});
    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
    return send(res,{
      region:regionParam,from,to,
      generatedAt:result.payload.generatedAt,
      season:result.payload.season,
      engine:'deterministic-dijkstra',
      route
    });
  }catch(error){
    return fail(res,{error:'Route planning unavailable',detail:String(error?.message||error)},503);
  }
};
module.exports._test={parsePoint};
