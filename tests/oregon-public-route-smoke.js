'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','public','national-tools','coastal','oregon');
for(const file of ['index.html','yaquina-head/index.html','haystack-rock/index.html','hug-point/index.html','thors-well/index.html','app.js','styles.css','route-health.txt']){
  const full=path.join(root,file);
  if(!fs.existsSync(full)) throw new Error(`missing Oregon public route asset: ${file}`);
}
console.log('Oregon public route files present');
