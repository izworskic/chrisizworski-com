#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),{replayLibraryDay}=require('../lib/soo-corridor-study.cjs');
const files=process.argv.slice(2);
if(files.length!==3)throw Error('Supply three completed historical library day files');
const days=files.map(p=>replayLibraryDay(JSON.parse(fs.readFileSync(p,'utf8')))).sort((a,b)=>a.date.localeCompare(b.date));
if(days.map(d=>d.date).join(',')!=='2025-06-15,2025-08-15,2025-10-15')throw Error('Unexpected pilot dates');
const totals=Object.fromEntries(['fixes','adjacentPairs','supportedPairs'].map(k=>[k,days.reduce((n,d)=>n+d[k],0)]));
if(totals.fixes!==19097)throw Error('Does not match completed source run count');
console.log(JSON.stringify({schemaVersion:1,kind:'SOO_CORRIDOR_OBSERVATION_REPLAY_NOT_FORECAST',sourceRun:45390603940,days,totals,forecastEnabled:false},null,2));
