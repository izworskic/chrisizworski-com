#!/usr/bin/env node
/* One-time importer: real Algoberta entering Welland Lock 3, 2024.
 * Source: https://commons.wikimedia.org/wiki/File:Algoberta_heading_into_Welland_Canal_Lock_3.jpeg
 * Photographer Dough4872, CC BY-SA 4.0. Output is optimized separately.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const name='Algoberta_heading_into_Welland_Canal_Lock_3.jpeg';
const md5=crypto.createHash('md5').update(name).digest('hex');
const folder=md5.slice(0,1)+'/'+md5.slice(0,2);
const base='https://upload.wikimedia.org/wikipedia/commons/';
const encoded=encodeURIComponent(name);
const urls=[
 base+'thumb/'+folder+'/'+encoded+'/1600px-'+encoded,
 base+'thumb/'+folder+'/'+encoded+'/1280px-'+encoded,
 base+folder+'/'+encoded
];
const target=path.resolve('public/assets/welland/photos/hero-algoberta.source.jpg');
(async()=>{
 fs.mkdirSync(path.dirname(target),{recursive:true});
 let last='';
 for(const url of urls){
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),30000);
   try{
     const response=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{
       'User-Agent':'ChrisIzworski-WellandHero/1.0 (https://chrisizworski.com/welland-canal/; Commons credit linked)',
       Accept:'image/jpeg,image/*;q=0.8'
     }});
     if(!response.ok)throw Error('HTTP '+response.status);
     const bytes=Buffer.from(await response.arrayBuffer());
     if(bytes.length<30000||bytes.length>12000000||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw Error('Not JPEG or unsafe bytes '+bytes.length);
     fs.writeFileSync(target,bytes);
     console.log('Downloaded exact licensed Welland Algoberta photograph, bytes='+bytes.length);
     return;
   }catch(e){last=String(e);console.log('Trying next Commons URL:',last)}
   finally{clearTimeout(timeout)}
 }
 throw Error('Cannot download the licensed Algoberta original: '+last);
})().catch(e=>{console.error(e);process.exitCode=1;});
