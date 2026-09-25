import fs from 'node:fs';
const required=['public/labs/pictured-rocks-planner/index.html','public/assets/pictured-rocks-planner-engine.js','public/assets/pictured-rocks-planner-v2.js','public/assets/pictured-rocks-planner-v2.css','tests/pictured-rocks-planner-v2.test.js'];
for(const file of required){if(!fs.existsSync(file)){console.error(`Missing ${file}`);process.exit(1);}}
const html=fs.readFileSync(required[0],'utf8');
for(const token of ['noindex,nofollow','pictured-rocks-planner-engine.js','pictured-rocks-planner-v2.js','Save the official map','Check NPS conditions']){if(!html.includes(token)){console.error(`Missing ${token}`);process.exit(1);}}
console.log('Pictured Rocks v2 preview verified');