import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const page=readFileSync(path.join(root,'public/frozen-lighthouses-michigan/index.html'),'utf8');
const stylesheet=readFileSync(path.join(root,'public/assets/frozen-lighthouse-field-guide.css'),'utf8');
const controller=readFileSync(path.join(root,'public/assets/frozen-lighthouse-desk.js'),'utf8');
const manifest=JSON.parse(readFileSync(path.join(root,'data/frozen-lighthouse-photography.json'),'utf8'));
function ratio(first,second){
 const luminance=c=>{
  const parts=c.match(/\w\w/g).map(k=>parseInt(k,16)/255);
  return parts.reduce((s,v,i)=>s+(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)*[.2126,.7152,.0722][i],0);
 };
 const [a,b]=[luminance(first),luminance(second)].sort((x,y)=>x-y);
 return (b+.05)/(a+.05);
}

test('field-guide palette is legible snow/stone with warm lighthouse red rather than teal-on-teal',()=>{
 assert.match(stylesheet,/:root\s*\{\s*color-scheme:light/);
 assert.match(stylesheet,/--bg:#f7f6f2/);
 assert.match(stylesheet,/--ink:#172c36/);
 assert.match(stylesheet,/--highlight:#165775/);
 for(const [foreground,background] of [
  ['172c36','f7f6f2'],['475c66','f7f6f2'],
  ['165775','f7f6f2'],['9e4d3b','f7f6f2'],
  ['ffffff','254c5e'],['854330','fffbf7']]){
  assert.ok(ratio(foreground,background)>=4.5,foreground+' must pass WCAG AA against '+background);
 }
});

test('all three photos are place-matched, locally served, rights-attributed and explicitly historical',()=>{
 assert.equal(manifest.photos.length,3);
 assert.deepEqual(new Set(manifest.photos.map(p=>p.id)),new Set(['st-joseph','grand-haven','holland']));
 assert.match(page,/Historical, not live/);
 assert.match(page,/not a live camera or proof of current ice/i);
 for(const photo of manifest.photos){
  assert.match(photo.sourcePage,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.match(photo.license,/^CC BY(?:-SA)? /);
  assert.match(page,new RegExp('data-select-lighthouse="'+photo.placeIds[photo.placeIds.length-1]+'"|data-select-lighthouse="'+photo.placeIds[0]+'"'));
  assert.ok(page.includes(photo.sourcePage),'visible photographer link required for '+photo.id);
  assert.ok(page.includes(photo.licenseUrl),'license URL required for '+photo.id);
  for(const width of [640,1280]){
   const name=photo.outputStem+'-'+width+'.webp';
   const file=path.join(root,'public/assets/frozen-lighthouse-photos',name);
   const data=readFileSync(file);
   assert.equal(data.toString('ascii',0,4),'RIFF',name+' must be an actual WebP image');
   assert.equal(data.toString('ascii',8,12),'WEBP',name+' must be a WebP image');
   assert.ok(statSync(file).size<470000,name+' must remain optimized');
   assert.ok(page.includes(name),name+' must be used in page markup');
  }
 }
 assert.doesNotMatch(page,/(?:gettyimages|i\.pinimg|stockphoto)/i);
});
test('photo controls share existing forecast state without extra API requests',()=>{
 assert.match(controller,/data-select-lighthouse/);
 assert.match(controller,/link\.dataset\.selectLighthouse/);
 assert.match(controller,/render\(true\)/);
 assert.match(page,/id="forecast-desk"/);
 assert.match(page,/id="lighthouse-results"/);
 assert.match(page,/rel="canonical" href="https:\/\/chrisizworski\.com\/frozen-lighthouses-michigan\/"/);
 assert.match(page,/https:\/\/chrisizworski\.com\/#person/);
 assert.equal((page.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g)||[]).length,1);
});
