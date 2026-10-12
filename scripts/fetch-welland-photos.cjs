#!/usr/bin/env node
/* Import verified Creative Commons Welland Canal photos into the site's static
 * assets. Run by the one-time photo-import workflow, not at page-render time.
 * Licence/photographer details stay in welland-canal.js and the credits doc.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const OUT=path.resolve('public/assets/welland/photos');
const files={
  north1:'Welland_Canal_Lock_1_Port_Weller.JPG',
  north2:'Thunder_Bay_out_of_Lock_2_2013-08-01_IMG_1091.jpg',
  north3:'Welland_Canal_Lock_3_from_observation_deck.jpeg',
  thorold:'Welland_Canal_Lock_7.jpg',
  south8:'Lock_8_Gateway_Park-Port_Colborne-Ontario-20220317.jpg'
};
const delays=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function urls(name){
  const md5=crypto.createHash('md5').update(name).digest('hex');
  const base='https://upload.wikimedia.org/wikipedia/commons/';
  const dir=md5[0]+'/'+md5.slice(0,2)+'/';
  const segment=encodeURIComponent(name).replace(/%2F/gi,'/');
  return [
    base+'thumb/'+dir+segment+'/640px-'+segment,
    base+'thumb/'+dir+segment+'/800px-'+segment,
    base+dir+segment,
    'https://commons.wikimedia.org/wiki/Special:Redirect/file/'+segment+'?width=640'
  ];
}
async function getJPEG(url){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),24000);
  try{
    const r=await fetch(url,{redirect:'follow',signal:controller.signal,headers:{
      'User-Agent':'ChrisIzworski-WellandCanalPhotoImport/1.0 (https://chrisizworski.com/welland-canal/; licensed Wikimedia attribution)',
      'Accept':'image/jpeg,image/*;q=0.8'
    }});
    if(!r.ok)throw Error('HTTP '+r.status);
    const bytes=Buffer.from(await r.arrayBuffer());
    if(bytes.length<10000||bytes.length>14000000||bytes[0]!==0xff||bytes[1]!==0xd8||bytes[2]!==0xff)throw Error('Not a valid JPEG or unsafe size: '+bytes.length);
    return bytes;
  }finally{clearTimeout(timeout);}
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const failures=[];
 for(const [key,name] of Object.entries(files)){
   const dest=path.join(OUT,key+'.jpg');
   let found=false;
   if(fs.existsSync(dest)&&fs.statSync(dest).size>10000){console.log(key,'already exists');continue;}
   for(const url of urls(name)){
     try{
       const data=await getJPEG(url);
       fs.writeFileSync(dest,data);
       console.log('Saved',key,'bytes',data.length,'source',url.split('/').slice(0,5).join('/'));
       found=true;
       break;
     }catch(e){console.warn('Source unavailable',key,url.split('?')[0],String(e.message));await delays(300);}
   }
   if(!found)failures.push(key);
 }
 if(failures.length)throw Error('Missing Welland photos: '+failures.join(', ')+'. Do not silently publish image-free cards.');
 console.log('Five real Welland image assets ready locally.');
})().catch(e=>{console.error(e);process.exitCode=1;});
