const LIVE_ORIGIN='https://blue-spring-live-6h8f.vercel.app';

module.exports=async function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'&&req.method!=='HEAD'){
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).json({error:'Method not allowed'});
  }
  try{
    const upstream=await fetch(`${LIVE_ORIGIN}/api/live`,{headers:{'Accept':'application/json','User-Agent':'ChrisIzworski-BlueSpringIntent/1.0'}});
    const text=await upstream.text();
    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
    res.status(upstream.ok?200:502);
    return req.method==='HEAD'?res.end():res.send(text);
  }catch(error){
    res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=120');
    return res.status(502).json({ok:false,error:'Blue Spring live source unavailable',retrievedAt:new Date().toISOString()});
  }
};
