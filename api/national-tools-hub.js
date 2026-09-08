'use strict';

const HUB_SOURCE='https://raw.githubusercontent.com/izworskic/national-outdoor-tools-hub/main/public/national-tools/index.html';
const OLD_ICE_OUT='https://lspp-ice-out.vercel.app/north-america/';
const BRANDED_ICE_OUT='https://chrisizworski.com/national-tools/ice-out/';

module.exports=async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).send('GET only');
  }
  try{
    const upstream=await fetch(HUB_SOURCE,{
      headers:{'User-Agent':'chrisizworski-national-tools-hub/1.0'},
      signal:AbortSignal.timeout(8000)
    });
    if(!upstream.ok)throw new Error(`hub source ${upstream.status}`);
    let html=await upstream.text();
    html=html.split(OLD_ICE_OUT).join(BRANDED_ICE_OUT);
    html=html.replace('"dateModified":"2026-09-07"','"dateModified":"2026-09-08"');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=604800');
    return res.status(200).send(html);
  }catch(error){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).send(`National tools hub unavailable: ${String(error?.message||error).slice(0,200)}`);
  }
};
