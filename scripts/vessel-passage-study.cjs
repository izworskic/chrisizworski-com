#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const engine=require('../lib/vessel-passage-intelligence.cjs');
const {buildReport}=require('../lib/cuyahoga-passage-evidence.cjs');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
async function generate(){
 const {analyzeCoastPilotStudy}=await import('./cuyahoga-coast-pilot-brackets.mjs');
 return buildReport(read('public/cuyahoga-freighter-watch/noaa-historical-2025.json'),
  read('data/cuyahoga/noaa-coast-pilot-bridge-references.json'),
  read('data/cuyahoga/odot-bridge-inventory-points.json'),analyzeCoastPilotStudy,engine);
}
if(require.main===module)generate().then(result=>{
 const text=JSON.stringify(result,null,2)+'\n';
 if(process.argv.length===2)process.stdout.write(text);
 else if(process.argv.length===4&&process.argv[2]==='--out')fs.writeFileSync(process.argv[3],text,{flag:'wx',mode:0o600});
 else throw Error('Usage: node scripts/vessel-passage-study.cjs [--out new-file.json]');
}).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={generate};
