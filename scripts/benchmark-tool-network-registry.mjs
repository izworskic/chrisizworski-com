#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>readFile(path.join(root,rel),'utf8');
const registry=JSON.parse(await read('benchmarks/tool-network-registry.json'));
const toolsHtml=await read('public/tools/index.html');
const docs=await read('docs/TOOL_NETWORK_REGISTRY.md');
const pkg=JSON.parse(await read('package.json'));

const failures=[];
const fatal=[];
let score=0;
const check=(name,ok,points,detail='',isFatal=false)=>{
  if(ok) score+=points;
  else (isFatal?fatal:failures).push(detail?`${name}: ${detail}`:name);
};
const norm=input=>{
  try{
    const u=new URL(input,'https://chrisizworski.com');
    u.hash='';u.search='';
    let p=u.pathname.replace(/\/+$/,'')||'/';
    return `${u.protocol}//${u.host}${p}`.toLowerCase();
  }catch{return String(input||'').toLowerCase().replace(/\/+$/,'');}
};

const tools=registry.tools||[];
const ids=tools.map(t=>t.id);
const idSet=new Set(ids);
const urlOwners=new Map();
for(const tool of tools){
  for(const raw of [tool.canonical,...(tool.aliases||[])]){
    const n=norm(raw);
    if(!urlOwners.has(n)) urlOwners.set(n,tool.id);
  }
}

// Registry structure — 20
check('Registry has broad tool coverage',tools.length>=40,5,`only ${tools.length} nodes`);
check('Tool IDs are unique',idSet.size===ids.length,5,'duplicate tool IDs',true);
const required=['id','name','canonical','kind','cluster','primaryIntent','seasons','geographies','personas','networkRole','searchTreatment','searchEvidence'];
const incomplete=tools.filter(t=>required.some(k=>t[k]===undefined||t[k]===null));
check('Every node has required metadata',incomplete.length===0,5,incomplete.map(t=>t.id).join(', '),true);
const canonicalDupes=[];const seenCanon=new Map();
for(const t of tools){const n=norm(t.canonical);if(seenCanon.has(n))canonicalDupes.push(`${seenCanon.get(n)} / ${t.id}`);else seenCanon.set(n,t.id)}
check('Canonical ownership is unique',canonicalDupes.length===0,5,canonicalDupes.join(', '),true);

// Visible catalog coverage — 20
const cardUrls=[];
const cardRe=/<div class="tool-card"[^>]*>[\s\S]*?<div class="tool-title"><a href="([^"]+)"/g;
let m;while((m=cardRe.exec(toolsHtml)))cardUrls.push(m[1]);
const uniqueCards=[...new Set(cardUrls.map(norm))];
const missingCatalog=uniqueCards.filter(u=>!urlOwners.has(u));
check('Every visible Tools card is registered',missingCatalog.length===0,12,missingCatalog.join(', '),true);
check('Registry covers at least the visible catalog',tools.length>=uniqueCards.length,4,`${tools.length} registry vs ${uniqueCards.length} visible cards`);
check('Non-catalog strategic nodes are allowed',tools.some(t=>t.id==='manistee-field-map')&&tools.some(t=>t.id==='boat-launches')&&tools.some(t=>t.id==='shipwrecks'),4,'strategic nodes missing');

// Relationship integrity — 20
const rels=registry.relationships||[];
const badTargets=rels.filter(r=>!idSet.has(r.from)||!idSet.has(r.to)||r.from===r.to);
check('All relationships resolve to distinct nodes',badTargets.length===0,8,badTargets.map(r=>`${r.from}->${r.to}`).join(', '),true);
const strengths=new Set(['essential','strong','optional','experimental']);
const badRels=rels.filter(r=>!r.type||!r.surface||!r.reason||!strengths.has(r.strength));
check('Relationships carry reason, surface and strength',badRels.length===0,5,badRels.map(r=>`${r.from}->${r.to}`).join(', '),true);
check('Network has meaningful topology',rels.length>=45,4,`only ${rels.length} relationships`);
const outCount=new Map(ids.map(id=>[id,0]));const inCount=new Map(ids.map(id=>[id,0]));
for(const r of rels){if(outCount.has(r.from))outCount.set(r.from,outCount.get(r.from)+1);if(inCount.has(r.to))inCount.set(r.to,inCount.get(r.to)+1)}
const stranded=tools.filter(t=>t.networkRole!=='leaf'&&(outCount.get(t.id)||0)===0&&(inCount.get(t.id)||0)===0);
check('Non-leaf nodes are not isolated',stranded.length===0,3,stranded.map(t=>t.id).join(', '));

// Search ownership / experiment protection — 15
const groups=registry.cannibalizationGroups||[];
const badGroups=groups.filter(g=>!idSet.has(g.owner)||(g.supports||[]).some(x=>!idSet.has(x))||(g.supports||[]).includes(g.owner)||!g.rule);
check('Cannibalization groups resolve cleanly',badGroups.length===0,6,badGroups.map(g=>g.intent).join(', '),true);
const protectedIds=['aurora','soo-locks','ship-tracker','frost-dates','tomato-planting'];
const missingProtected=protectedIds.filter(id=>registry.tools.find(t=>t.id===id)?.searchTreatment?.status!=='protected');
check('Known active experiments remain protected',missingProtected.length===0,5,missingProtected.join(', '),true);
check('Search evidence allows unknowns without fabrication',tools.some(t=>t.searchEvidence.status==='unknown')&&tools.some(t=>t.searchEvidence.status==='measured'),4,'registry must retain both measured and unknown states');

// Best-fit candidate model — 15
const weights=registry.bestFitScoring||{};
const weightTotal=['distinctSearchIntent','networkFit','uniqueUtility','authorityAndSeasonFit','measurementPlan','cannibalizationSafety'].reduce((n,k)=>n+(weights[k]||0),0);
check('Best-fit weights total 100',weightTotal===100&&weights.total===100,5,`weights total ${weightTotal}`,true);
const candidates=registry.expansionOpportunities||[];
const badCandidates=[];
for(const c of candidates){
  const sum=Object.values(c.scores||{}).reduce((a,b)=>a+Number(b||0),0);
  if(sum!==c.bestFitScore||(c.connectsTo||[]).length<2||(c.connectsTo||[]).some(id=>!idSet.has(id)))badCandidates.push(c.id);
}
check('Candidate scores reconcile and connect into the network',badCandidates.length===0,6,badCandidates.join(', '),true);
check('Registry contains priority-scored expansion options',candidates.some(c=>c.bestFitScore>=weights.priorityThreshold),4,'no priority candidate');

// Operating model / release integration — 10
check('Agent operating instructions exist',/Workflow for any agent adding a tool/.test(docs)&&/Search acquisition/.test(docs)&&/Network amplification/.test(docs),4,'registry workflow documentation incomplete');
check('Measurement is explicitly privacy limited',/symbolic/.test(docs)&&/precise coordinates/.test(docs)&&/personal identifiers/.test(docs),2,'privacy measurement contract incomplete');
check('Registry benchmark is in full release gate',pkg.scripts['benchmark:tool-network']==='node scripts/benchmark-tool-network-registry.mjs'&&pkg.scripts['report:tool-network']==='node scripts/report-tool-network-registry.mjs'&&pkg.scripts['verify:all'].includes('benchmark:tool-network'),4,'package scripts not wired',true);

console.log('\nTOOL NETWORK REGISTRY BENCHMARK');
console.log('='.repeat(72));
console.log(`Score: ${score}/100`);
console.log(`Nodes: ${tools.length} · visible tool cards: ${uniqueCards.length} · relationships: ${rels.length} · candidates: ${candidates.length}`);
if(missingCatalog.length)console.log(`Unregistered catalog URLs: ${missingCatalog.join(', ')}`);
if(stranded.length)console.log(`Isolated non-leaf nodes: ${stranded.map(t=>t.id).join(', ')}`);
if(failures.length){console.log('Non-fatal gaps:');failures.forEach(f=>console.log(` - ${f}`));}
if(fatal.length){console.log('Fatal gaps:');fatal.forEach(f=>console.log(` - ${f}`));}
const checkMode=process.argv.includes('--check');
if(checkMode&&(score<95||fatal.length)){console.error('benchmark:tool-network FAIL');process.exitCode=1;}else if(checkMode)console.log('benchmark:tool-network PASS\n');
