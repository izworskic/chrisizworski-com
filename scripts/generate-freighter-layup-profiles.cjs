'use strict';
/* Refresh static biography pages from the canonical registry and permanent biography data.
   Run: node scripts/generate-freighter-layup-profiles.cjs
   Check: node scripts/generate-freighter-layup-profiles.cjs --check
   No live fetches, API keys, secrets, or modifications to existing shipping tools. */
const fs=require('node:fs'),path=require('node:path');
const {renderProfile}=require('../lib/freighter-layup-profile-render.cjs');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'public/assets/freighter-layup-registry.json'),'utf8'));
const bios=JSON.parse(fs.readFileSync(path.join(root,'public/assets/freighter-vessel-biographies.json'),'utf8'));
const profileIndex=new Set(bios.profiles.map(p=>p.id));
if(profileIndex.size!==bios.profiles.length)throw Error('duplicate biography slug');
for(const p of bios.profiles){
 if(!data.seasons.some(s=>s.records.some(r=>r.id===p.id)))throw Error('no winter record for '+p.id);
 if(!p.chapters||p.chapters.length<2||!p.chapters.every(ch=>ch.heading&&ch.body&&ch.source))throw Error('thin or unsourced biography '+p.id);
}
data.__profiles=bios.profiles;
const check=process.argv.includes('--check');
const sitemapPath=path.join(root,'public/sitemap-winter.xml');
const sitemap=fs.readFileSync(sitemapPath,'utf8');
const begin='  <!-- FREIGHTER_LAYUP_VESSEL_SITEMAP:START -->';
const end='  <!-- FREIGHTER_LAYUP_VESSEL_SITEMAP:END -->';
const vesselRoot='https://chrisizworski.com/great-lakes-freighter-winter-layup/vessels/';
const parent='https://chrisizworski.com/great-lakes-freighter-winter-layup/';
const today=new Date().toISOString().slice(0,10);
const entries=[];
const pattern=/<url><loc>(https:\/\/chrisizworski\.com\/great-lakes-freighter-winter-layup\/vessels\/([a-z0-9-]+)\/)<\/loc><lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod><\/url>/g;
const priorDates=new Map([...sitemap.matchAll(pattern)].map(x=>[x[2],x[3]]));
if(priorDates.size&&sitemap.split(begin).length!==2)throw Error('stray vessel sitemap entries');
for(const p of bios.profiles.slice().sort((a,b)=>a.id.localeCompare(b.id))){
 const target=path.join(root,'public/great-lakes-freighter-winter-layup/vessels',p.id,'index.html');
 const generated=renderProfile(p,data);
 const exists=fs.existsSync(target),old=exists?fs.readFileSync(target,'utf8'):null;
 const changed=generated!==old;
 const canonical=vesselRoot+p.id+'/';
 if(!generated.includes('<link rel="canonical" href="'+canonical+'">'))throw Error('biography canonical mismatch '+p.id);
 if(check){
  if(changed)throw Error('stale biography '+p.id);
 }else if(changed){
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,generated,'utf8');
 }
 // Only a changed page receives a new lastmod; rerunning the watch is inert.
 const previous=priorDates.get(p.id);
 const modified=changed||!previous?today:previous;
 if(modified>today)throw Error('future sitemap lastmod '+p.id);
 entries.push('  <url><loc>'+canonical+'</loc><lastmod>'+modified+'</lastmod></url>');
}
let updated=sitemap;
if(updated.includes(begin)||updated.includes(end)){
 if(updated.split(begin).length!==2||updated.split(end).length!==2)throw Error('duplicated sitemap ownership markers');
 updated=updated.slice(0,updated.indexOf(begin))+begin+'\n'+entries.join('\n')+'\n'+end+updated.slice(updated.indexOf(end)+end.length);
}else{
 const locator='<loc>'+parent+'</loc><lastmod>';
 const at=updated.indexOf(locator);
 if(at<0||updated.indexOf(locator,at+1)>=0)throw Error('winter atlas sitemap entry missing or duplicated');
 const close=updated.indexOf('</url>',at);
 if(close<0)throw Error('winter atlas sitemap URL malformed');
 const position=close+'</url>'.length;
 updated=updated.slice(0,position)+'\n'+begin+'\n'+entries.join('\n')+'\n'+end+updated.slice(position);
}
if(check){
 if(updated!==sitemap)throw Error('winter layup vessel sitemap is stale');
}else if(updated!==sitemap){
 fs.writeFileSync(sitemapPath,updated,'utf8');
}
console.log((check?'Checked':'Generated')+' '+bios.profiles.length+' vessel biographies and sitemap URLs');
