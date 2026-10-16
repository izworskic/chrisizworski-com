#!/usr/bin/env node
'use strict';
// Metadata-only free Wikimedia query (one request a week), no visitor calls,
// no image copying, no video scraping or unreviewed rock-change forecast.
const fs=require('node:fs'),path=require('node:path');
const {mediaWikiUrl,decodeProvider,discoverSourceChanges}=
 require('../../lib/rockhounding/commons-camera-discovery.cjs');
async function watch({fetchFn=fetch,nowISO=new Date().toISOString()}={}){
 if(!Number.isFinite(Date.parse(nowISO)))throw Error('Invalid discovery check clock');
 const r=await fetchFn(mediaWikiUrl(),{
  headers:{'Accept':'application/json',
   'User-Agent':'ChrisIzworski-RockhoundingResearch/1.0 (https://chrisizworski.com)'},
  signal:AbortSignal.timeout(25000)
 });
 if(!r?.ok)throw Error('Wikimedia metadata check unavailable: HTTP '+(r?.status||'UNKNOWN'));
 const body=await r.text();
 if(typeof body!=='string'||body.length>1250000)throw Error('Unbounded geosearch response');
 const compared=discoverSourceChanges(decodeProvider(JSON.parse(body)));
 return {...compared,checkedAtUTC:nowISO};
}
async function main(args=process.argv.slice(2)){
 if(args.length!==2||args[0]!=='--report'||!args[1])
  throw Error('Usage: --report <path> (artifacts only, never changes a live route)');
 const data=await watch();
 const dst=path.resolve(args[1]);
 fs.mkdirSync(path.dirname(dst),{recursive:true});
 fs.writeFileSync(dst,JSON.stringify(data,null,2)+'\n');
 console.log('ROCKHOUNDING_COMMONS_GEOTAG_WATCH '+JSON.stringify({
  nearbySourcePhotos:data.nowNearbyGeoTaggedFiles,
  newMediaFilesNeedingReview:data.unreviewedNewSourceCount,
  metadataChangesNeedingReview:data.originalMediaMetadataChangedCount,
  sourceStatus:data.sourceState,canPredictNewAgates:false}));
 if(data.sourceState!=='NO_NEW_SOURCE_PHOTOS')
  console.log('::warning::New/changed public geotagged camera evidence needs manual source and landmark review. No rock exposure evidence or visitor forecast was changed.');
}
if(require.main===module)main().catch(e=>{console.error('COMMONS_GEOTAG_WATCH_FAILED '+e.message);process.exitCode=1});
module.exports={watch};
