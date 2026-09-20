import fs from 'node:fs';

const html=fs.readFileSync('public/shoshone-falls/index.html','utf8');
const js=fs.readFileSync('public/assets/shoshone-falls.js','utf8');
const css=fs.readFileSync('public/assets/shoshone-falls.css','utf8');

const checks={
  cleanCanonical:/href="https:\/\/chrisizworski\.com\/shoshone-falls\/"/.test(html)&&!/utm_source=chatgpt\.com/.test(html+js),
  liveCamera:/watch\?v=-Y7P-WfeXuE/.test(html)&&/embed\/-Y7P-WfeXuE/.test(html)&&!/PS0N6ZlbiqQ/.test(html+js),
  personaJourney:['data-persona="first"','data-persona="i84"','data-persona="family"','data-persona="photo"','data-persona="halfday"'].every(x=>html.includes(x))&&/function personaPlan/.test(js)&&/function renderPersona/.test(js),
  tripMath:/FROM I-84/.test(html)&&/60–75 min/.test(html)&&/PARKING → OVERLOOK/.test(html)&&/75 ft/.test(html),
  mapCentral:/id="map" class="map"/.test(html)&&!/id="map" class="map" hidden/.test(html)&&/function loadMap/.test(js)&&['falls','dierkes','perrine'].every(x=>html.includes('data-map-target="'+x+'"')),
  routeStory:/THE SIMPLE ROUTE/.test(html)&&/Shoshone Falls overlook/.test(html)&&/Dierkes Lake/.test(html)&&/Perrine Bridge/.test(html),
  interpretedData:/id="flow-meaning"/.test(html)&&/id="river-meaning"/.test(html)&&/weatherMeaning/.test(js)&&/riverMeaning/.test(js)&&/accessMeaning/.test(js),
  truthfulHydrology:/Direct waterfall spill is not machine-verified/.test(js)&&/Camera decides it/.test(js),
  logistics:/\$5 vehicle fee March–fall/.test(html)&&/7 AM–9 PM/.test(html)&&/ADA viewpoints/.test(html)&&/No overnight camping/.test(html),
  responsive:/@media\(max-width:640px\)/.test(css)&&/\.trip-math/.test(css)&&/\.persona-block/.test(css)&&/\.ground-grid/.test(css),
  analytics:/G-Y5D2V2W7HN/.test(html)&&/ca-pub-8222782620788075/.test(html)
};

const weights={cleanCanonical:7,liveCamera:10,personaJourney:16,tripMath:12,mapCentral:14,routeStory:10,interpretedData:12,truthfulHydrology:8,logistics:5,responsive:4,analytics:2};
let score=0;
for(const [k,ok] of Object.entries(checks))if(ok)score+=weights[k];
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k);
const hardVetoes=[];
if(/utm_source=chatgpt\.com/.test(html+js))hardVetoes.push('tracked canonical/site link');
if(/PS0N6ZlbiqQ/.test(html+js))hardVetoes.push('dead camera id');
if(/id="map" class="map" hidden/.test(html))hardVetoes.push('map hidden behind interaction');
if(!/Direct waterfall spill is not machine-verified/.test(js))hardVetoes.push('waterfall truth boundary missing');
console.log(JSON.stringify({score,max:100,failed,hardVetoes,checks},null,2));
if(score<94||hardVetoes.length)process.exit(1);
