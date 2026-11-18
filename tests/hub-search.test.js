'use strict';
// Hub search for /tools/, /national-tools/ and /michigan-gardening/.
// Relevance (golden queries), Rust/WASM parity with the committed binary,
// generated-file freshness and page wiring.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const root=path.join(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const engine=require(path.join(root,'public/assets/hub-search-engine.js'));
const lexicon=(()=>{const w={};new Function('window',read('public/assets/hub-search-lexicon.js'))(w);return w.HubSearchLexicon;})();
const corpus=JSON.parse(read('data/hub-search/corpus.json'));
const golden=JSON.parse(read('data/hub-search/golden-queries.json'));

function search(page,q){
  const docs=corpus[page];
  const result=engine.rankText(engine.buildInput(q,lexicon,docs));
  const sel=engine.select(result);
  return {mode:sel.mode,ids:sel.order.map(i=>docs[i].id)};
}

test('normalization folds accents, okina and punctuation; light stemming is stable',()=>{
  assert.equal(engine.normalize('Haleakalā Hawaiʻi'),'haleakala hawaii');
  assert.deepEqual(['falls','berries','fishing','beaches','grass','ice'].map(engine.stem),['fall','berry','fish','beach','grass','ice']);
  assert.deepEqual(engine.queryTerms('Will it snow on Christmas?'),['snow','christma']);
});

for(const g of golden){
  test(`golden ${g.page}: ${JSON.stringify(g.q)} finds ${g.expect.join(' or ')} in the top ${g.top}`,()=>{
    const {ids}=search(g.page,g.q);
    assert.ok(g.expect.some(id=>ids.slice(0,g.top).includes(id)),`got ${JSON.stringify(ids.slice(0,5))}`);
  });
}

test('typo matching is a fallback, not noise on exact queries',()=>{
  assert.ok(!search('national','where is my plane').ids.includes('planting'));
  assert.ok(!search('tools','morel').ids.includes('trout-report'));
});

test('no-result and stopword-only queries are explicit states',()=>{
  assert.equal(search('national','xyzzy').mode,'none');
  assert.equal(search('national','the of and').mode,'all');
  assert.equal(search('tools','duck hunting').mode,'partial');
});

test('committed Rust/WASM binary returns the oracle ranking exactly',async()=>{
  const b64=read('public/assets/hub-search.wasm.b64').trim();
  assert.match(b64,/^AGFzbQ/,'asset must be base64 WebAssembly');
  await engine.instantiate(Buffer.from(b64,'base64'));
  for(const g of golden){
    const text=engine.buildInput(g.q,lexicon,corpus[g.page]);
    assert.deepEqual(engine.rankNative(text),engine.rankText(text),`drift for ${g.q}`);
  }
  assert.equal(engine.rank(engine.buildInput('xmas',lexicon,corpus.national)).engine,'rust');
});

test('lexicon and corpus are regenerated from the current pages',()=>{
  execFileSync('python3',[path.join(root,'scripts/build-hub-search.py'),'--check'],{cwd:root,stdio:'pipe'});
});

const PAGES={
  national:{html:'public/synced-national-tools/index.html',controller:'public/synced-national-tools/assets/national-tools-directory.js'},
  tools:{html:'public/tools/index.html',controller:'public/tools/index.html'},
  garden:{html:'public/michigan-gardening/index.html',controller:'public/assets/garden-tools/garden-hub.js'}
};
for(const [name,cfg] of Object.entries(PAGES)){
  test(`${name} page loads hub search before its own controller and defers text matching to it`,()=>{
    const html=read(cfg.html);
    assert.match(html,new RegExp(`data-hub-search="${name}"`));
    assert.match(html,/data-hub-search-results hidden/);
    assert.match(html,/<link rel="stylesheet" href="\/assets\/hub-search\.css\?v=\d+">/);
    const order=['hub-search-lexicon.js','hub-search-engine.js','hub-search.js'].map(f=>html.indexOf('/assets/'+f+'?v='));
    assert.ok(order.every(i=>i>0)&&order[0]<order[1]&&order[1]<order[2],'scripts in dependency order');
    const controller=read(cfg.controller);
    assert.match(controller,/window\.HubSearch/,'controller must defer to hub search');
  });
}

test('decision-network finder respects hub search on /tools/',()=>{
  const js=read('public/assets/decision-network.js');
  assert.match(js,/window\.HubSearch\?'hubsearch:change':'input'/);
  assert.match(js,/window\.HubSearch\?card\.dataset\.hubMatch!=='0'/);
});

test('search UI never sends typed text to analytics or innerHTML',()=>{
  const ui=read('public/assets/hub-search.js');
  assert.doesNotMatch(ui,/innerHTML/);
  for(const call of ui.match(/gtag\([^)]*\)/g)||[])assert.doesNotMatch(call,/\bq\b|query|value/);
});
