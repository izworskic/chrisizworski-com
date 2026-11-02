// Server-side same-origin route for mirrored National Outdoor Core live tools.
// Their client deliberately fetches /api/breakout-live, not a third-party host.
// No scraped source is exposed directly to a browser and failures fail closed.
const ALLOWED=new Set([
  'zion-narrows-conditions','grand-canyon-access','going-to-the-sun-road-status',
  'haleakala-sunrise','yellowstone-road-status','tioga-road-status',
  'cadillac-mountain-sunrise','mount-rainier-road-status',
  'lake-mead-access','lake-powell-ramp-status'
]);
const ORIGIN='https://national-outdoor-core.vercel.app';

module.exports=async function breakoutLive(req,res){
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  if(req.method&&req.method!=='GET'){
    res.setHeader('Allow','GET');
    res.statusCode=405;return res.end(JSON.stringify({ok:false,error:'Method not allowed'}));
  }
  const url=new URL(req.url||'/', 'https://chrisizworski.com');
  const id=String(req.query?.id||url.searchParams.get('id')||'').trim();
  if(!ALLOWED.has(id)){
    res.statusCode=400;return res.end(JSON.stringify({ok:false,error:'Unsupported live decision'}));
  }
  const date=String(req.query?.date||url.searchParams.get('date')||'');
  if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date)){
    res.statusCode=400;return res.end(JSON.stringify({ok:false,error:'Invalid date'}));
  }
  const target=new URL('/api/breakout-live',ORIGIN);
  target.searchParams.set('id',id);
  if(date)target.searchParams.set('date',date);
  try{
    const upstream=await fetch(target,{
      signal:AbortSignal.timeout(18000),
      headers:{Accept:'application/json'}
    });
    if(!upstream.ok)throw new Error('Core API HTTP '+upstream.status);
    const data=await upstream.json();
    if(!data||data.ok!==true||data.id!==id)throw new Error('Core API response failed validation');
    if(id==='lake-mead-access'&&(!Array.isArray(data.launches)||data.launches.length<8))
      throw new Error('Incomplete Lake Mead ramp table');
    if(id==='lake-powell-ramp-status'&&(!Array.isArray(data.ramps)||data.ramps.length<12))
      throw new Error('Incomplete Lake Powell ramp table');
    res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
    res.setHeader('X-Decision-Source','national-outdoor-core');
    res.statusCode=200;return res.end(JSON.stringify(data));
  }catch(error){
    // Never serve an unlabelled old status or an empty "open" list when the
    // origin is down. The UI links to NPS and renders LIVE SOURCE UNAVAILABLE.
    console.error('breakout-live upstream error',id,String(error?.message||error));
    res.statusCode=502;
    return res.end(JSON.stringify({
      ok:false,id,error:'Live official-source decision unavailable',
      detail:'The live check could not be validated. Consult the linked official source.',
      updated:new Date().toISOString()
    }));
  }
};
