'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/synced-national-tools/rocket-launch-live/index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'public/synced-national-tools/rocket-launch-live/app.js'),'utf8');

// Byte ranges of every <details class="rl-fold"> block.
function folds(){
  const out=[];const re=/<details class="rl-fold" id="([\w-]+)">/g;let m;
  while((m=re.exec(html))){
    let depth=1,i=re.lastIndex;
    while(depth){const o=html.indexOf('<details',i),c=html.indexOf('</details>',i);
      if(o!==-1&&o<c){depth++;i=o+8;}else{depth--;i=c+10;}}
    out.push({id:m[1],start:m.index,end:i,body:html.slice(m.index,i)});
  }
  return out;
}

test('launch day at a glance sits in the first card and every row jumps to a real section',()=>{
  const card=html.indexOf('<article class="rl-front-feature"'),glance=html.indexOf('id="rl-glance"');
  assert.ok(card>0&&glance>card&&glance<html.indexOf('</article>',card),'glance must be inside the up-next card');
  const block=html.slice(glance,html.indexOf('</nav>',glance));
  const targets=[...block.matchAll(/href="#([\w-]+)"/g)].map(m=>m[1]);
  assert.deepEqual(targets,['rl-access-decision','rl-regional-sky','launch-weather','rl-slip-lab','mission-watch','launch-truth-desk']);
  for(const id of targets)assert.match(html,new RegExp('id="'+id+'"'),'missing jump target '+id);
  assert.doesNotMatch(block,/\u2014/);
});

test('four secondary sections fold closed, and nothing is deleted',()=>{
  const f=folds();
  assert.deepEqual(f.map(x=>x.id),['rl-fold-rockets','rl-fold-history','rl-fold-sites','rl-fold-coasts']);
  for(const x of f)assert.doesNotMatch(x.body.slice(0,x.body.indexOf('>')),/\sopen/,x.id+' must start closed');
  const inside=(fold,id)=>assert.match(f.find(x=>x.id===fold).body,new RegExp('id="'+id+'"'),id+' moved out of '+fold);
  inside('rl-fold-rockets','rl-vehicle-field-notes');inside('rl-fold-rockets','rl-visual-family-gallery');
  inside('rl-fold-history','lt-changes');inside('rl-fold-history','lt-sources');
  inside('rl-fold-sites','rl-sites');inside('rl-fold-coasts','rl-national-board');
});

test('primary answers and the coastal map are never folded away',()=>{
  const f=folds();
  for(const id of ['rl-coast-map','rl-access-decision','rl-regional-sky','rl-slip-lab','launch-weather',
    'rl-official-wrap','mission-watch','lt-summary-title','rl-front-launch-list','rl-glance']){
    const at=html.indexOf('id="'+id+'"');
    if(at<0)continue; // optional ids rendered by script
    assert.ok(!f.some(x=>at>x.start&&at<x.end),id+' must stay visible');
  }
  assert.ok(html.indexOf('id="rl-coast-map"')>0,'coastal map must remain on the page');
});

test('glance is filled from loaded data and jump links open folded sections',()=>{
  assert.match(app,/renderSlipForecast\(data\);\n\s*renderGlance\(data\);/);
  assert.match(app,/function revealHash\(hash\)/);
  assert.match(app,/addEventListener\('hashchange'/);
  const fn=app.slice(app.indexOf('function renderGlance'),app.indexOf('function revealHash'));
  assert.doesNotMatch(fn,/fetch\(/,'glance must not make its own requests');
  assert.doesNotMatch(fn,/\u2014/);
});
