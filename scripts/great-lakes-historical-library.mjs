#!/usr/bin/env node
import {createInterface} from 'node:readline';
import {readFile,writeFile} from 'node:fs/promises';
import {parseCsvLine,noaaUtc} from './cuyahoga-noaa-points.mjs';
import library from '../lib/great-lakes-historical-library.cjs';
const plan=JSON.parse(await readFile(new URL('../data/freighter-history/pilot-2025.json',import.meta.url),'utf8'));
const [mode,...args]=process.argv.slice(2);
if(mode==='collect'){
 const [date,sha,out]=args;
 if(args.length!==3||!plan.dates.includes(date))throw Error('collect DATE SHA256 NEW_OUTPUT; use pinned pilot dates');
 const day=library.createLibraryDay({date,regions:plan.regions,archiveSha256:sha,parseCsvLine,noaaUtc});
 for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity}))day.accept(line);
 const result=day.finish();
 await writeFile(out,JSON.stringify(result)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({date,inputRows:result.inputRows,regions:result.regions.map(({tracks,...r})=>r)}));
}else if(mode==='summary'){
 const [out,...files]=args;
 if(!out||!files.length||files.length>plan.dates.length)throw Error('summary NEW_OUTPUT DAY_FILES...');
 const days=await Promise.all(files.map(p=>readFile(p,'utf8').then(JSON.parse)));
 const result=library.summarize(days,plan);
 await writeFile(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify(result,null,2));
}else throw Error('Use collect or summary');
