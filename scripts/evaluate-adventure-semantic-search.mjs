#!/usr/bin/env node
// Read-only, offline Adventure Finder relevance pilot. No network/model downloads/production writes.
// Run: node scripts/evaluate-adventure-semantic-search.mjs --json
// Optional: --vectors /path/to/reviewed-embeddings.json --strict
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = path.join(ROOT, 'public/michigan-destinations/index.html');
const GOLD = path.join(ROOT, 'scripts/fixtures/adventure-semantic-queries.json');
const APPROVED_MODEL = 'onnx-community/all-MiniLM-L6-v2-ONNX';
const STOP = new Set('a an and are around at be by can for from go i in into is it my near of on or the to want where with would'.split(' '));

export function plainText(raw) {
  return String(raw || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}
export function parseDestinations(html) {
  const cards = [];
  const pattern = /<article class="destination" id="([^"]+)"([^>]*)>([\s\S]*?)<\/article>/g;
  for (const match of html.matchAll(pattern)) {
    const [, id, attrs, body] = match;
    const attr = key => attrs.match(new RegExp('data-' + key + '="([^"]*)"'))?.[1] || '';
    const heading = body.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1];
    const description = body.match(/<div class="destination-body">[\s\S]*?<p>([\s\S]*?)<\/p>/)?.[1];
    if (!heading || !description) throw new Error('Missing title or introduction for ' + id);
    cards.push({
      id, title: plainText(heading), region: plainText(attr('region')),
      tags: attr('tags').split(',').filter(Boolean), months: attr('months').split(',').map(Number),
      description: plainText(description)
    });
  }
  if (cards.length !== 20 || new Set(cards.map(c => c.id)).size !== 20) {
    throw new Error('Expected twenty unique, source-owned Adventure Finder cards; got ' + cards.length);
  }
  return cards;
}
export function terms(s) {
  return String(s).toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 2 && !STOP.has(w))
    .map(w => w.length > 4 ? w.replace(/(ing|ed|es|s)$/,'') : w) || [];
}
function countMatches(q, value) {
  const haystack = new Set(terms(value));
  return q.reduce((sum, token) => sum + Number(haystack.has(token)), 0);
}
export function rankLexical(cards, query) {
  const words = [...new Set(terms(query))];
  return cards.map(card => ({
    id: card.id,
    score: 5 * countMatches(words, card.title) +
      3 * countMatches(words, card.tags.join(' ')) +
      2 * countMatches(words, card.region) +
      countMatches(words, card.description)
  })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).map(x => x.id);
}
export function cosine(a,b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) throw new Error('Invalid vector dimensions');
  let dot=0,aa=0,bb=0;
  for (let i=0;i<a.length;i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) throw new Error('Non-finite embedding value');
    dot += a[i]*b[i]; aa += a[i]*a[i]; bb += b[i]*b[i];
  }
  if (!aa || !bb) throw new Error('Zero vector');
  return dot/Math.sqrt(aa*bb);
}
export function validateVectors(data, cards, prompts) {
  if (!data || data.model !== APPROVED_MODEL || !/^[a-f0-9]{40}$/.test(data.revision || '') || data.license !== 'apache-2.0') {
    throw new Error('Model ID, immutable 40-character revision and Apache-2.0 license must be explicit');
  }
  const docs = data.documentVectors, queries = data.queryVectors;
  if (!docs || !queries || typeof docs !== 'object' || typeof queries !== 'object') throw new Error('Missing documentVectors/queryVectors');
  const docIds = cards.map(c => c.id);
  const queryIds = prompts.map(p => p.query);
  if (Object.keys(docs).length !== docIds.length || Object.keys(queries).length !== queryIds.length) {
    throw new Error('Embeddings must include exactly every source card and gold question');
  }
  const vectors = [...docIds.map(id => {
    if (!(id in docs)) throw new Error('Missing document ' + id);
    return docs[id];
  }),...queryIds.map(q => {
    if (!(q in queries)) throw new Error('Missing query ' + q);
    return queries[q];
  })];
  const dims = vectors[0]?.length;
  if (!Number.isInteger(dims) || dims < 2 || dims > 4096) throw new Error('Invalid embedding dimension');
  for(const vector of vectors) if (!Array.isArray(vector) || vector.length !== dims || vector.some(v => !Number.isFinite(v))) {
    throw new Error('Missing, mismatched or non-finite vector');
  }
  // Normalization and nonzero checks through the same scoring path.
  for(const vector of vectors) cosine(vector,vector);
  return data;
}
export function rankSemantic(cards, query, data) {
  const qv = data.queryVectors[query];
  return cards.map(c=>({id:c.id,score:cosine(qv,data.documentVectors[c.id])}))
    .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).map(x=>x.id);
}
export function evaluate(cards, prompts, ranker) {
  const records = prompts.map(item => {
    const ranked = ranker(item.query);
    const first = ranked.findIndex(id => item.expected.includes(id));
    return {query:item.query,expected:item.expected,top3:ranked.slice(0,3),
      reciprocalRank:first < 0 ? 0 : 1/(first+1),
      hit3:ranked.slice(0,3).some(id => item.expected.includes(id))};
  });
  return {hitAt3:Number((records.filter(r=>r.hit3).length / records.length).toFixed(3)),
    mrr:Number((records.reduce((n,r)=>n+r.reciprocalRank,0)/records.length).toFixed(3)),
    cases:records};
}
export function run({vectorsPath,strict=false}={}) {
  const cards = parseDestinations(fs.readFileSync(HTML,'utf8'));
  const prompts = JSON.parse(fs.readFileSync(GOLD,'utf8'));
  if (!Array.isArray(prompts) || prompts.length < 8 || new Set(prompts.map(p=>p.query)).size !== prompts.length) throw new Error('Invalid gold prompts');
  for(const p of prompts) if (!p.query || !Array.isArray(p.expected) || !p.expected.length || p.expected.some(id=>!cards.some(c=>c.id===id))) throw new Error('Gold prompt references unknown destination');
  const baseline = evaluate(cards,prompts,q=>rankLexical(cards,q));
  const report = {status:'NOT_EVALUATED',source:'checked-in Adventure Finder HTML',cardCount:cards.length,
    queryCount:prompts.length,model:APPROVED_MODEL,lexical:baseline,
    semantic:null,decision:'Do not ship ML without a pinned licensed vector snapshot and demonstrated relevance improvement.'};
  if (vectorsPath) {
    const vectors = validateVectors(JSON.parse(fs.readFileSync(vectorsPath,'utf8')),cards,prompts);
    const semantic=evaluate(cards,prompts,q=>rankSemantic(cards,q,vectors));
    const improved=semantic.hitAt3 >= baseline.hitAt3 && semantic.mrr >= baseline.mrr + 0.02;
    report.status=improved ? 'EXPERIMENT' : 'REJECT';
    report.revision=vectors.revision;
    report.semantic=semantic;
    report.decision=improved
      ? 'Offline relevance gate passed; mobile performance, rights and browser verification still required before any publication.'
      : 'No demonstrated improvement over deterministic lexical retrieval. Keep production search unchanged.';
  }
  if (strict && report.status !== 'EXPERIMENT') throw new Error('Strict semantic relevance gate failed: ' + report.status);
  return report;
}
function cli() {
  const args=process.argv.slice(2);
  if (args.includes('--help')) {
    process.stdout.write('Offline Adventure Finder relevance evaluation\n'
      +'  --json                  machine-readable baseline / comparison\n'
      +'  --vectors FILE          JSON with {model,revision,license,documentVectors:{id:[...]},queryVectors:{question:[...]}}\n'
      +'  --strict                require semantic vectors that improve hit@3 and MRR by >= 0.02\n'
      +'Vectors must cover every card and gold query; revision is a full SHA. No model is downloaded.\n');
    return;
  }
  const known=new Set(['--json','--vectors','--strict']);
  for(const a of args) if(a.startsWith('--')&&!known.has(a)) throw new Error('Unknown option '+a);
  const ix=args.indexOf('--vectors');
  const vectorsPath=ix>=0 ? args[ix+1] : undefined;
  if(ix>=0 && (!vectorsPath||vectorsPath.startsWith('--'))) throw new Error('--vectors requires a path');
  const result=run({vectorsPath,strict:args.includes('--strict')});
  process.stdout.write(args.includes('--json')?JSON.stringify(result,null,2)+'\n'
    :'Status: '+result.status+'; '+result.cardCount+' cards, '+result.queryCount+' queries; baseline hit@3='+result.lexical.hitAt3
     +', MRR='+result.lexical.mrr+(result.semantic?'; semantic hit@3='+result.semantic.hitAt3+', MRR='+result.semantic.mrr:'')+'\n'+result.decision+'\n');
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try{cli();}catch(error){console.error(error.message);process.exitCode=1;}
}
