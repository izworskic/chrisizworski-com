'use strict';
const {tileAddress,decodeTile}=require('../lib/john-day-map-ais');
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method&&req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'GET required'})}
 const tile=tileAddress(req.query);
 if(!tile){res.setHeader('Cache-Control','no-store');return res.status(400).json({ok:false,error:'Valid map tile required'})}
 try{
  const headers={Accept:'application/vnd.mapbox-vector-tile','User-Agent':'JohnDayMap/1.0 (+https://chrisizworski.com/john-day-lock/)'};
  if(process.env.OPEN_WATERS_API_TOKEN)headers.Authorization='Bearer '+process.env.OPEN_WATERS_API_TOKEN;
  const url='https://ais.openwaters.io/v1/vessels/tiles/'+tile.z+'/'+tile.x+'/'+tile.y+'?kind=vessel&max_age=28m';
  const upstream=await fetch(url,{headers,signal:AbortSignal.timeout(8000)});
  if(!upstream.ok)throw Error('AIS map unavailable');
  const bytes=new Uint8Array(await upstream.arrayBuffer());
  if(bytes.byteLength>2e6)throw Error('Oversized tile');
  const data=await decodeTile(bytes,tile);
  res.setHeader('Cache-Control','public,s-maxage=30,stale-while-revalidate=30');
  return res.status(200).json({...data,source:'Open Waters AIS map tiles',sourceUrl:'https://openwaters.io/api/ais/',tile});
 }catch(_){res.setHeader('Cache-Control','no-store');return res.status(502).json({ok:false,error:'Vessel map reports are temporarily unavailable'})}
};
