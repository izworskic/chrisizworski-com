#!/usr/bin/env node
// Prove the committed hub-search WebAssembly is the pinned rustc output and that
// it returns exactly the same integer ranking as the JavaScript oracle on every
// real directory card, for golden, vocabulary, typo, accent and noise queries.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const engine=require(path.join(root,'public/assets/hub-search-engine.js'));
const committed=fs.readFileSync(path.join(root,'public/assets/hub-search.wasm.b64'),'utf8').trim();
const wasmArg=process.argv.find(a=>a.startsWith('--wasm='));
if(wasmArg){
  const fresh=fs.readFileSync(wasmArg.slice(7)).toString('base64');
  assert.equal(committed,fresh,'Committed public/assets/hub-search.wasm.b64 differs from pinned rustc output. Rebuild with scripts/build-hub-search-rust.cjs.');
}
const lexicon=(()=>{const w={};new Function('window',fs.readFileSync(path.join(root,'public/assets/hub-search-lexicon.js'),'utf8'))(w);return w.HubSearchLexicon;})();
const corpus=JSON.parse(fs.readFileSync(path.join(root,'data/hub-search/corpus.json'),'utf8'));
const golden=JSON.parse(fs.readFileSync(path.join(root,'data/hub-search/golden-queries.json'),'utf8'));
(async()=>{
  await engine.instantiate(Buffer.from(committed,'base64'));
  let seed=20261118;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
  const typo=w=>{if(w.length<4)return w;const i=1+Math.floor(rnd()*(w.length-2));return w.slice(0,i)+w[i+1]+w[i]+w.slice(i+2);};
  let checks=0;
  for(const [page,docs] of Object.entries(corpus)){
    const vocab=[...new Set(docs.flatMap(d=>engine.normalize([d.title,d.tags,d.place].join(' ')).split(' ').filter(w=>w.length>2)))];
    const queries=new Set(['', 'the', 'xyzzy', 'Haleakalā Hawaiʻi', 'Lake’s ICE—fishing', 'december snow', 'xmas', ...golden.filter(g=>g.page===page).map(g=>g.q)]);
    for(let i=0;i<500;i++){
      const n=1+Math.floor(rnd()*3);const words=[];
      for(let j=0;j<n;j++){let w=vocab[Math.floor(rnd()*vocab.length)];const r=rnd();if(r<0.25)w=typo(w);else if(r<0.4)w=w.slice(0,Math.max(2,Math.floor(w.length*0.6)));else if(r<0.5)w=w.toUpperCase();words.push(w);}
      queries.add(words.join(' '));
    }
    for(const q of queries){
      const text=engine.buildInput(q,lexicon,docs);
      const js=engine.rankText(text);
      const rust=engine.rankNative(text);
      assert.deepEqual(rust,js,`Rust/JS drift on ${page} for query ${JSON.stringify(q)}`);
      checks++;
    }
  }
  assert.equal(engine.rank(engine.buildInput('christmas',lexicon,corpus.national)).engine,'rust');
  console.log(`Hub search Rust/WASM parity: ${checks} queries x real directory cards identical (${(committed.length*3/4/1024).toFixed(1)} KB binary).`);
})().catch(e=>{console.error(e.message||e);process.exit(1);});
