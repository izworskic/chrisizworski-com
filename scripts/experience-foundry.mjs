#!/usr/bin/env node
/** Experience Foundry v0.1. Offline CLI. Never writes to public/ or production routes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectNetwork,starter,compile,RECIPES} from '../experience-foundry/lib/foundry.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const argv=process.argv.slice(2);
const command=argv[0];
function arg(name,fallback=null){const i=argv.indexOf('--'+name);return i<0?fallback:(argv[i+1]||'');}
function requireArg(name){const value=arg(name);if(!value)throw Error('Missing --'+name);return value;}
function restricted(input,folder){
  const base=path.resolve(root,folder);
  const target=path.resolve(root,input);
  if(target===base||!target.startsWith(base+path.sep))throw Error('Output must be inside '+folder+'/ (preview only).');
  return target;
}
async function registry(){return JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));}
async function run(){
  if(!command||command==='help'||argv.includes('--help')){
    console.log('Experience Foundry v0.1 — review-only, offline, no new public routes');
    console.log('  node scripts/experience-foundry.mjs discover --query "birding Saginaw Bay"');
    console.log('  node scripts/experience-foundry.mjs init --recipe field-notes --slug saginaw-field-desk --place "Saginaw Bay" --out experience-foundry/drafts/saginaw.json');
    console.log('  node scripts/experience-foundry.mjs build --spec experience-foundry/examples/saginaw-field-notes.json');
    console.log('  Recipes: '+Object.keys(RECIPES).join(', '));
    return;
  }
  if(command==='discover') {
    console.log(JSON.stringify(inspectNetwork(requireArg('query'),await registry()),null,2));
    return;
  }
  if(command==='init') {
    const recipe=requireArg('recipe'),slug=requireArg('slug');
    const out=restricted(arg('out','experience-foundry/drafts/'+slug+'.json'),'experience-foundry/drafts');
    const spec=starter({recipe,slug,place:arg('place','Unknown location'),title:arg('title','Draft experience title'),question:arg('question','What decision should this experience answer?')});
    await fs.mkdir(path.dirname(out),{recursive:true});
    await fs.writeFile(out,JSON.stringify(spec,null,2)+'\n',{flag:'wx'});
    console.log('Created draft '+path.relative(root,out)+'; complete source and originality evidence before build.');
    return;
  }
  if(command==='build') {
    const input=path.resolve(process.cwd(),requireArg('spec'));
    const spec=JSON.parse(await fs.readFile(input,'utf8'));
    const out=restricted(arg('out','build/experience-foundry/'+spec.slug),'build/experience-foundry');
    const {html,report}=compile(spec,await registry());
    await fs.mkdir(path.dirname(out),{recursive:true});
    await fs.mkdir(out);
    await fs.writeFile(path.join(out,'index.html'),html,{flag:'wx'});
    await fs.writeFile(path.join(out,'review.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log('Generated noindex preview: '+path.relative(root,path.join(out,'index.html')));
    console.log('Release gates remain NOT VERIFIED; see '+path.relative(root,path.join(out,'review.json')));
    return;
  }
  throw Error('Unknown command '+command+'; use help.');
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
