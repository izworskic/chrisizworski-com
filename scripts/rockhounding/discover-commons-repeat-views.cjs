#!/usr/bin/env node
'use strict';
// One research-only no-key bounded query. The source URL is a Wikimedia
// MediaWiki API, NOT a new external request from rockhounding visitors.
const fs=require('node:fs'),path=require('node:path');
const {mediaWikiUrl,decodeProvider,reviewDiscovery}=
 require('../../lib/rockhounding/commons-camera-discovery.cjs');
async function run({fetchFn=fetch}={}){
 const url=mediaWikiUrl();
 const resp=await fetchFn(url,{headers:{
  'Accept':'application/json',
  'User-Agent':'ChrisIzworski-RockhoundingResearch/1.0 (https://chrisizworski.com)'},
  signal:AbortSignal.timeout(25000)});
 if(!resp?.ok)throw Error('Commons geosearch research HTTP '+(resp?.status||'UNKNOWN'));
 const raw=await resp.text();
 if(typeof raw!=='string'||raw.length>1250000)throw Error('Unbounded Wikimedia response rejected');
 const source=JSON.parse(raw),rows=decodeProvider(source);
 const result=reviewDiscovery(rows);
 return result;
}
async function main(args=process.argv.slice(2)){
 if(args.length!==2||!['--out','--verify'].includes(args[0])||!args[1])
  throw Error('Usage: --out file.json OR --verify frozen-audit.json');
 const value=await run(),file=path.resolve(args[1]);
 if(args[0]==='--verify'){
  const expected=JSON.parse(fs.readFileSync(file,'utf8'));
  require('node:assert/strict').deepStrictEqual(value,expected);
 }else{
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
 }
 console.log('ROCKHOUNDING_COMMONS_REPEAT_VIEW_RESEARCH '+JSON.stringify({
  geotaggedSourceFiles:value.sourceNearbyFiles,
  shoreCandidates:value.independentlyTaggedShoreCandidates,
  gpsCameraSeparationMeters:value.historicalCameraDistanceMeters,
  possibleStormPhotoBeforeAfterPairs:value.spatiallyAndTemporallyPotentialPairs.length,
  georeferencedReviewedPairs:0,measuredRockChanges:0,
  canPublishVisitWindow:false}));
}
if(require.main===module)main().catch(e=>{console.error('ROCKHOUNDING_COMMONS_DISCOVERY_FAILED '+e.message);process.exitCode=1;});
module.exports={run,main};
