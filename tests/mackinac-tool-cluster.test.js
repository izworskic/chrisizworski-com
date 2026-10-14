const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const ROOT=path.join(__dirname,"..");
const TOOLS=[
 ["ferry","public/mackinac-island/ferry-planner/index.html","https://chrisizworski.com/mackinac-island/ferry-planner/"],
 ["bridge","public/mackinac-bridge-live/index.html","https://chrisizworski.com/mackinac-bridge-live/"],
 ["tolls","public/mackinac-bridge-tolls/index.html","https://chrisizworski.com/mackinac-bridge-tolls/"],
 ["color","public/fall-color/mackinac-island-fall-color/index.html","https://chrisizworski.com/fall-color/mackinac-island-fall-color/"]
];
const hrefs=TOOLS.map(([, , canonical])=>new URL(canonical).pathname);
test("four independent Mackinac pages provide the same reversible navigation",()=>{
 for(const [active,file,canonical] of TOOLS){
  const html=fs.readFileSync(path.join(ROOT,file),"utf8");
  assert.ok(html.includes('rel="canonical" href="'+canonical+'"'),active+" canonical preserved");
  assert.ok(html.includes('/assets/mackinac-tool-cluster.css'),active+" css");
  const match=html.match(/<nav class="mtc-nav" aria-label="Straits of Mackinac tools">([\s\S]*?)<\/nav>/);
  assert.ok(match,active+" cluster missing");
  const links=[...match[1].matchAll(/<a class="mtc-link" href="([^"]+)"([^>]*)>/g)];
  assert.deepEqual(links.map(x=>x[1]),hrefs,active+" reciprocal order");
  assert.equal(links.filter(x=>x[2].includes('aria-current="page"')).length,1,active+" active count");
  assert.equal(links[hrefs.indexOf(new URL(canonical).pathname)][2].includes('aria-current="page"'),true,active+" correct active page");
  assert.equal((html.match(/data-mackinac-tool-cluster/g)||[]).length,1,active+" no duplication");
  for(const old of ['href="/mackinac-island/"','/mackinac-island/where-to-stay/'])assert.ok(!match[1].includes(old),active+" links retired hub");
 }
});
test("ferry functionality, bridge status ribbon, toll calculator and fall forecast remain",()=>{
 const read=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
 const ferry=read(TOOLS[0][1]);assert.match(ferry,/id="ferry-form"/);assert.match(ferry,/id="ferry-results"/);assert.match(ferry,/mackinac-ferry-decision\.js/);
 const bridge=read(TOOLS[1][1]);assert.match(bridge,/id="liveRibbon"/);assert.ok(bridge.indexOf('id="liveRibbon"')<bridge.indexOf('data-mackinac-tool-cluster'));
 const tolls=read(TOOLS[2][1]);assert.match(tolls,/mackinac-toll-calculator\.js/);
 const color=read(TOOLS[3][1]);assert.match(color,/id="live"/);
});
test("same document pages are linked, not simulated SPA tabs or new-window links",()=>{
 for(const [_,file] of TOOLS){
  const html=fs.readFileSync(path.join(ROOT,file),"utf8"),match=html.match(/<nav class="mtc-nav"[\s\S]*?<\/nav>/);
  assert.ok(!/target="_blank"|role="tablist"|role="tab"/.test(match[0]));
 }
});
