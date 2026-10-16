#!/usr/bin/env node
'use strict';
// Rebuild a photo-free, measured-wave public research snapshot from the
// original source-locked offshore observations. No network or imagery needed.
const fs=require('node:fs'),path=require('node:path');
const {buildStormPulse}=require('../../lib/rockhounding/photo-free-storm-pulse.cjs');
function run(args=process.argv.slice(2)){
 if(args.length!==2||!['--check','--write'].includes(args[0])||!args[1])
  throw Error('Usage: build-photo-free-storm-pulse.cjs --check|--write output.json');
 const result=buildStormPulse(),file=path.resolve(args[1]);
 if(args[0]==='--write'){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
 }else{
  require('node:assert/strict').deepStrictEqual(JSON.parse(fs.readFileSync(file,'utf8')),result);
 }
 console.log('PHOTO_FREE_STORM_PULSE '+JSON.stringify({
  measuredWaveRows:result.historicObservationCount,
  sampledEvents:result.wellSampledEpisodes,
  rebuiltWaveEvents:result.episodes.filter(x=>x.hasWaveRebuild).length,
  latestSourceAtUTC:result.dataPeriod.lastUTC,
  requiresPhotos:false,predictsAgates:false,safeShoreClaim:false
 }));
 return result;
}
if(require.main===module)try{run()}catch(e){console.error('PHOTO_FREE_WAVE_SNAPSHOT_FAILED '+e.message);process.exitCode=1}
module.exports={run};
