import fs from 'node:fs';
const html=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');
const css=fs.readFileSync('public/assets/pictured-rocks-planner-v2.css','utf8');
const engine=fs.readFileSync('public/assets/pictured-rocks-planner-engine.js','utf8');
const sections=[];
function score(name,max,checks){const hits=checks.filter(([ok])=>ok).length;const points=Math.round(max*hits/checks.length);sections.push({name,points,max,checks});}
score('Decision-first first screen',25,[[/trip composer/i.test(html)],[/usable time/i.test(html)],[/starting/i.test(html)],[/walking/i.test(html)],[/Build my day/i.test(html)]]);
score('Causal personalization',25,[[/a\.base/.test(engine)],[/a\.party/.test(engine)],[/a\.walk/.test(engine)],[/a\.priority/.test(engine)],[/a\.water/.test(engine)],[/Do not/.test(engine)]]);
score('Hard constraints',25,[[/Pet rules change/.test(engine)],[/Limited walking changes/.test(engine)],[/10\.5-mile/.test(engine)],[/Young kids/.test(engine)],[/weather/.test(engine)]]);
score('Offline and operational value',15,[[/Save the official map/.test(html)],[/Print \/ save plan/.test(html)],[/Check NPS conditions/.test(html)],[/lose service/.test(html)]]);
score('Mobile and discovery',10,[[/@media\(max-width:560px\)/.test(css)],[/One day in Pictured Rocks/.test(html)],[/Pictured Rocks with a dog/.test(html)],[/Pictured Rocks without a boat/.test(html)],[/Two days at Pictured Rocks/.test(html)]]);
const total=sections.reduce((n,s)=>n+s.points,0);for(const s of sections)console.log(`${String(s.points).padStart(2)}/${s.max}  ${s.name}`);console.log(`\n${total}/100 Pictured Rocks planner benchmark`);if(process.argv.includes('--check')&&total<90)process.exit(1);