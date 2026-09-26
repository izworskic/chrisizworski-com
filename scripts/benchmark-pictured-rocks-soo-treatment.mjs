import fs from 'node:fs';
const html=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');
const css=fs.readFileSync('public/assets/pictured-rocks-planner-v3.css','utf8');
const ui=fs.readFileSync('public/assets/pictured-rocks-planner-v3.js','utf8');
const api=fs.readFileSync('api/pictured-rocks-live.js','utf8');

const sections=[];
function score(name,weight,checks){
  const passed=checks.filter(([ok])=>ok).length;
  const points=Math.round(weight*(passed/checks.length));
  sections.push({name,weight,points,checks:checks.map(([ok,label])=>({ok,label}))});
}
score('First-screen operating picture',20,[
  [html.indexOf('id="today"')<html.indexOf('id="planner"'),'current read precedes composer'],
  [/westWeather/.test(html),'west conditions surface'],
  [/eastWeather/.test(html),'east conditions surface'],
  [/What the park is giving you right now/.test(html),'interpreted field read']
]);
score('Current provenance and graceful degradation',20,[
  [/api\.weather\.gov/.test(api),'NWS live source'],
  [/NPS source/.test(ui),'dated NPS notice links'],
  [/Current feed unavailable/.test(ui),'degraded-state copy'],
  [/does not certify Lake Superior/.test(api),'water safety boundary']
]);
score('Decision modes',15,[
  [/data-trip-shape="cruise"/.test(html),'cruise decision'],
  [/data-trip-shape="kayak"/.test(html),'kayak decision'],
  [/data-trip-shape="hike"/.test(html),'hike decision'],
  [/data-trip-shape="drive"/.test(html),'drive decision']
]);
score('Spatial understanding',15,[
  [/id="parkMap"/.test(html),'park map'],
  [/data-zone="west"/.test(html)&&/data-zone="central"/.test(html)&&/data-zone="east"/.test(html),'three-zone controls'],
  [/Approximate planning points only/.test(html),'navigation caveat'],
  [/L\.circleMarker/.test(ui)&&!/L\.polyline/.test(ui),'honest point map']
]);
score('Causal composer and constraints',20,[
  [(html.match(/<fieldset>/g)||[]).length===6,'six causal inputs'],
  [/routeWithLiveConstraints/.test(ui),'live access affects route'],
  [/Pet rules change the route/.test(fs.readFileSync('public/assets/pictured-rocks-planner-engine.js','utf8')),'pet hard gate'],
  [/Do not try to add this/.test(html),'explicit negative advice']
]);
score('Mobile and editorial resilience',10,[
  [/@media\(max-width:600px\)/.test(css),'phone breakpoint'],
  [/npgallery\.nps\.gov/.test(html),'real destination image'],
  [/Use the planner to decide/.test(html),'source/decision boundary']
]);
const total=sections.reduce((s,x)=>s+x.points,0);
console.log(JSON.stringify({total,target:90,sections},null,2));
if(process.argv.includes('--check')&&total<90)process.exit(1);