#!/usr/bin/env node
/** Portable Experience OS v1.2 source/evidence verification CLI. Node >=20; no dependencies. */
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateReleaseRecord} from '../design-systems/experience-os-v1/lib/release-evidence.mjs';

export function verifyExperienceFile(recordFile,{repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),checkSite=false}={}){
 const file=path.resolve(recordFile);
 const record=JSON.parse(fs.readFileSync(file,'utf8'));
 return validateReleaseRecord(record,{repoRoot,checkSite});
}
function main(args){
 const options={checkSite:args.includes('--check-site')};
 const files=args.filter(x=>!x.startsWith('--'));
 if(args.includes('--help')||files.length!==1){
  console.log('Usage: node scripts/verify-experience-os-v1.2.mjs path/to/release-record.json [--check-site]');
  console.log('Structural evidence checks only. Browser, source truth, production READY and outcomes need independent proof.');
  return args.includes('--help')?0:2;
 }
 let result;
 try{result=verifyExperienceFile(files[0],options);}
 catch(e){console.error('EXPERIENCE OS V1.2: unable to parse/read record: '+e.message);return 2;}
 if(!result.ok){
  console.error('EXPERIENCE OS V1.2 FAILED ('+result.issues.length+' structural issue(s))');
  for(const i of result.issues)console.error(' - '+i.code+': '+i.description);
  return 1;
 }
 console.log('EXPERIENCE OS V1.2 record passed structural checks: '+result.counts.claims+' claims, '+result.counts.scenarios+' scenarios, '+result.counts.photos+' photos'+(options.checkSite?' and source-only site integration':'')+'.');
 console.log('No browser, network, rights, access, deployment or visitor-outcome facts were independently verified by this command.');
 return 0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=main(process.argv.slice(2));
