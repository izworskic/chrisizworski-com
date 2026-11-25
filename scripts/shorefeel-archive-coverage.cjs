'use strict';
// Bounded, one-off research probe: no scheduled collection or production requests.
const {createHash}=require('node:crypto');
const DATES=['2026-10-20','2026-11-21','2026-11-22'];
const STATIONS=['45029','45161','45183','45002'];
const BASE='https://opendap.co-ops.nos.noaa.gov/thredds/dodsC/NOAA/LMHOFS/MODELS/';
function plan(){
 const rows=[];
 for(const date of DATES){
  const dir=date.replaceAll('-','/'),ymd=date.replaceAll('-','');
  for(const h of [0,24,48])for(const product of ['regulargrid','fields'])rows.push({kind:product==='regulargrid'?'regular-grid-schema':'native-field-schema',date,lead:h,url:BASE+dir+'/lmhofs.t00z.'+ymd+'.'+product+'.f'+String(h).padStart(3,'0')+'.nc.dds',cap:65536});
  const prefix='lmhofs/netcdf/'+date.replaceAll('-','/')+'/';
  rows.push({kind:'native-catalog',date,url:'https://noaa-nos-ofs-pds.s3.amazonaws.com/?list-type=2&max-keys=1000&prefix='+encodeURIComponent(prefix),cap:524288});
 }
 for(const station of STATIONS)rows.push({kind:'ndbc-current-year',station,url:'https://www.ndbc.noaa.gov/data/l_stdmet/'+station+'.txt',cap:1048576});
 return rows;
}
function inspect(item,body){
 if(item.kind==='regular-grid-schema'||item.kind==='native-field-schema')return {status:/\bFloat32\s+temp\s*\[/.test(body)&&/Dataset\s*\{/.test(body)?'SCHEMA_PRESENT':'UNEXPECTED_SCHEMA',temperatureDeclaration:body.match(/\bFloat32\s+temp\s*[^;]+;/)?.[0]||null};
 if(item.kind==='native-catalog'){
  const keys=[...body.matchAll(/<Key>([^<]+)<\/Key>/g)].map(x=>x[1]);
  return {status:/<ListBucketResult\b/.test(body)?'CATALOG_RESPONSE':'UNEXPECTED_SCHEMA',keys:keys.filter(k=>/stations|regulargrid|fields/.test(k)).slice(0,25),sampleCycleKeys:keys.filter(k=>/t00z/.test(k)&&/\.(?:f000|f024|f048)\.|\.stations\.forecast\./.test(k)),keyCount:keys.length,truncated:/<IsTruncated>true<\/IsTruncated>/.test(body)};
 }
 const lines=body.split(/\r?\n/),header=(lines.find(x=>/^#?YY\s+MM\s+DD/.test(x.trim()))||'').trim().replace(/^#/,'').split(/\s+/);
 const index=header.indexOf('WTMP'),mi=header.indexOf('mm');
 if(index<0||mi<0)return {status:'UNEXPECTED_SCHEMA'};
 const times=new Set();
 for(const line of lines){
  const a=line.trim().split(/\s+/);
  if(!/^2026$/.test(a[0])||!/^\d{1,2}$/.test(a[mi]||'')||!/^[-+]?\d+(?:\.\d+)?$/.test(a[index]||''))continue;
  const temp=Number(a[index]);
  if(temp<-2||temp>36)continue;
  const t=Date.UTC(+a[0],+a[1]-1,+a[2],+a[3],+a[mi]);
  if(Number.isFinite(t))times.add(t);
 }
 const sorted=[...times].sort((a,b)=>a-b);
 return {status:'OBSERVATION_FILE_PRESENT',validWaterRows:times.size,earliest:sorted.length?new Date(sorted[0]).toISOString():null,latest:sorted.length?new Date(sorted.at(-1)).toISOString():null,
  sampledDays:Object.fromEntries(DATES.map(d=>[d,sorted.filter(t=>new Date(t).toISOString().slice(0,10)===d).length]))};
}
async function probe(item){
 try{
  const response=await fetch(item.url,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{'User-Agent':'ShoreFeel-offline-archive-review/1.0 (https://chrisizworski.com/)'}});
  if(!response.ok){await response.body?.cancel();return {...item,status:response.status===404?'NOT_FOUND_AT_PROBE':'HTTP_UNRESOLVED',http:response.status};}
  const reader=response.body.getReader(),chunks=[];let count=0;
  while(true){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>item.cap){await reader.cancel();return {...item,status:'BODY_CAP_EXCEEDED'};}chunks.push(Buffer.from(value));}
  const body=Buffer.concat(chunks);
  return {...item,http:response.status,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex'),...inspect(item,body.toString('utf8'))};
 }catch(e){return {...item,status:'FETCH_UNRESOLVED',error:String(e.message).slice(0,160)};}
}
async function run(){
 const items=plan(),rows=[];
 for(let i=0;i<items.length;i+=4)rows.push(...await Promise.all(items.slice(i,i+4).map(probe)));
 return {status:'SAMPLE_INVENTORY_NOT_CALIBRATION',probedAt:new Date().toISOString(),requests:items.length,rows,canPromoteModel:false,limits:['Point-in-time schema/catalog and observation-file checks, not forecast value extraction or publication-time proof.','Non-200, network and size errors are unresolved except explicit 404 at probe time. No model substitution.']};
}
if(require.main===module)run().then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={plan,inspect};
