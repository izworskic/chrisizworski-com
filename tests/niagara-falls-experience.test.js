'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('public/niagara-falls-today/index.html');
const css=read('public/assets/niagara-falls-today.css');
const script=read('public/assets/niagara-falls-today.js');
const guide=read('public/assets/niagara-falls-guide.js');
const context={window:{}};vm.runInNewContext(guide,context,{timeout:1000});
const stops=context.window.NiagaraFallsGuide;
test('V4 preserves one licensed hero photo and adds only verified film posters, not static galleries',()=>{
 assert.equal((html.match(/<img /g)||[]).length,4);
 assert.equal((html.match(/<img src="\/assets\/niagara-falls\/photos\/horseshoe-2026\.jpg"/g)||[]).length,1);
 assert.equal((html.match(/i\.ytimg\.com\/vi\/[^"]+\/hqdefault\.jpg/g)||[]).length,3);
 assert.match(html,/src="\/assets\/niagara-falls\/photos\/horseshoe-2026.jpg"/);
 assert.match(html,/https:\/\/chrisizworski\.com\/assets\/niagara-falls\/photos\/horseshoe-2026.jpg/);
 assert.doesNotMatch(html,/<section class="experience"|class="scene-grid"|class="film-grid"/);
 assert.doesNotMatch(script,/stopMedia|NiagaraFallsMedia/);
 assert.doesNotMatch(html,/upload\.wikimedia\.org\/wikipedia\/commons\/thumb/);
});
test('hero is an actual locally imported image, not a remote URL or missing placeholder',()=>{
 const target=path.join(root,'public/assets/niagara-falls/photos/horseshoe-2026.jpg');
 assert.ok(fs.existsSync(target),'Missing first-party photograph; run the licensed importer. Do not merge without it.');
 const bytes=fs.readFileSync(target);
 assert.ok(bytes.length>45000&&bytes.length<1600000);
 assert.deepEqual([...bytes.subarray(0,3)],[255,216,255]);
 assert.equal(bytes.subarray(0,200).includes(Buffer.from('<svg')),false);
 assert.match(css,/\.hero-photo img\{[^}]*object-fit:cover/);
 assert.match(script,/hero\.classList\.add\('is-missing'\)/);
});
test('interpretive writing has eight differentiated, source-grounded stops',()=>{
 const ids=['prospect','goat','maid','cave','table','victoria','journey','cruise'];
 assert.equal(Object.keys(stops).length,8);
 for(const id of ids){
  const x=stops[id];assert.ok(x,id);
  for(const key of ['where','scene','context','notice','tip','transition','source'])assert.equal(typeof x[key],'string',id+':'+key);
  assert.ok(x.scene.length>280&&x.context.length>280&&x.notice.length>60&&x.tip.length>65,id);
  assert.match(x.source,/^https:\/\/www\.(niagarafallsstatepark|niagaraparks)\.com\//);
 }
 assert.equal(new Set(ids.map(id=>stops[id].scene)).size,8);
});
test('route story is derived from real selected stops and preserves planner safety',()=>{
 assert.match(script,/stopStory\(s,i\?stops\[i-1\]:null,r\)/);
 assert.match(script,/guideIntro\(r,stops\)/);
 assert.match(script,/s\.schedule\.lastAdmission/);
 assert.match(script,/s\.transfer_minutes/);
 assert.match(script,/r\.unknowns/);
 assert.match(script,/HOURS_NOT_VERIFIED/);
 assert.match(script,/updateSideGuide\(r\)/);
});
test('three verified films require visitor interaction; original relevant Ontario film remains optional',()=>{
 const films=read('public/assets/niagara-visit-films.js');
 assert.doesNotMatch(html,/<iframe/);
 assert.equal((html.match(/data-niagara-clip="/g)||[]).length,3);
 for(const id of ['F1D0AUIfKJk','hmQwm0drhGU','l6fu2huqWNE']){
  assert.match(html,new RegExp('data-niagara-clip="'+id+'"'));
  assert.match(html,new RegExp('https://www.youtube.com/watch\\?v='+id));
  assert.match(films,new RegExp(id));
 }
 assert.match(films,/document\.addEventListener\('click'/);
 assert.match(films,/youtube-nocookie\.com\/embed/);
 assert.match(script,/stops\.some\(function\(s\)\{return s\.id==='table';\}\)/);
 assert.match(script,/DlMgURteL3E/);
});
test('source identity and mobile responsiveness remain intact',()=>{
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/niagara-falls-today\/"/);
 assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
 assert.match(html,/Built by Chris Izworski/);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/Chicken4War/);
 assert.match(html,/CC BY-SA 4\.0/);
});
