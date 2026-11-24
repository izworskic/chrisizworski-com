'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const lab=path.join(root,'design-systems/production-design-pilot');
const css=fs.readFileSync(path.join(lab,'foundations.css'),'utf8');
const html=fs.readFileSync(path.join(lab,'index.html'),'utf8');
const get=(body)=>Object.fromEntries([...body.matchAll(/(--pd-[\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
const base=get(css.match(/\.lab\s*\{([^}]+)\}/)[1]);
function contrast(a,b){
 const lum=c=>{const x=c.replace('#','').match(/../g).map(v=>{const s=parseInt(v,16)/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4});return .2126*x[0]+.7152*x[1]+.0722*x[2]};
 const [x,y]=[lum(a),lum(b)].sort((a,b)=>b-a);return (x+.05)/(y+.05);
}
test('candidate foundations stay scoped and resolve all lab semantic roles',()=>{
 assert.doesNotMatch(css,/:root/);
 for(const m of css.matchAll(/([^{}]+)\{/g))assert.match(m[1].replace(/\/\*[\s\S]*?\*\//g,'').trim(),/^\.lab(?:\s|$)/);
 const roles=new Set([...css.matchAll(/(--pd-[\w-]+):/g)].map(m=>m[1]));
 for(const m of html.matchAll(/var\((--pd-[\w-]+)\)/g))assert.ok(roles.has(m[1]),m[1]);
 assert.match(html,/href="foundations\.css"/);
 assert.match(html,/content="noindex,nofollow"/);
 assert.match(html,/fictional test fixtures/);
 assert.equal(base['--pd-type-body'],'16px');
 assert.equal(base['--pd-target-min'],'44px');
});
test('source-derived family text, accent and focus pairs meet declared contrast checks',()=>{
 const families=[base,...[...css.matchAll(/\.lab \.[\w-]+\s*\{([^}]+)\}/g)].map(m=>({...base,...get(m[1])}))];
 assert.equal(families.length,4);
 for(const f of families){
  for(const bg of ['--pd-paper','--pd-surface']){
   for(const fg of ['--pd-ink','--pd-muted','--pd-accent'])assert.ok(contrast(f[fg],f[bg])>=4.5,fg+' '+f[fg]+' on '+f[bg]);
   assert.ok(contrast(f['--pd-focus'],f[bg])>=3);
  }
 }
});
test('existing actual AIS asset and explicit nonmaritime evidence are retained',()=>{
 assert.match(html,/src="\.\.\/\.\.\/public\/assets\/seaway-vessel-icons\.js"/);
 assert.match(html,/id="glyphs"/);
 assert.match(html,/Not reported/);
 assert.match(html,/Not calculated/);
 assert.match(html,/id="journey-details"/);
 assert.doesNotMatch(html,/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
 assert.doesNotMatch(html,/<script[^>]+src="https?:/);
});
