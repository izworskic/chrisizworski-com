#!/usr/bin/env node
/** Offline development workbench. No publication or external source fetching. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectNetwork,starter,compile,validateSpec,RECIPES} from '../experience-foundry/lib/foundry.mjs';
import {validIso} from '../experience-foundry/lib/safety.mjs';
import {planExperience} from '../experience-foundry/lib/planning.mjs';
import {restrictedOutput,writePacket} from '../experience-foundry/lib/output.mjs';
import {startImprovement,assessRun,proveImprovement,reviewProof,verifyBaseline} from '../experience-foundry/lib/improvement.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const [command='help',...args]=process.argv.slice(2);
const flags={};
const allowed={discover:['query'],init:['recipe','slug','place','title','question','out'],plan:['slug','question','owner','recipe','out'],improve:['slug','question','owner','files','add-files','baseline','out'],assess:['run','proof'],prove:['run','out'],validate:['spec','as-of'],build:['spec','as-of','out'],recipes:[],help:[]};
function required(name){if(!flags[name])throw Error('Missing --'+name);return flags[name];}
async function registry(){return JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));}
async function run(){
  if(args.includes('--help')||command==='help'){
    console.log(`Experience Foundry 0.3 — tool improvement cycle and preview workbench
  improve --slug NAME --owner REGISTRY_ID --question "visitor decision"
          --files PATH,PATH [--add-files NEW_PATH] [--baseline REF] [--out DRAFT_DIR]
                                    capture source and start an improvement assignment
  assess --run FILE [--proof FILE]  identify next unresolved action; reject stale proof
  prove --run FILE [--out DIR]      replay the same visitor cases before and after
  recipes                           list supported preview interactions
  discover --query "visitor need"  inspect possible existing intent owners
  plan --slug NAME --question "visitor decision" [--owner REGISTRY_ID] [--recipe NAME]
                                    create brief, state matrix and implementation packet
  init --recipe NAME --slug NAME [--place PLACE] [--title TITLE] [--question QUESTION]
                                    create an incomplete schemaVersion 2 draft
  validate --spec FILE [--as-of ISO] return all structural defects as JSON
  build --spec FILE [--as-of ISO]   build noindex preview and provenance report
  plan/init outputs stay inside experience-foundry/drafts/;
  build outputs stay inside build/experience-foundry/. Use --out for a new run.
  Existing outputs are never overwritten. No automatic publication.`);
    return;
  }
  if(!Object.hasOwn(allowed,command))throw Error('Unknown command '+command+'; use help.');
  for(let i=0;i<args.length;i+=2){
    const key=args[i].replace(/^--/,'');
    if(!args[i].startsWith('--')||!allowed[command].includes(key))throw Error('Unknown argument '+args[i]);
    if(Object.hasOwn(flags,key))throw Error('Duplicate --'+key);
    if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing value for --'+key);
    flags[key]=args[i+1];
  }
  const now=flags['as-of'] ? new Date(flags['as-of']) : new Date();
  if(flags['as-of']&&!validIso(flags['as-of']))throw Error('--as-of must be a valid timezone-aware timestamp.');
  if(command==='recipes'){
    console.log(JSON.stringify(Object.entries(RECIPES).map(([id,r])=>({id,decision:r.decision,scope:'review preview only'})),null,2));return;
  }
  if(command==='discover'){
    console.log(JSON.stringify(inspectNetwork(required('query'),await registry()),null,2));return;
  }
  if(command==='improve'){
    const slug=required('slug');
    const {files}=startImprovement({root,slug,question:required('question'),owner:required('owner'),
      files:required('files').split(',').map(s=>s.trim()),newFiles:flags['add-files']?.split(',').map(s=>s.trim()),baseline:flags.baseline},await registry());
    const out=await restrictedOutput(root,flags.out||'experience-foundry/drafts/'+slug,'experience-foundry/drafts');
    await writePacket(out,files);
    console.log('Captured improvement baseline in '+path.relative(root,out)+'. Follow IMPLEMENT.md through implementation and before/after proof; a packet alone is not completion.');return;
  }
  if(command==='assess'||command==='prove'){
    const runPath=path.resolve(process.cwd(),required('run'));
    const run=JSON.parse(await fs.readFile(runPath,'utf8'));
    const snapshot=JSON.parse(await fs.readFile(path.join(path.dirname(runPath),'baseline.json'),'utf8'));
    verifyBaseline(root,snapshot);
    const network=await registry();
    if(command==='assess'){
      const report=flags.proof ? await reviewProof({root,run,snapshot,registry:network,
        proof:JSON.parse(await fs.readFile(path.resolve(process.cwd(),flags.proof),'utf8'))}) : assessRun(run,snapshot,network);
      console.log(JSON.stringify(report,null,2));
      if(!report.readyToImplement||(flags.proof&&!report.demonstrated)) process.exitCode=1;
      return;
    }
    // Validate output before executing reviewed local code. Never overwrite proof.
    const out=await restrictedOutput(root,flags.out||'build/experience-foundry/'+run.slug+'-proof','build/experience-foundry');
    try{await fs.lstat(out);throw Error('Output already exists; select a new --out.');}catch(e){if(e.code!=='ENOENT')throw e;}
    const result=await proveImprovement({root,run,snapshot,registry:network});
    await writePacket(out,result.files);
    console.log(JSON.stringify({status:result.proof.status,proof:path.relative(root,path.join(out,'proof.json')),
      nextAction:result.proof.nextAction},null,2));
    if(!result.proof.demonstrated)process.exitCode=1;
    return;
  }
  if(command==='plan'){
    const slug=required('slug');
    const {files}=planExperience({slug,question:required('question'),owner:flags.owner,recipe:flags.recipe},await registry());
    const out=await restrictedOutput(root,flags.out||'experience-foundry/drafts/'+slug,'experience-foundry/drafts');
    await writePacket(out,files);
    console.log('Created research packet '+path.relative(root,out)+'; begin with IMPLEMENT.md. Research and ownership remain unverified.');return;
  }
  if(command==='init'){
    const spec=starter({recipe:required('recipe'),slug:required('slug'),place:flags.place,title:flags.title,question:flags.question});
    const out=await restrictedOutput(root,flags.out||'experience-foundry/drafts/'+spec.slug+'.json','experience-foundry/drafts');
    await fs.mkdir(path.dirname(out),{recursive:true});
    await fs.writeFile(out,JSON.stringify(spec,null,2)+'\n',{flag:'wx'});
    console.log('Created draft '+path.relative(root,out)+'; complete evidence and originality before build.');return;
  }
  const spec=JSON.parse(await fs.readFile(path.resolve(process.cwd(),required('spec')),'utf8'));
  const network=await registry();
  if(command==='validate'){
    const errors=validateSpec(spec,network,{now});
    console.log(JSON.stringify({valid:errors.length===0,errors,sourceTruth:'NOT VERIFIED',release:'NOT APPROVED'},null,2));
    if(errors.length)process.exitCode=1;
    return;
  }
  const {html,report}=compile(spec,network,{now});
  const out=await restrictedOutput(root,flags.out||'build/experience-foundry/'+spec.slug,'build/experience-foundry');
  await writePacket(out,{'index.html':html,'review.json':JSON.stringify(report,null,2)+'\n','spec.json':JSON.stringify(spec,null,2)+'\n'});
  console.log('Generated noindex preview: '+path.relative(root,path.join(out,'index.html')));
  console.log('Release gates remain NOT VERIFIED; inspect review.json. Labels are a fixed snapshot at '+report.evaluatedAt+'.');
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
