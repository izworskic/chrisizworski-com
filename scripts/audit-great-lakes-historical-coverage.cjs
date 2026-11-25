#!/usr/bin/env node
'use strict';
// Offline historical coverage audit only. No ETA or production data feed.
const crypto=require('node:crypto'),fs=require('node:fs');
const BASE='https://data.pmel.noaa.gov/pmel/erddap/tabledap/AIS2024_AIS.csv';
const FIELDS='MMSI,time,Lat,Lon,SOG,COG,VesselType,Length';
const SITES=Object.freeze({soo:[46.45,-84.50,46.52,-84.25],duluth:[46.73,-92.15,46.85,-91.95]});
const MAX=2*1024*1024;
function expect(ok,msg){if(!ok)throw Error(msg)}
function utc(s){expect(typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(s),'explicit UTC required');const t=Date.parse(s);expect(Number.isFinite(t)&&new Date(t).toISOString().slice(0,19)===s.slice(0,19),'invalid UTC');return t;}
function scope(site,start,end){
 expect(Object.hasOwn(SITES,site),'unknown site');const a=utc(start),b=utc(end);
 expect(a>=Date.UTC(2024,8,1)&&b<=Date.UTC(2024,9,1)&&b>a&&b-a<=600000,'September 2024, at most ten minutes');
 const bbox=[...SITES[site]],[s,w,n,e]=bbox;
 const filters=['time>='+start,'time<'+end,'Lat>='+s,'Lat<='+n,'Lon>='+w,'Lon<='+e];
 return {site,start,end,bbox,url:BASE+'?'+FIELDS+'&'+filters.map(encodeURIComponent).join('&')};
}
function audit(raw,site,start,end,kind='unverified-local-file'){
 const q=scope(site,start,end),[s,w,n,e]=q.bbox,a=utc(start),b=utc(end);
 expect(typeof raw==='string'&&Buffer.byteLength(raw)<=MAX,'response size exceeds cap');
 const lines=raw.replace(/^\uFEFF/,'').trimEnd().split(/\r?\n/);
 expect(lines[0]===FIELDS,'unexpected column schema');const units=lines[1]?.split(',');
 expect(units?.length===8&&units[1]==='UTC','unexpected units row');expect(lines.length-2<=20000,'row cap');
 const vessels=new Map(),records=new Map(),minutes=new Set();
 let rejected=0,duplicates=0,missingMotion=0,missingLength=0,unknownType=0;
 const number=x=>x.trim()===''?NaN:Number(x);
 for(const line of lines.slice(2)){
  const c=line.split(',');if(c.length!==8){rejected++;continue}
  const [id,stamp]=c;let t;try{t=utc(stamp)}catch{rejected++;continue}
  const [lat,lon,sog,cog]=c.slice(2,6).map(number);
  if(!/^\d{9}$/.test(id)||t<a||t>=b||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<s||lat>n||lon<w||lon>e){rejected++;continue}
  const key=id+'|'+t;if(records.has(key)){expect(records.get(key)===line,'conflicting duplicate');duplicates++;continue}records.set(key,line);
  if(!Number.isFinite(sog)||sog<0||sog>=102.3||!Number.isFinite(cog)||cog<0||cog>=360)missingMotion++;
  if(!/^\d+$/.test(c[6])||Number(c[6])===0)unknownType++;
  const len=number(c[7]);if(!Number.isFinite(len)||len<=0||len>500)missingLength++;
  if(!vessels.has(id))vessels.set(id,[]);vessels.get(id).push(t);minutes.add(Math.floor(t/60000));
 }
 let adjacentPairs=0,gapsOverFiveMinutes=0;
 for(const times of vessels.values()){times.sort((x,y)=>x-y);for(let i=1;i<times.length;i++){adjacentPairs++;if(times[i]-times[i-1]>300000)gapsOverFiveMinutes++;}}
 return {schemaVersion:1,kind:'HISTORICAL_COVERAGE_ONLY',inputKind:kind,scope:q,sha256:crypto.createHash('sha256').update(raw).digest('hex'),rows:lines.length-2,validUniqueRows:records.size,rejected,duplicates,distinctVessels:vessels.size,observedMinutes:minutes.size,adjacentPairs,gapsOverFiveMinutes,missingMotion,missingLength,unknownType,receiptTimesAvailable:false,destinationAvailable:false,independentCrossingLabels:0,fieldAccuracyVerified:false,productionCalibrationAuthorized:false};
}
async function acquire(site,start,end){
 const q=scope(site,start,end);
 const response=await fetch(q.url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{accept:'text/csv','user-agent':'GreatLakesPassageResearch/1.0 (+https://chrisizworski.com/)'}});
 if(!response.ok)throw Error('NOAA HTTP '+response.status);
 const declared=Number(response.headers.get('content-length'));expect(!declared||declared<=MAX,'declared size exceeds cap');expect(response.body,'missing response');
 const reader=response.body.getReader(),chunks=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;expect(bytes<=MAX,'stream exceeds cap');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(chunks).toString('utf8');
}
module.exports={scope,audit,acquire};
if(require.main===module){
 (async()=>{const [mode,site,start,end,input,output,...extra]=process.argv.slice(2);expect(!extra.length&&output&&['--local','--research-fetch'].includes(mode),'usage: --local SITE START END CSV REPORT or --research-fetch SITE START END ACKNOWLEDGE_RESEARCH_ONLY REPORT');scope(site,start,end);
 let raw;if(mode==='--local'){expect(fs.statSync(input).size<=MAX,'local file exceeds cap');raw=fs.readFileSync(input,'utf8');}
 else{expect(input==='ACKNOWLEDGE_RESEARCH_ONLY','explicit research acknowledgement required');raw=await acquire(site,start,end);}
 fs.writeFileSync(output,JSON.stringify(audit(raw,site,start,end,mode==='--local'?'unverified-local-file':'noaa-http-research-response'),null,2)+'\n',{flag:'wx'});})().catch(e=>{console.error('Coverage audit unavailable: '+e.message);process.exitCode=1;});
}
