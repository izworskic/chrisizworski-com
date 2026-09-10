const LIVE_ORIGIN='https://blue-spring-live-6h8f.vercel.app';

module.exports=async function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).json({error:'Method not allowed'});
  }
  try{
    const upstream=await fetch(`${LIVE_ORIGIN}/api/manatee`,{headers:{'Accept':'application/json','User-Agent':'ChrisIzworski-BlueSpringIntent/1.0'}});
    const text=await upstream.text();
    res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=1800');
    res.status(upstream.ok?200:502);
    return req.method==='HEAD'?res.end():res.send(text);
  }catch(error){
    res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=120');
    return res.status(502).json({count:null,freshness:'unavailable',note:'The published manatee count source is temporarily unavailable.',retrievedAt:new Date().toISOString()});
  }
};
