'use strict';

const UPSTREAM='https://michiganbirdingreport.com/api/local-action';
const UA='ChrisIzworski-NationalTools/1.3 (+https://chrisizworski.com/national-tools/)';

function finite(v){const n=Number(v);return Number.isFinite(n)?n:null;}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=1800');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  try{
    const lat=finite(req.query?.lat),lon=finite(req.query?.lon??req.query?.lng);
    if(lat==null||lon==null||lat<-90||lat>90||lon<-180||lon>180)return res.status(400).json({ok:false,error:'Valid lat and lon are required.'});
    const params=new URLSearchParams({lat:String(lat),lng:String(lon),distKm:String(req.query?.distKm||40),back:String(req.query?.back||3)});
    const response=await fetch(`${UPSTREAM}?${params}`,{headers:{accept:'application/json','user-agent':UA},signal:AbortSignal.timeout(10000)});
    const body=await response.json().catch(()=>null);
    if(!response.ok||!body?.ok)throw new Error(body?.error||`Birding action upstream returned ${response.status}`);
    return res.status(200).json({...body,sourceMode:'michigan-birding-report-local-action'});
  }catch(error){
    return res.status(502).json({ok:false,error:'Nearby birding action data are temporarily unavailable.',detail:String(error?.message||error)});
  }
};
