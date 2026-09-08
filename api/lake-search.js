'use strict';

const BACKEND='https://lspp-ice-out.vercel.app/api/lake-search';

module.exports=async function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex');
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'GET only'});
  }
  try{
    const upstream=new URL(BACKEND);
    const q=req.query?.q;
    if(q!==undefined&&q!==null&&q!=='')upstream.searchParams.set('q',String(q));
    const response=await fetch(upstream,{headers:{'User-Agent':'chrisizworski-branded-ice-out/1.0'},signal:AbortSignal.timeout(9000)});
    const body=Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type',response.headers.get('content-type')||'application/json; charset=utf-8');
    res.setHeader('Cache-Control',response.headers.get('cache-control')||'public, s-maxage=3600, stale-while-revalidate=21600');
    return res.status(response.status).send(body);
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'lake search proxy unavailable',detail:String(error?.message||error).slice(0,300)});
  }
};
