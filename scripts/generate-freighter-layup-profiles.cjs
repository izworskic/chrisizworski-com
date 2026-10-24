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
for(const p of bios.profiles){
 const target=path.join(root,'public/great-lakes-freighter-winter-layup/vessels',p.id,'index.html');
 const generated=renderProfile(p,data);
 if(check){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==generated)throw Error('stale biography '+p.id);}
 else {fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,generated,'utf8');}
}
console.log((check?'Checked':'Generated')+' '+bios.profiles.length+' vessel biographies');
