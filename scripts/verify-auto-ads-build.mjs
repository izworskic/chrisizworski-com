import fs from 'node:fs';
import path from 'node:path';
import audit from '../lib/adsense-audit.js';
const root=path.resolve(process.argv[2] || 'public');
const failed=[];let checked=0,excluded=0;
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,item.name);if(item.isDirectory()){walk(file);continue;}
 if(!item.name.endsWith('.html'))continue;
 const url='https://chrisizworski.com/'+path.relative(root,file).replaceAll(path.sep,'/');
 const result=audit.classify(fs.readFileSync(file,'utf8'),url);
 if(['excluded-document','page-exception'].includes(result.state)){excluded++;continue;}
 checked++;if(result.state!=='standard-code')failed.push({file:path.relative(root,file),...result});
}}
walk(root);
console.log(JSON.stringify({checked,excluded,failed},null,2));
if(!checked||failed.length)process.exitCode=1;
