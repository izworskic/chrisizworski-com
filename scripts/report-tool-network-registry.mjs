#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const registry=JSON.parse(await readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const tools=registry.tools||[];const rels=registry.relationships||[];
const byId=new Map(tools.map(t=>[t.id,t]));
const inbound=new Map(tools.map(t=>[t.id,[]]));const outbound=new Map(tools.map(t=>[t.id,[]]));
for(const r of rels){outbound.get(r.from)?.push(r);inbound.get(r.to)?.push(r)}
const degree=tools.map(t=>({id:t.id,name:t.name,in:inbound.get(t.id)?.length||0,out:outbound.get(t.id)?.length||0,total:(inbound.get(t.id)?.length||0)+(outbound.get(t.id)?.length||0)})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
const isolated=degree.filter(d=>d.total===0&&byId.get(d.id)?.networkRole!=='leaf');
const protectedTools=tools.filter(t=>t.searchTreatment?.status==='protected');
const candidates=[...(registry.expansionOpportunities||[])].sort((a,b)=>b.bestFitScore-a.bestFitScore);
console.log('\nTOOL NETWORK REGISTRY REPORT');
console.log('='.repeat(72));
console.log(`Nodes ${tools.length} · relationships ${rels.length} · cannibalization groups ${(registry.cannibalizationGroups||[]).length}`);
console.log('\nMost connected nodes');
for(const d of degree.slice(0,12))console.log(`  ${String(d.total).padStart(2)}  ${d.name}  (${d.in} in / ${d.out} out)`);
console.log('\nProtected search experiments');
for(const t of protectedTools)console.log(`  - ${t.name} [${t.id}]`);
console.log('\nExpansion candidates');
for(const c of candidates)console.log(`  ${String(c.bestFitScore).padStart(3)}/100  ${c.name} → ${(c.connectsTo||[]).join(', ')}`);
if(isolated.length){console.log('\nIsolated non-leaf nodes');isolated.forEach(d=>console.log(`  - ${d.name} [${d.id}]`));}
console.log('\nClusters');
const clusters=new Map();for(const t of tools){if(!clusters.has(t.cluster))clusters.set(t.cluster,[]);clusters.get(t.cluster).push(t.id)}
for(const [cluster,ids] of [...clusters.entries()].sort())console.log(`  ${cluster}: ${ids.length} nodes`);
