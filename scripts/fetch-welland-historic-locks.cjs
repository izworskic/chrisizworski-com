#!/usr/bin/env node
/**
 * Source-verified distinct historic lock photographs: Public Domain.
 * Lock 5 = LOC Bain News Service, 1916, excavation for Lock No. 5.
 * Lock 8 = Lock 8 gates, September 1929, S.S. Meaford.
 * Neither is presented as a modern view of the operating canal.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const files=[
 {name:'lock5-construction-1916',source:'File:Welland ship canal - channelled faces for pit for lock no. 5 LCCN2007681023.jpg',minW:600},
 {name:'lock8-gates-1929',source:'File:Lock 8 On The Welland Ship Canal.jpg',minW:600}
];
const headers={'User-Agent':'ChrisIzworski-WellandLockHistoricImporter/1.0 (https://chrisizworski.com/welland-canal/; source attribution)','Accept':'image/jpeg,image/*;q=0.9'};
async function withTimeout(url,asJSON=false){
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),35000);
 try{
  const r=await fetch(url,{headers,signal:ac.signal,redirect:'follow'});
  if(!r.ok)throw Error('HTTP '+r.status+' '+url);
  return asJSON?await r.json():Buffer.from(await r.arrayBuffer());
 }finally{clearTimeout(timer)}
}
(async()=>{
 for(const file of files){
  const api='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({
    action:'query',format:'json',formatversion:'2',titles:file.source,prop:'imageinfo',iiprop:'url|size|extmetadata'
  });
  const data=await withTimeout(api,true),rec=data.query?.pages?.[0],info=rec?.imageinfo?.[0];
  if(!info)throw Error('Commons source missing: '+file.source);
  if(info.width<file.minW||info.height<400)throw Error('Too low resolution: '+file.source);
  if(info.extmetadata?.LicenseShortName?.value!=='Public domain')throw Error('Not verified public domain: '+file.source);
  const url=info.url;
  if(!url.startsWith('https://upload.wikimedia.org/wikipedia/commons/'))throw Error('Invalid Commons URL');
  const bytes=await withTimeout(url);
  if(bytes.length<30000||bytes.length>10000000||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw Error('Invalid image source');
  const dest=path.join('public/assets/welland/photos',file.name+'.source.jpg');
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);
  console.log(JSON.stringify({local:file.name,source:file.source,url:info.descriptionurl,license:info.extmetadata.LicenseShortName.value,bytes:bytes.length,dimensions:[info.width,info.height]}));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
