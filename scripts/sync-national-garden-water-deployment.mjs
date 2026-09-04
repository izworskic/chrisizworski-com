#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const sourceRepo='izworskic/national-garden-water';
const sourceRef='main';
const rawBase=`https://raw.githubusercontent.com/${sourceRepo}/${sourceRef}`;
const files=new Map([
  ['api/national-garden-water.js','api/national-garden-water.js'],
  ['public/assets/national-garden-water-engine.js','public/assets/national-garden-water-engine.js'],
  ['public/assets/national-garden-water-page.js','public/assets/national-garden-water-page.js'],
  ['public/assets/national-garden-water.css','public/assets/national-garden-water.css'],
  ['public/data/national-garden-water-crops.json','public/data/national-garden-water-crops.json'],
  ['public/national-tools/garden-water/index.html','public/national-tools/garden-water/index.html'],
]);

async function fetchText(url){
  const r=await fetch(url,{headers:{'user-agent':'chrisizworski-com garden-water deployment sync','cache-control':'no-cache'}});
  if(!r.ok)throw new Error(`${url} HTTP ${r.status}`);
  return r.text();
}

for(const [source,target] of files){
  let text=await fetchText(`${rawBase}/${source}?sync=${Date.now()}`);
  if(source==='api/national-garden-water.js'){
    const marker="  res.setHeader('Content-Type','application/json; charset=utf-8');";
    if(!text.includes(marker))throw new Error('Garden Water API response-header contract changed; review deployment adapter.');
    text=text.replace(marker,`${marker}\n  res.setHeader('X-Robots-Tag','noindex, nofollow');`);
  }
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,text,'utf8');
  console.log(`mirrored ${source} -> ${target}`);
}

const commit=await fetch(`https://api.github.com/repos/${sourceRepo}/commits/${sourceRef}`,{headers:{'user-agent':'chrisizworski-com garden-water deployment sync','accept':'application/vnd.github+json'}}).then(async r=>{
  if(!r.ok)throw new Error(`source commit lookup HTTP ${r.status}`);
  return r.json();
});
await fs.writeFile('public/national-tools/garden-water/deployment-source.json',JSON.stringify({sourceRepo,sourceRef,sourceCommit:commit.sha,syncedAt:new Date().toISOString(),deploymentAdapter:'adds X-Robots-Tag noindex for main-site API contract'},null,2)+'\n','utf8');

const vercelPath='vercel.json';
const vercel=JSON.parse(await fs.readFile(vercelPath,'utf8'));
const localSources=new Set([
  '/api/national-garden-water',
  '/assets/national-garden-water.css',
  '/assets/national-garden-water-engine.js',
  '/assets/national-garden-water-page.js',
  '/data/national-garden-water-crops.json',
  '/national-tools/garden-water',
  '/national-tools/garden-water/',
]);
const before=vercel.rewrites.length;
vercel.rewrites=vercel.rewrites.filter(rule=>!localSources.has(rule.source));
if(before-vercel.rewrites.length!==localSources.size){
  throw new Error(`Expected to remove ${localSources.size} stale Garden Water rewrites, removed ${before-vercel.rewrites.length}`);
}
await fs.writeFile(vercelPath,JSON.stringify(vercel,null,2)+'\n','utf8');

const routingTest=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n\nconst vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'));\nconst registry=JSON.parse(fs.readFileSync('benchmarks/tool-network-registry.json','utf8'));\nconst localSources=new Set([\n  '/api/national-garden-water',\n  '/assets/national-garden-water.css',\n  '/assets/national-garden-water-engine.js',\n  '/assets/national-garden-water-page.js',\n  '/data/national-garden-water-crops.json',\n  '/national-tools/garden-water',\n  '/national-tools/garden-water/',\n]);\n\ntest('Garden Water deploys from the main-site filesystem instead of the stale child alias',()=>{\n  for(const source of localSources){\n    assert.equal(vercel.rewrites.find(rule=>rule.source===source),undefined,source+' must not be externally rewritten');\n  }\n  for(const file of [\n    'api/national-garden-water.js',\n    'public/assets/national-garden-water-engine.js',\n    'public/assets/national-garden-water-page.js',\n    'public/assets/national-garden-water.css',\n    'public/data/national-garden-water-crops.json',\n    'public/national-tools/garden-water/index.html',\n    'public/national-tools/garden-water/deployment-source.json',\n  ]) assert.equal(fs.existsSync(file),true,file);\n});\n\ntest('mirrored Garden Water contains the recent-rain and state-color fixes',()=>{\n  const engine=fs.readFileSync('public/assets/national-garden-water-engine.js','utf8');\n  const page=fs.readFileSync('public/assets/national-garden-water-page.js','utf8');\n  const css=fs.readFileSync('public/assets/national-garden-water.css','utf8');\n  const html=fs.readFileSync('public/national-tools/garden-water/index.html','utf8');\n  const api=fs.readFileSync('api/national-garden-water.js','utf8');\n  assert.match(engine,/soakingRecentRain/);\n  assert.match(engine,/observedWater>=0\\.75/);\n  assert.match(engine,/Number\\.isFinite\\(parsedRainAge\\)/);\n  assert.match(page,/result\\.dataset\\.state/);\n  assert.match(page,/rainGaugeIn:rainGauge/);\n  assert.match(css,/data-state=\\"water-today\\"/);\n  assert.match(css,/--state-color:var\\(--red\\)/);\n  assert.match(html,/20260904-v3/);\n  assert.match(api,/summarizeStationRain/);\n  assert.match(api,/slice\\(0,4\\)/);\n  assert.match(api,/X-Robots-Tag/);\n  assert.match(api,/noindex, nofollow/);\n});\n\ntest('Garden Water keeps one canonical registry owner',()=>{\n  const node=registry.tools.find(tool=>tool.id==='national-garden-water');\n  assert.equal(node?.canonical,'https://chrisizworski.com/national-tools/garden-water/');\n  assert.equal(node?.cluster,'gardening');\n  const group=registry.cannibalizationGroups.find(group=>group.owner==='national-garden-water');\n  assert.ok(group);\n});\n`;
await fs.writeFile('tests/national-garden-water-routing.test.js',routingTest,'utf8');

console.log(`Garden Water deployment mirror synced from ${commit.sha}`);
