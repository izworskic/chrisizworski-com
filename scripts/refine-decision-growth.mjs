#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const p=rel=>path.join(root,rel);
let boat=await readFile(p('public/assets/boat-launch-finder.js'),'utf8');
const old=`  const conditionRank=card=>{\n    const text=$('.conditions:not(.loading)',card)?.textContent?.toLowerCase()||'';\n    if(/rough|20 mph|21 mph|22 mph|23 mph|24 mph|25 mph|26 mph|27 mph|28 mph|29 mph|30 mph/.test(text))return 0;\n    if(/moderate|marginal/.test(text))return 1;\n    if(/ft waves|mph wind/.test(text))return 2;\n    return 1;\n  };`;
const better=`  const conditionRank=card=>{\n    if($('.conditions:not(.loading) .cond.caution',card))return 0;\n    if($('.conditions:not(.loading) .cond.marginal',card))return 1;\n    if($('.conditions:not(.loading) .cond.good',card))return 2;\n    return 1;\n  };`;
if(!boat.includes(old))throw new Error('boat condition rank anchor missing');
boat=boat.replace(old,better);await writeFile(p('public/assets/boat-launch-finder.js'),boat);

let wreck=await readFile(p('public/great-lakes-shipwrecks/index.html'),'utf8');
wreck=wreck.replace('The wreck lies in two pieces at 530 feet depth and is designated a maritime burial ground, diving is prohibited.','The wreck lies in two pieces at about 530 feet. Ontario prescribes the site as a marine archaeological site, and diving within the regulated area requires provincial licensing.');
await writeFile(p('public/great-lakes-shipwrecks/index.html'),wreck);
console.log('decision growth refinements applied');
