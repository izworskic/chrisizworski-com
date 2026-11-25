'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const i=process.argv.indexOf('--source-root');
if(i<0||!process.argv[i+1])throw Error('Expected --source-root');
const root=process.argv[i+1],read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('public/freighters/index.html'),script=read('public/assets/freighters-hub.js');
const cases=[],add=(id,passed,observed)=>cases.push({id,passed:Boolean(passed),observed:String(observed)});
function harness(ready=true){
 const nodes={};
 function node(id){return nodes[id]??={value:'',textContent:'',firstChild:{textContent:''},href:'',hidden:true,handlers:{},addEventListener(name,fn){(this.handlers[name]??=[]).push(fn)},fire(name,event={}){for(const fn of this.handlers[name]??[])fn(event)},classList:{contains:()=>ready},scrollIntoView(){this.scrolled=true}}}
 const radio=node('radio');radio.value='track';node('corridor').value='soo';
 const tab=node('tab');tab.click=()=>{tab.clicked=true};
 const has=id=>html.includes('id="'+id+'"');
 vm.runInNewContext(script,{document:{getElementById:id=>has(id)?node(id):null,querySelector:s=>s.includes('intent')?radio:tab,querySelectorAll:()=>[radio]},window:{L:ready?{}:undefined}},{timeout:5000});
 return {node,radio,tab,find(q){if(!has('finder-query'))return;node('finder-query').value=q;node('finder-search-go').fire('click')},choose(id){node('corridor').value=id;node('corridor').fire('change')}};
}
const destinations=[['Chicago','calumet','/calumet-freighter-watch/','95th Street',/Calumet River/],['Cleveland','cuyahoga','/cuyahoga-freighter-watch/','Scranton Flats',/Cuyahoga/],['Lock 3','welland','/welland-canal/','Lock 3',/Welland Canal/],['Iroquois Point','seaway','/st-lawrence-seaway/','Iroquois Point',/St\. Lawrence Seaway/]];
const results=destinations.map(([q,id,url,place,name])=>{
 const x=harness();x.find(q);const selected=x.node('corridor').value,track=x.node('finder-go').href;
 x.radio.value='shore';x.radio.fire('change');const shore=x.node('finder-go').href,reason=x.node('finder-reason').textContent;
 const target=read('public'+url+'index.html');
 const targetIdentity=target.includes('rel="canonical" href="https://chrisizworski.com'+url+'"')&&name.test(target.match(/<title>[^<]+/)?.[0]||'');
 return {q,selected,track,shore,passed:selected===id&&track===url&&shore===url&&reason.includes(place)&&targetIdentity};
});
add('specialist-place-choice',results.every(x=>x.passed),JSON.stringify(results));
const x=harness();x.find('Cleveland');const before=x.node('corridor').value;x.find('Cleveland and Chicago');const ambiguous=x.node('finder-search-status').textContent;const after=x.node('corridor').value;x.find('Atlantic Ocean');const unknown=x.node('finder-search-status').textContent;
add('ambiguous-and-unknown',before==='cuyahoga'&&after===before&&x.node('corridor').value===before&&/More than one/.test(ambiguous)&&/No matching/.test(unknown),JSON.stringify({before,after,ambiguous,unknown}));
const cards=[...html.matchAll(/<article class="corridor-card">([\s\S]*?)<\/article>/g)];
const maps=cards.map(([,card])=>[...card.matchAll(/class="corridor-maps" href="([^"]+)"/g)].map(([,href])=>new URL(href.replaceAll('&amp;','&'))));
add('static-public-place-links',cards.length===10&&maps.every(group=>group.length&&group.every(u=>u.hostname==='www.google.com'&&u.pathname==='/maps/search/'&&u.searchParams.get('query')&&/[a-z]/i.test(u.searchParams.get('query')))),JSON.stringify({cards:cards.length,links:maps.map(g=>g.length)}));
const preserved=[true,false].map(ready=>{const x=harness(ready);x.choose('duluth');let prevented=false;x.node('finder-go').fire('click',{preventDefault(){prevented=true}});return {ready,prevented,clicked:!!x.tab.clicked,href:x.node('finder-go').href};});
add('existing-map-and-fallback',preserved.every(x=>x.ready===x.prevented&&x.ready===x.clicked&&x.href==='/great-lakes-freighter-tracking/#duluth'),JSON.stringify(preserved));
const g=harness();g.radio.value='news';g.radio.fire('change');
add('preserve-news-and-canonical',g.node('finder-go').href==='https://gazette.chrisizworski.com/'&&html.includes('<link rel="canonical" href="https://chrisizworski.com/freighters/">')&&html.includes('id="freighterMap"'),JSON.stringify({news:g.node('finder-go').href,canonical:html.includes('https://chrisizworski.com/freighters/'),map:html.includes('id="freighterMap"')}));
console.log(JSON.stringify({cases}));
