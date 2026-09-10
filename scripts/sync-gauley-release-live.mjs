import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const pkgPath=require.resolve('gauley-release-live/package.json');
const pkgRoot=path.dirname(pkgPath);
const buildScript=path.join(pkgRoot,'scripts/build-deploy-bundle.mjs');
const dist=path.join(pkgRoot,'dist');
const targetDir='public/national-tools/gauley-release-live';
const target=path.join(targetDir,'index.html');
const canonical='https://chrisizworski.com/national-tools/gauley-release-live/';
const expectedSource='e66ff2ab2dd6805d73071c8a3be051cc4766e934';

execFileSync(process.execPath,[buildScript],{cwd:pkgRoot,stdio:'inherit'});
let html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
html=html
  .replaceAll("getJSON('./api/live')","getJSON('/api/gauley-live')")
  .replaceAll("getJSON('./api/history')","getJSON('/api/gauley-history')");

if(!html.includes(canonical)) throw new Error('Gauley mirror missing canonical public URL');
if(!html.includes('G-Y5D2V2W7HN')) throw new Error('Gauley mirror missing shared GA4 measurement');
if(!html.includes("getJSON('/api/gauley-live')")) throw new Error('Gauley live API route was not remapped');
if(!html.includes("getJSON('/api/gauley-history')")) throw new Error('Gauley history API route was not remapped');

fs.mkdirSync(targetDir,{recursive:true});
fs.writeFileSync(target,html);
fs.mkdirSync('data',{recursive:true});
fs.writeFileSync('data/gauley-release-mirror.json',JSON.stringify({
  sourceRepository:'izworskic/gauley-release-live-',
  sourceCommit:expectedSource,
  canonical,
  generatedBy:'scripts/sync-gauley-release-live.mjs'
},null,2)+'\n');
console.log(`Gauley Release Live mirrored to ${target} from ${expectedSource}.`);
