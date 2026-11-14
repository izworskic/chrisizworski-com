#!/usr/bin/env node
// Synchronize the HTML-first Waterfall Explorer list with exact, license-reviewed photo provenance.
// Usage: node scripts/sync-up-waterfall-photo-cards.mjs --check | --write
// Photo identity/rights decisions are human-reviewed separately; never derive them from proximity.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mode=process.argv[2];
if(!['--check','--write'].includes(mode)||process.argv.length!==3){
  console.error('Usage: node scripts/sync-up-waterfall-photo-cards.mjs --check|--write');
  process.exit(2);
}
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const provenance=JSON.parse(read('data/up-waterfall-photo-provenance.json'));
const queue=JSON.parse(read('data/up-waterfall-photo-review-queue.json'));
const curated=JSON.parse(read('data/up-waterfalls.json'));
const target=path.join(root,'public/upper-peninsula-waterfalls/index.html');
const original=fs.readFileSync(target,'utf8');
const photoIds=new Set(provenance.photos.map(p=>p.id));
const pendingIds=new Set(queue.pending.map(p=>p.id));
const catalogIds=new Set(curated.waterfalls.map(p=>p.id));
if(photoIds.size!==provenance.photos.length||pendingIds.size!==queue.pending.length
  ||photoIds.size+pendingIds.size!==catalogIds.size
  ||![...photoIds,...pendingIds].every(id=>catalogIds.has(id))
  ||[...photoIds].some(id=>pendingIds.has(id))){
  throw new Error('Photo provenance, held queue and 80-destination catalog are out of sync');
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const photos=new Map(provenance.photos.map(p=>[p.id,p]));
const visited=new Set();
const cards=/<article class="waterfall-card" data-fall data-id="([^"]+)"[\s\S]*?<\/article>/g;
let count=0;
const updated=original.replace(cards,(card,id)=>{
  count++;
  if(visited.has(id)||!catalogIds.has(id))throw new Error('Duplicate/unknown waterfall result '+id);
  visited.add(id);
  const existing=(card.match(/<figure class="upfall-card-preview">/g)||[]).length;
  if(existing>1)throw new Error('Duplicate preview in '+id);
  const clean=card.replace(/<figure class="upfall-card-preview">[\s\S]*?<\/figure>/g,'');
  const p=photos.get(id);
  if(!p)return clean;
  if(!clean.includes('</h3>'))throw new Error('Missing heading in '+id);
  if(!p.imageUrl?.startsWith('https://')||!p.sourceUrl?.startsWith('https://')
    ||!p.licenseUrl?.startsWith('https://')||p.id!==id||!p.width||!p.height){
    throw new Error('Invalid reviewed photo record '+id);
  }
  const guide='/upper-peninsula-waterfalls/'+id+'/';
  const fig='<figure class="upfall-card-preview"><a href="'+guide+'" aria-label="View photo and visitor guide for '+esc(p.name)+'"><img src="'+esc(p.imageUrl)+'" alt="'+esc(p.alt)+'" width="'+p.width+'" height="'+p.height+'" loading="lazy" decoding="async" fetchpriority="low"></a><figcaption>Photo: <a href="'+esc(p.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(p.creator)+'</a> · <a href="'+esc(p.licenseUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(p.license)+'</a></figcaption></figure>';
  return clean.replace('</h3>','</h3>'+fig);
});
if(count!==catalogIds.size||visited.size!==catalogIds.size)throw new Error('Expected exactly '+catalogIds.size+' catalog waterfall cards; got '+count);
const displayed=(updated.match(/class="upfall-card-preview"/g)||[]).length;
if(displayed!==photoIds.size)throw new Error('Expected exactly '+photoIds.size+' verified card photos; got '+displayed);
if(original!==updated){
  if(mode==='--check'){
    console.error('Waterfall photo previews are stale. Run: node scripts/sync-up-waterfall-photo-cards.mjs --write and commit the updated hub.');
    process.exit(1);
  }
  fs.writeFileSync(target,updated);
  console.log('Updated '+displayed+' source-verified photo cards; '+pendingIds.size+' intentionally unphotographed.');
} else {
  console.log('Waterfall photo card previews current: '+displayed+' licensed images, '+pendingIds.size+' pending.');
}
