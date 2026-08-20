#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const registry=JSON.parse(await readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const tools=registry.tools||[];
const rels=registry.relationships||[];
const byId=new Map(tools.map(t=>[t.id,t]));
const inbound=new Map(tools.map(t=>[t.id,[]]));
const outbound=new Map(tools.map(t=>[t.id,[]]));
for(const r of rels){outbound.get(r.from)?.push(r);inbound.get(r.to)?.push(r)}

const degree=tools.map(t=>({
  id:t.id,
  name:t.name,
  in:inbound.get(t.id)?.length||0,
  out:outbound.get(t.id)?.length||0,
  total:(inbound.get(t.id)?.length||0)+(outbound.get(t.id)?.length||0)
})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
const degreeById=new Map(degree.map(d=>[d.id,d]));
const isolated=degree.filter(d=>d.total===0&&byId.get(d.id)?.networkRole!=='leaf');
const protectedTools=tools.filter(t=>t.searchTreatment?.status==='protected');
const candidates=[...(registry.expansionOpportunities||[])].sort((a,b)=>b.bestFitScore-a.bestFitScore);

const focusArg=process.argv.find(arg=>arg.startsWith('--focus='));
const focusId=focusArg?focusArg.slice('--focus='.length):null;
const monthOverride=Number(process.env.TOOL_NETWORK_MONTH||0);
const currentMonth=monthOverride>=1&&monthOverride<=12?monthOverride:new Date().getMonth()+1;
const seasonActive=tool=>!tool?.seasons?.length||tool.seasons.includes(currentMonth);
const evidenceRank={measured:7,'measured-query':6,growing:5,'known-demand':5,new:3,preseason:2,unknown:1};
const roleRank={hub:5,bridge:5,'evidence-hub':4,destination:4,owner:4,support:2,leaf:0};

function focusRecommendation(tool){
  const d=degreeById.get(tool.id)||{in:0,out:0,total:0};
  const evidence=tool.searchEvidence?.status||'unknown';
  const active=seasonActive(tool);
  if(tool.searchTreatment?.status==='protected'){
    return {label:'PROTECT + AMPLIFY',reason:'Search treatment is protected; leave acquisition surfaces unchanged and improve only contextual handoffs and downstream measurement.',d,evidence,active};
  }
  if((evidence==='unknown'||evidence==='new'||evidence==='preseason')&&active){
    return {label:'AMPLIFY + MEASURE',reason:'The tool is in season but lacks enough search evidence. Strengthen useful inbound/outbound handoffs and collect acquisition plus cross-tool behavior before repositioning its search intent.',d,evidence,active};
  }
  if((evidence==='unknown'||evidence==='new'||evidence==='preseason')&&!active){
    return {label:'PREPARE + MEASURE',reason:'The tool is outside its active season and lacks evidence. Prepare network handoffs and measurement without forcing a search-facing rewrite.',d,evidence,active};
  }
  if(d.total<4){
    return {label:'NETWORK AMPLIFY',reason:'Search evidence exists, but the node is thinly connected. Improve useful handoffs before creating adjacent standalone pages.',d,evidence,active};
  }
  return {label:'OPTIMIZE FROM EVIDENCE',reason:'The node has search evidence and meaningful network depth. Use measured acquisition and downstream behavior for the next iteration.',d,evidence,active};
}

function isolatedPriority(d){
  const tool=byId.get(d.id);
  return (seasonActive(tool)?40:0)+((evidenceRank[tool?.searchEvidence?.status]||0)*5)+(roleRank[tool?.networkRole]||0);
}
const isolatedRanked=[...isolated].sort((a,b)=>isolatedPriority(b)-isolatedPriority(a)||a.name.localeCompare(b.name));

function candidateDecision(c){
  const note=String(c.note||'');
  const evidenceGated=/only build if|if .*shows|if query data|first test|avoid creating|otherwise strengthen/i.test(note);
  if(c.bestFitScore>=(registry.bestFitScoring?.priorityThreshold||85)){
    return evidenceGated?'TEST FIRST':'BUILD READY';
  }
  if(c.bestFitScore>=(registry.bestFitScoring?.buildThreshold||70))return 'IMPROVE EVIDENCE';
  return 'DO NOT BUILD';
}

console.log('\nTOOL NETWORK REGISTRY REPORT');
console.log('='.repeat(72));
console.log(`Nodes ${tools.length} · relationships ${rels.length} · cannibalization groups ${(registry.cannibalizationGroups||[]).length}`);
console.log(`Decision month: ${currentMonth}`);

if(focusId){
  const tool=byId.get(focusId);
  console.log('\nFocus recommendation');
  if(!tool){
    console.log(`  UNKNOWN TOOL  [${focusId}]`);
  }else{
    const r=focusRecommendation(tool);
    console.log(`  ${r.label}  ${tool.name} [${tool.id}]`);
    console.log(`  ${r.d.in} inbound / ${r.d.out} outbound · search evidence ${r.evidence} · ${r.active?'in season':'out of season'}`);
    console.log(`  ${r.reason}`);
  }
}

console.log('\nNetwork repair priority');
if(isolatedRanked.length){
  for(const d of isolatedRanked){
    const tool=byId.get(d.id);
    console.log(`  ${String(isolatedPriority(d)).padStart(3)}  ${tool.name} [${tool.id}] · ${seasonActive(tool)?'in season':'out of season'} · evidence ${tool.searchEvidence?.status||'unknown'}`);
  }
  console.log('  Recommendation: repair the highest-priority isolated non-leaf node before creating another standalone canonical.');
}else{
  console.log('  None. No non-leaf nodes are isolated.');
}

console.log('\nCandidate after network repair');
if(candidates.length){
  const c=candidates[0];
  console.log(`  ${candidateDecision(c)}  ${c.bestFitScore}/100  ${c.name} [${c.id}]`);
  console.log(`  Connects to: ${(c.connectsTo||[]).join(', ')}`);
  if(c.note)console.log(`  Gate: ${c.note}`);
}

console.log('\nMost connected nodes');
for(const d of degree.slice(0,12))console.log(`  ${String(d.total).padStart(2)}  ${d.name}  (${d.in} in / ${d.out} out)`);
console.log('\nProtected search experiments');
for(const t of protectedTools)console.log(`  - ${t.name} [${t.id}]`);
console.log('\nExpansion candidates');
for(const c of candidates)console.log(`  ${String(c.bestFitScore).padStart(3)}/100  ${candidateDecision(c).padEnd(16)} ${c.name} → ${(c.connectsTo||[]).join(', ')}`);
if(isolated.length){console.log('\nIsolated non-leaf nodes');isolated.forEach(d=>console.log(`  - ${d.name} [${d.id}]`));}
console.log('\nClusters');
const clusters=new Map();
for(const t of tools){if(!clusters.has(t.cluster))clusters.set(t.cluster,[]);clusters.get(t.cluster).push(t.id)}
for(const [cluster,ids] of [...clusters.entries()].sort())console.log(`  ${cluster}: ${ids.length} nodes`);
