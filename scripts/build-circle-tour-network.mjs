#!/usr/bin/env node
/**
 * Future-proof Circle Tour connection publication.
 * No remote calls. Reads only approved Tool Network metadata and a reviewed seed.
 * --check verifies the committed artifact; --audit reports unpublished candidates.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {compileCircleTourCatalog} from '../lib/circle-tour-network.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const abs=file=>path.join(root,file);
const read=async file=>JSON.parse(await readFile(abs(file),'utf8'));
const check=process.argv.includes('--check');
const audit=process.argv.includes('--audit');
const registry=await read('benchmarks/tool-network-registry.json');
const seed=await read('config/circle-tour-tool-connections.json');
const {catalog,report}=compileCircleTourCatalog(registry,seed);
const destination='public/assets/circle-tour-tool-catalog.json';
const proposed=JSON.stringify(catalog,null,2)+'\n';

if(check) {
  const committed=await readFile(abs(destination),'utf8').catch(()=>null);
  if(committed!==proposed)throw Error('Circle Tour catalog is stale or missing; run node scripts/build-circle-tour-network.mjs and commit its output.');
}else if(!audit) {
  await mkdir(path.dirname(abs(destination)),{recursive:true});
  await writeFile(abs(destination),proposed);
}
console.log(JSON.stringify({mode:check?'check':audit?'audit':'build',approved:report.approved,
  registryApproved:report.sources.registryApproved,candidates:report.candidates.length,
  emitted:!check&&!audit,destination,
  ...(audit?{unpublishedCandidates:report.candidates}:{}),
  guardrails:'No specialist tool mutations, no live availability assertions, no unapproved publication.'},null,2));
