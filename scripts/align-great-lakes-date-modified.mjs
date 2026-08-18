#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const file=path.join(root,'public/great-lakes/index.html');
let html=await readFile(file,'utf8');
const old='"dateModified": "2026-08-10"';
const next='"dateModified": "2026-08-18"';
const count=html.split(old).length-1;
if(count!==1)throw new Error(`Expected one Great Lakes dateModified anchor, found ${count}`);
html=html.replace(old,next);
await writeFile(file,html);
console.log('Great Lakes dateModified aligned');
