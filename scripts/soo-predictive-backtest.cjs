#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),soo=require('../lib/soo-locks-next'),study=require('../lib/soo-predictive-study.cjs');
const files=process.argv.slice(2);
if(files.length!==3)throw Error('Supply three completed NOAA day files');
const days=files.map(p=>study.buildCases(JSON.parse(fs.readFileSync(p,'utf8')),soo));
if(days.reduce((n,d)=>n+d.fixes,0)!==19097)throw Error('Unexpected original observation count');
const report=study.evaluate(days);
console.log(JSON.stringify({sourceRun:45390603940,corridorReplayRun:45391192438,...report},null,2));
