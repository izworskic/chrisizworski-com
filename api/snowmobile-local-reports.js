/* Independent MISORVA local report desk. Does not modify route-score API. */
'use strict';
const {checkRegion,roster}=require('../lib/snowmobile/local-reports.cjs');
const CACHE=new Map();
function send(res,status,body){
 res.status(status);
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control',status===200?'public, s-maxage=900, stale-while-revalidate=900':'no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 return res.json(body);
}
module.exports=async function handler(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
 const key=typeof req.query?.region==='string'?req.query.region:'';
 if(!roster(key))return send(res,400,{error:'Unknown snowmobile region'});
 const hit=CACHE.get(key);
 if(hit&&hit.until>Date.now())return send(res,200,hit.body);
 try{
  const body=await checkRegion(key);
  if(!body)return send(res,400,{error:'Unknown snowmobile region'});
  CACHE.set(key,{body,until:Date.now()+15*60*1000});
  return send(res,200,body);
 }catch{
  return send(res,503,{error:'Could not check local club sources',source:'https://misorva.org/trail-report/'});
 }
};
module.exports._test={clearCache:()=>CACHE.clear()};
