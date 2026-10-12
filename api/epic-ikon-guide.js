'use strict';
const {buildGuide,decideWithJev}=require('../lib/epic-ikon/guide.js');
const MAX_BODY=2048;
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST to interpret a chosen ski visit.'});}
 if(Number(req.headers['content-length']||0)>MAX_BODY)return res.status(413).json({error:'Request too large.'});
 const body=req.body===undefined?{}:req.body;
 if(!body || typeof body!=='object' || Array.isArray(body))return res.status(422).json({error:'Submit a supported set of ski-trip choices.'});
 const allowed=new Set(['pass','resort','date','intent','usedDays','reservationMade','epicDayTotal','epicPeak','sessionTotal']);
 if(Object.entries(body).some(([key,value])=>!allowed.has(key)||!['string','number'].includes(typeof value)||String(value).length>80))
  return res.status(422).json({error:'Invalid ski-trip choice type or length.'});
 if(JSON.stringify(body).length>MAX_BODY)return res.status(413).json({error:'Request too large.'});
 try{
  // The engine is invoked server-side on every request; JEV never supplies the verdict.
  const result=await decideWithJev(body);
  return res.status(200).json({version:'v2',...result});
 }catch(e){
  // If editorial evaluation is unavailable, the safe deterministic result stands.
  return res.status(200).json({version:'v2',...buildGuide(body),editor:'deterministic',confidence:null});
 }
};
