#!/usr/bin/env node
/**
 * Research-only Adventure Finder embedding comparison.
 * Runs on an ephemeral GitHub Actions runner, never in Vercel or visitor browsers.
 * No credentials, user queries or visitor data are collected.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import {
  parseDestinations, evaluate, rankLexical, rankSemantic, validateVectors
} from './evaluate-adventure-semantic-search.mjs';

export const MODEL = 'onnx-community/all-MiniLM-L6-v2-ONNX';
export const REVISION = 'aff7a1dc4e8a1ea593e6ea21e95c22ef0a25966f';
export const PACKAGE_VERSION = '4.3.2';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageFile = path.join(ROOT,'public/michigan-destinations/index.html');
const fixtureFile = path.join(ROOT,'scripts/fixtures/adventure-semantic-queries.json');
const holdoutFile = path.join(ROOT,'scripts/fixtures/adventure-semantic-holdout.json');

export function collectInputs(html, gold, holdout) {
  const cards = parseDestinations(html);
  const queries = [...gold, ...holdout];
  if (new Set(queries.map(x=>x.query)).size !== queries.length) throw new Error('Duplicate evaluation queries');
  for (const item of queries) {
    if (!item.query || !Array.isArray(item.expected) || !item.expected.length ||
        item.expected.some(id=>!cards.some(c=>c.id===id))) throw new Error('Bad gold query or unsupported destination');
  }
  return {
    cards,queries,
    documents:cards.map(c=>[c.title,c.region,c.tags.join(', '),c.description].join('. ')),
    questions:queries.map(q=>q.query)
  };
}
export function convertTensor(tensor, expectedCount) {
  if (!Array.isArray(tensor.dims) || tensor.dims.length !== 2 || tensor.dims[0] !== expectedCount) {
    throw new Error('Expected pooled [batch,features] ONNX tensor');
  }
  const dim=tensor.dims[1];
  if (!Number.isInteger(dim)||dim < 100||dim > 4096 || tensor.data?.length !== expectedCount*dim)
    throw new Error('Unexpected feature dimension/size');
  const vectors=[];
  for(let i=0;i<expectedCount;i++) {
    const row=Array.from(tensor.data.slice(i*dim,(i+1)*dim));
    if(row.some(x=>!Number.isFinite(x)))throw new Error('Non-finite ONNX output');
    vectors.push(row.map(x=>Number(x.toFixed(7))));
  }
  return vectors;
}
export function makeSnapshot(cards,queries,documentVectors,queryVectors) {
  const snapshot={
    model:MODEL,revision:REVISION,license:'apache-2.0',dtype:'q4',
    transformerPackageVersion:PACKAGE_VERSION,
    documentVectors:Object.fromEntries(cards.map((x,i)=>[x.id,documentVectors[i]])),
    queryVectors:Object.fromEntries(queries.map((x,i)=>[x.query,queryVectors[i]]))
  };
  validateVectors(snapshot,cards,queries);
  return snapshot;
}
const r3=n=>Number(n.toFixed(3));
export function measure(cards,prompts,snapshot) {
  const lexical=evaluate(cards,prompts,query=>rankLexical(cards,query));
  const semantic=evaluate(cards,prompts,query=>rankSemantic(cards,query,snapshot));
  const deltas={hitAt3:r3(semantic.hitAt3-lexical.hitAt3),mrr:r3(semantic.mrr-lexical.mrr)};
  return {lexical,semantic,deltas};
}
export function recommendation(gold,holdout) {
  const improves=m=>m.semantic.hitAt3 >= m.lexical.hitAt3 && m.semantic.mrr >= m.lexical.mrr+0.02;
  if (improves(gold)&&improves(holdout)) return 'EXPERIMENT';
  return 'REJECT';
}
function hash(text){return crypto.createHash('sha256').update(text).digest('hex');}
function readInputs() {
  const html=fs.readFileSync(pageFile,'utf8');
  const goldText=fs.readFileSync(fixtureFile,'utf8');
  const holdoutText=fs.readFileSync(holdoutFile,'utf8');
  const gold=JSON.parse(goldText), holdout=JSON.parse(holdoutText);
  if (gold.length!==12 || holdout.length < 15) throw new Error('Frozen evaluation fixtures changed unexpectedly');
  return {html,gold,holdout,
    hashes:{page:hash(html),gold:hash(goldText),holdout:hash(holdoutText)}};
}
async function main(){
  const args=process.argv.slice(2);
  if(args.includes('--help')) {
    process.stdout.write('Offline Hugging Face experiment: --out DIRECTORY (required)\n'
      +'Uses a pinned CPU ONNX model, external ephemeral @huggingface/transformers '+PACKAGE_VERSION+'\n'
      +'HF_RUNTIME_DIR must point to a temporary npm installation; no files are written into public/.\n');
    return;
  }
  if(args.length!==2 || args[0]!=='--out' || !args[1] || args[1].startsWith('--')) throw new Error('Expected --out DIRECTORY');
  const runtime=process.env.HF_RUNTIME_DIR;
  if(!runtime) throw new Error('HF_RUNTIME_DIR missing: install external ephemeral npm runtime');
  const out=path.resolve(args[1]);
  if(out===ROOT || out.startsWith(path.join(ROOT,'public')+path.sep) || out.startsWith(path.join(ROOT,'node_modules')+path.sep))
    throw new Error('Refusing production or source repository output');
  fs.mkdirSync(out,{recursive:true});
  const inputs=readInputs();
  const {cards,queries,documents,questions}=collectInputs(inputs.html,inputs.gold,inputs.holdout);
  const runtimeRequire=createRequire(path.join(path.resolve(runtime),'package.json'));
  const modulePath=runtimeRequire.resolve('@huggingface/transformers');
  const {pipeline,env}=await import(pathToFileURL(modulePath).href);
  if(!pipeline)throw new Error('Missing Transformers.js pipeline');
  env.allowRemoteModels=true;
  env.allowLocalModels=false;
  env.cacheDir=path.join(out,'model-cache');
  const start=performance.now();
  const extractor=await pipeline('feature-extraction',MODEL,{
    revision:REVISION,dtype:'q4',device:'cpu'
  });
  const initSeconds=r3((performance.now()-start)/1000);
  let documentVectors, queryVectors;
  try{
    const t1=performance.now();
    documentVectors=convertTensor(await extractor(documents,{pooling:'mean',normalize:true}),documents.length);
    queryVectors=convertTensor(await extractor(questions,{pooling:'mean',normalize:true}),questions.length);
    var inferenceSeconds=r3((performance.now()-t1)/1000);
  } finally { await extractor.dispose?.(); }
  const snapshot=makeSnapshot(cards,queries,documentVectors,queryVectors);
  const gold=measure(cards,inputs.gold,snapshot),holdout=measure(cards,inputs.holdout,snapshot);
  const decision=recommendation(gold,holdout);
  const report={
    status:decision,generatedAt:new Date().toISOString(),visitorProductionChanged:false,
    model:MODEL,revision:REVISION,dtype:'q4',license:'apache-2.0',
    transformersJs:PACKAGE_VERSION,inputs:inputs.hashes,
    cards:cards.length,goldQuestions:inputs.gold.length,holdoutQuestions:inputs.holdout.length,
    timingsSeconds:{coldModelLoad:initSeconds,inference:inferenceSeconds},
    gold,holdout,
    conclusion:decision==='EXPERIMENT'
      ? 'Eligible for a separate opt-in UX/mobile-cost experiment, NOT production deployment.'
      : 'No consistent evidence of relevance gains; do not ship a semantic model into Adventure Finder.'
  };
  fs.writeFileSync(path.join(out,'vectors.json'),JSON.stringify(snapshot));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  const summary=[
    '## Adventure Finder: pinned MiniLM relevance test',
    '| Cohort | Lexical hit@3 | Model hit@3 | Lexical MRR | Model MRR |',
    '|---|---:|---:|---:|---:|',
    ...[['Gold',gold],['Holdout',holdout]].map(([name,x])=> '| '+name+' | '+x.lexical.hitAt3+' | '+x.semantic.hitAt3+' | '+x.lexical.mrr+' | '+x.semantic.mrr+' |'),
    '',
    '**Decision:** '+decision+'; **model:** '+MODEL+' @ '+REVISION+' q4; **cold load:** '+initSeconds+'s; **inference:** '+inferenceSeconds+'s.',
    '',
    'Results are small-set offline relevance signals, not a statistically validated visitor or SEO improvement.',
    'No live page, AdSense, canonical, location, runtime dependency or visitor traffic was changed.'
  ].join('\n')+'\n';
  fs.writeFileSync(path.join(out,'summary.md'),summary);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
  console.log('HF_BENCHMARK_RESULT='+JSON.stringify({status:decision,model:MODEL,revision:REVISION,
    gold:{lexical:{hitAt3:gold.lexical.hitAt3,mrr:gold.lexical.mrr},
      semantic:{hitAt3:gold.semantic.hitAt3,mrr:gold.semantic.mrr}},
    holdout:{lexical:{hitAt3:holdout.lexical.hitAt3,mrr:holdout.lexical.mrr},
      semantic:{hitAt3:holdout.semantic.hitAt3,mrr:holdout.semantic.mrr}},
    timingsSeconds:report.timingsSeconds}));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)
  main().catch(error=>{console.error('HF_BENCHMARK_FAILURE: '+error.stack);process.exitCode=1});
