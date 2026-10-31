#!/usr/bin/env node
/**
 * Create a blank, intentionally INCOMPLETE Experience OS V1.2 release record.
 * This command never touches production pages, other repos or existing files.
 * Run from the owning repository; review resulting record before claiming QA.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

function argsToMap(args){
 const out={};
 for(let i=0;i<args.length;i++){
  if(!args[i].startsWith('--'))throw new Error('Unexpected argument '+args[i]);
  const k=args[i].slice(2); if(args[i+1]?.startsWith('--')||args[i+1]===undefined)out[k]=true;
  else out[k]=args[++i];
 }
 return out;
}
export function makeDraft({slug,ownerRepo,canonical,pageFile}={}){
 if(!/^[a-z0-9][a-z0-9-]{2,80}$/.test(slug||''))throw new Error('Invalid --slug');
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(ownerRepo||''))throw new Error('Use --ownerRepo owner/repo');
 let u;try{u=new URL(canonical);}catch{throw new Error('Invalid --canonical HTTPS URL')}
 if(u.protocol!=='https:'||!u.hostname||!canonical.endsWith('/'))throw new Error('Canonical must be HTTPS and end with /');
 if(typeof pageFile!=='string'||path.isAbsolute(pageFile)||pageFile.split(/[\\/]/).includes('..')||!pageFile.endsWith('.html'))throw new Error('Use a safe relative --pageFile .html path');
 return {
  schemaVersion:'1.2',recordStatus:'draft',
  project:{slug,ownerRepo,canonical,pageFile,visitorDecision:'PENDING: describe the real visitor decision',primaryAction:'PENDING: describe the concrete visitor action'},
  claims:[],
  decisionState:{selectedIdField:'PENDING: stable selected item ID',sourceOfTruth:'PENDING: owning engine and evidence',linkedSurfaces:['answer'],unavailableBehavior:'PENDING: source-linked fallback when selected item is unavailable'},
  scenarios:['initial','alternative','reverse','no-js','no-tiles','stale-data'].map(kind=>({
   kind,input:'PENDING: what visitor does',expectedVisibleAnswer:'PENDING: changed user-visible answer',sourceAndSafety:'PENDING: status and official-source boundaries'
  })),
  failures:{'no-js':'PENDING: useful HTML answer','no-tiles':'PENDING: official map and readable options','no-image':'PENDING: text and truthful credits','stale-data':'PENDING: unknown state and source link'},
  qa:{viewports:[360,390,768,1440],browserStatus:'PENDING',browserRun:null,screenshotEvidence:[]},
  photos:[],
  release:{implemented:{status:'PENDING'},verified:{status:'PENDING'},deployed:{status:'PENDING'},live:{status:'PENDING'},measured:{status:'NOT_MEASURED'}},
  note:'Do not change recordStatus to released without exact CI, deployment and independent public verification. This starter intentionally lacks required source evidence and will fail the evidence checker until completed.'
 };
}
function main(argv){
 let args;try{args=argsToMap(argv)}catch(e){console.error(e.message);return 2}
 if(args.help){
  console.log('Usage: node scripts/new-experience-os-v1.2.mjs --slug NAME --ownerRepo owner/repo --canonical https://example.com/path/ --pageFile public/path/index.html [--out docs/experience-briefs/NAME.release.json]');
  return 0;
 }
 try{
  const draft=makeDraft(args);
  const output=args.out||'docs/experience-briefs/'+draft.project.slug+'.release.json';
  if(typeof output!=='string'||!output.endsWith('.json'))throw Error('Output must be a .json file');
  const cwd=process.cwd(),target=path.resolve(cwd,output),rel=path.relative(cwd,target);
  if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('Output must be inside the current owning repository');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,JSON.stringify(draft,null,2)+'\n',{flag:'wx'});
  console.log('Created incomplete Experience OS V1.2 draft: '+rel);
  console.log('Next: fill checked sources and real evidence, then run the structural checker and owning-repo full CI.');
  return 0;
 }catch(e){console.error('Draft not created: '+e.message);return 1}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=main(process.argv.slice(2));
