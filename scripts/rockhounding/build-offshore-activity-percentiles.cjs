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
// Research branch is a ROLLING archive and has since gained later Oct 15
// observations. Freeze the verified 5,243-row June 26–Oct 14 source window
// rather than reject later genuine data or silently change the baseline.
if(!Array.isArray(ledger.records))throw Error('Missing original GLOS observed rows');
const frozenEnd='2026-10-14T23:46:01Z';
const original={...ledger,records:ledger.records.filter(row=>
  row?.time>='2026-06-26T01:16:01Z'&&row.time<=frozenEnd)};
const baseline=computeBaseline(original);
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
