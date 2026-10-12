#!/usr/bin/env node
/* One-time exact Commons import; never substitute a different Niagara photo on failure.
 * Horseshoe Falls and Niagara River, Niagara Falls 2026.jpg
 * Photographer Chicken4War, 19 Aug 2026, CC BY-SA 4.0.
 * https://commons.wikimedia.org/wiki/File:Horseshoe_Falls_and_Niagara_River,_Niagara_Falls_2026.jpg
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const name='Horseshoe_Falls_and_Niagara_River,_Niagara_Falls_2026.jpg';
// Verified original Commons upload path: /8/86/, not the space-normalized filename MD5.
const key='8/86';
const base='https://upload.wikimedia.org/wikipedia/commons/';
const encoded=encodeURIComponent(name);
const urls=[base+'thumb/'+key+'/'+encoded+'/1920px-'+encoded,base+'thumb/'+key+'/'+encoded+'/1600px-'+encoded,base+key+'/'+encoded];
const dest=path.resolve('public/assets/niagara-falls/photos/hero.source.jpg');
(async()=>{
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 let last='no attempts';
 for(const url of urls){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),30000);
  try{
   const r=await fetch(url,{signal:ctrl.signal,redirect:'follow',headers:{'User-Agent':'ChrisIzworski-NiagaraHero/1.0 (https://chrisizworski.com/niagara-falls-today/; Wikimedia license credit)',Accept:'image/jpeg,image/*;q=0.8'}});
   if(!r.ok)throw Error('HTTP '+r.status);
   const bytes=Buffer.from(await r.arrayBuffer());
   if(bytes.length<50000||bytes.length>12000000||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw Error('Invalid JPEG signature or size '+bytes.length);
   fs.writeFileSync(dest,bytes);
   console.log('Authenticated photographic media byte signature, source='+url+' size='+bytes.length);
   return;
  }catch(e){last=String(e);console.log('Source request failed; trying next source encoding:',last);}
  finally{clearTimeout(timer);}
 }
 throw Error('Failed to acquire exact licensed Niagara photo; refusing unrelated substitute: '+last);
})().catch(e=>{console.error(e);process.exitCode=1;});
