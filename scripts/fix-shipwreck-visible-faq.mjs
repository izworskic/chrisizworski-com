#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const file=path.join(root,'public/great-lakes-shipwrecks/index.html');
let html=await readFile(file,'utf8');
const old="The wreck lies in two pieces at 530 feet depth and is designated a maritime burial ground, diving is prohibited.";
const replacement="The wreck lies in two pieces at about 530 feet. Ontario prescribes the site as a marine archaeological site, and diving within the regulated area requires provincial licensing.";
const count=html.split(old).length-1;
if(count!==1)throw new Error(`Expected exactly one stale visible FAQ sentence, found ${count}`);
html=html.replace(old,replacement);
await writeFile(file,html);
console.log('visible shipwreck FAQ wording aligned');
