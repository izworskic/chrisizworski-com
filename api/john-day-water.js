'use strict';
const {SOURCE,parseHourly,localReportDate}=require('../lib/john-day-water');
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex,nofollow');
 res.setHeader('Access-Control-Allow-Origin','https://chrisizworski.com');
 if(req.method&&req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,state:'error',reason:'Method not allowed'});}
 const date=localReportDate();const queriedAt=new Date().toISOString();
 // Yesterday ensures the entire day is complete, and avoids empty trailing hours.
 const yesterday=new Date(Date.parse(date+'T12:00:00Z')-86400000).toISOString().slice(0,10);
 const query='?r=jda&date='+encodeURIComponent(yesterday.slice(5,7)+'/'+yesterday.slice(8,10)+'/'+yesterday.slice(0,4));
 const upstream=SOURCE+query;
 try{
  const response=await fetch(upstream,{signal:AbortSignal.timeout(8000),headers:{Accept:'text/html','User-Agent':'JohnDayLockExplorer/1.0 (+https://chrisizworski.com/john-day-lock/)'}});
  if(!response.ok)throw Error('USACE source error');
  const report=parseHourly(await response.text(),yesterday);
  // An observed daily report is not a claim of real-time flow. Always label its date.
  res.setHeader('Cache-Control','public,s-maxage=1800,stale-while-revalidate=1800');
  return res.status(200).json({ok:true,state:'historical-observation',checkedAt:queriedAt,sourceUrl:upstream,...report});
 }catch(_){
  res.setHeader('Cache-Control','no-store');
  return res.status(502).json({ok:false,state:'unavailable',checkedAt:queriedAt,sourceUrl:upstream,reason:'The official John Day hourly water report could not be validated. No current water measurements are shown.'});
 }
};
