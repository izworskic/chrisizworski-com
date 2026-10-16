#!/usr/bin/env node
'use strict';
// Rebuild partial-2026 observed offshore activity percentiles strictly from
// the independently verified GLOS SPOT-1361 archive. No image API or query.
const fs=require('node:fs'),path=require('node:path');
const {computeBaseline}=require('../../lib/rockhounding/offshore-activity-percentiles.cjs');
const args=process.argv.slice(2);
if(args.length!==4||args[0]!=='--ledger'||args[2]!=='--out')
 throw Error('Usage: --ledger original-gios-ledger.json --out baseline.json');
const ledger=JSON.parse(fs.readFileSync(args[1],'utf8'));
const baseline=computeBaseline(ledger);
const file=path.resolve(args[3]);fs.mkdirSync(path.dirname(file),{recursive:true});
fs.writeFileSync(file,JSON.stringify(baseline,null,2)+'\n');
console.log('ROCKHOUNDING_PHOTO_FREE_2026_BASELINE '+JSON.stringify({
  originalObservedRecords:baseline.sourceOriginalObservationCount,
  independentlyCompleteWindows:baseline.windowsAccepted,
  distributionQ25:baseline.q25,
  distributionMedian:baseline.q50,
  distributionQ75:baseline.q75,
  distributionQ90:baseline.q90,
  season:baseline.baselineSeason,
  physicalWavePower:false,stoneProbability:false,safeTrip:false
}));
