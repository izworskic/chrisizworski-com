#!/usr/bin/env node
'use strict';
/* Tests genuine Rust-generated WASM plus per-record source and date policy.
 * Source and visitor text remain in the existing curated waterfall ledger.
 */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const binaryFlag = process.argv.find(x=>x.startsWith('--wasm='));
const pinned = path.join(root,'public/assets/up-waterfalls-visitability.wasm.b64');
const bin = binaryFlag ? fs.readFileSync(binaryFlag.slice(7)) :
  Buffer.from(fs.readFileSync(pinned,'utf8').trim(),'base64');
const hub = read('public/upper-peninsula-waterfalls/index.html');
const cards = [...hub.matchAll(/<article class="waterfall-card"([^>]+)>/g)]
  .map(m => Object.fromEntries([...m[1].matchAll(/data-([\w-]+)="([^"]*)"/g)].map(x=>[x[1],x[2]])));
const status = {verify:0,seasonal:1,restricted:2,closed:3,research:4};
const flags = c => {
  const id=c.id;
  let v = 0;
  if(id==='gabbro-falls')v|=1;
  if(id==='scott-falls')v|=2;
  if(id==='houghton-douglass-falls')v|=4;
  if(id==='mex-i-min-e-falls')v|=8;
  if(id==='bond-falls')v|=16;
  if(['fumee-falls','agate-falls','tioga-park-falls'].includes(id))v|=32;
  if((c.place||'').toLowerCase().includes('porcupine')||
     /porkies|south boundary|pinkerton/i.test((c['arrival-parking']||'')+' '+(c['arrival-trail']||'')))v|=64;
  if(['potawatomi-falls','gorge-falls','sandstone-falls','rainbow-falls','great-conglomerate-falls'].includes(id))v|=128;
  return v;
};
const expected=(c,month)=>{
  if(c.status==='closed'||c.status==='research'||c['arrival-verified']!=='verified')return 0;
  const f=flags(c), winter=month>=11||month<=4;
  return ['seasonal','restricted'].includes(c.status) ||
    !!(f&(1|2|4|128)) ||
    !!(f&8 && (month>=10||month<=5)) ||
    !!(f&16 && winter) || !!(f&32 && winter) ||
    !!(f&64 && (month===12||month<=5)) ? 2:1;
};
async function main(){
  assert.equal(bin.toString('hex',0,4),'0061736d','Rust engine is not WebAssembly');
  assert.equal(cards.length,80,'curated source count changed; review new destinations');
  const e=(await WebAssembly.instantiate(bin,{})).instance.exports;
  assert.equal(e.wf_version(),2);
  for(const name of ['wf_policy','wf_budget_allows','wf_compare'])
    assert.equal(typeof e[name],'function','Missing real Rust export '+name);
  let checks=0;
  for(const c of cards)for(let m=1;m<=12;m++){
    assert.equal(e.wf_policy(status[c.status],Number(c['arrival-verified']==='verified'),flags(c),m),expected(c,m),c.id+' month '+m);
    checks++;
  }
  assert.equal(e.wf_policy(3,1,0,7),0,'closed waterfall must stay excluded');
  assert.equal(e.wf_policy(0,0,0,7),0,'unverified parking/arrival must stay excluded');
  assert.equal(e.wf_policy(0,1,256,7),0,'unknown source flag must fail closed');
  assert.equal(e.wf_policy(0,1,0,13),0,'invalid travel month must fail closed');
  for(const [time,limit,expected] of [[30,30,1],[120,60,0],[-1,60,0],[-1,-1,1],[200,-1,1]]){
    assert.equal(e.wf_budget_allows(time,limit),expected);
  }
  assert.equal(e.wf_compare(1,1,120,1,0,30),-1,'agency evidence tie-break');
  assert.equal(e.wf_compare(1,1,60,2,1,30),-1,'source caution precedence');
  assert.equal(e.wf_compare(1,1,90,1,1,60),1,'published full time');
  assert.equal(e.wf_compare(1,1,60,1,1,60),0,'name tie-break remains outside wasm');
  if(binaryFlag && fs.existsSync(pinned)){
    assert.deepEqual(bin,Buffer.from(read('public/assets/up-waterfalls-visitability.wasm.b64').trim(),'base64'),
      'Committed Rust binary differs from reproducible pinned compiler output');
  }
  const js=read('public/assets/up-waterfalls-visit-lens.js');
  const adapter=read('public/assets/up-waterfalls-rust.js');
  assert.ok(hub.indexOf('up-waterfalls-rust.js')<hub.indexOf('up-waterfalls-visit-lens.js'),
    'Rust adapter must load before the existing HTML-first decision desk');
  assert.match(js,/native\.budgetAllows/);
  assert.match(js,/native\.compare/);
  assert.match(js,/p=native\?\.policy/);
  assert.match(js,/javascript-fallback/);
  assert.match(adapter,/new Date\(2026,month-1,15\)/);
  assert.match(adapter,/legacy\.excluded !== native\.excluded/);
  assert.match(adapter,/throw new Error\('Rust source-policy divergence/);
  assert.match(adapter,/WebAssembly\.instantiate\(bytes, \{\}\)/);
  console.log('PASS: genuine Rust/WASM, '+checks+' waterfall/month decisions, full-visit budget/ranking, ABI and immutable HTML-first safety fallback; '+bin.length+' bytes.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
