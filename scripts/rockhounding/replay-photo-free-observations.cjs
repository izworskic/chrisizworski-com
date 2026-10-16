#!/usr/bin/env node
'use strict';
// Offline walk-forward quality audit, actual GLOS research archive required.
// Historical alerts are always UNKNOWN, never invented; not an agate forecast.
const fs=require('node:fs'),path=require('node:path');
const {backtest}=require('../../lib/rockhounding/photo-free-observation-replay.cjs');
function run(args=process.argv.slice(2)){
 const o={};for(let i=0;i<args.length;i+=2){
  if(!['--ledger','--out','--verify'].includes(args[i])||!args[i+1]||o[args[i]])
   throw Error('Require --ledger ORIGINAL.json --out REPORT.json [--verify EXPECTED.json]');
  o[args[i]]=args[i+1];
 }
 if(!o['--ledger']||!o['--out'])throw Error('Missing original archive or report output');
 const src=JSON.parse(fs.readFileSync(path.resolve(o['--ledger']),'utf8'));
 const result=backtest(src);
 const file=path.resolve(o['--out']);fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
 if(o['--verify']){
  require('node:assert/strict').deepStrictEqual(
   JSON.parse(fs.readFileSync(path.resolve(o['--verify']),'utf8')),result,
   'Photo-free source replay result has changed');
 }
 console.log('ROCKHOUNDING_REAL_OBSERVED_REPLAY '+JSON.stringify({
  originalWaveRows:result.sourceOriginalRows,
  checkpoints:result.checkpoints,
  currentWaveDataCoveragePercent:result.sourceCoveredPct,
  complete48hWaveComparisonPercent:result.completeTwoDayCoveragePct,
  observedWaveStates:result.observationStates,
  stoneOutcomes:0,
  photosRequired:false,
  retrospectivelyAppliedNwsWarnings:false,
  canPublishVisitWindow:false
 }));
 return result;
}
if(require.main===module)try{run()}catch(e){console.error('ROCKHOUNDING_REPLAY_FAILED '+e.message);process.exitCode=1}
module.exports={run};
