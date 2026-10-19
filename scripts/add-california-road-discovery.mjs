import fs from 'node:fs';
const target='public/synced-national-tools/index.html';
let html=fs.readFileSync(target,'utf8');
const newTools=[
 {id:'big-sur-highway-1',name:'Big Sur Highway 1 Closures & Drive Planner',place:'Big Sur · California Highway 1',description:'Choose Carmel-to-Cambria, McWay Falls or a shorter Big Sur drive using Caltrans closure and work-zone reports, interactive mapped stops and actual highway notes.',tags:'california big sur pacific coast highway 1 pch closure landslide mud creek rocky creek carmel cambria coastal scenic road trip',kind:'California coast road planner'},
 {id:'sierra-pass-status',name:'Sierra Nevada Pass Status & Crossing Planner',place:'California · Sierra Nevada mountain roads',description:'Compare official highway reports for Sonora, Ebbetts, Monitor, Carson, Tioga, Echo Summit and Donner before choosing a mountain crossing.',tags:'california sierra pass sonora ebbetts carson monitor tioga echo donner snow chains closures highway 108 4 88 89 120 50 interstate 80',kind:'Sierra crossing planner'}
];
for(const tool of newTools){
 const re=new RegExp('<article class="directory-card"[^>]*data-tool-id="'+tool.id+'"[^>]*>[\\s\\S]*?<\\/article>\\s*','g');
 html=html.replace(re,'');
}
const cards=newTools.map(tool=>'<article class="directory-card" data-search-card data-tool-id="'+tool.id+'" data-personas="trip conditions" data-tags="'+tool.tags+'" data-months="1,2,3,4,5,6,7,8,9,10,11,12"><div class="card-top"><span class="kind">'+tool.kind+'</span><span class="season-label" hidden>Useful now</span></div><h3>'+tool.name+'</h3><p class="place">'+tool.place+'</p><p class="description">'+tool.description+'</p><p class="signals"><strong>Decision:</strong> Is the route workable today—and which part should I attempt?</p><div class="card-actions"><a class="primary-action" href="/national-tools/'+tool.id+'/">Open road planner →</a></div></article>').join('\n');
const tioga='<article class="directory-card" data-search-card data-tool-id="tioga-road-status"';
const i=html.indexOf(tioga);
if(i<0)throw Error('California road discovery: Tioga card not found');
const end=html.indexOf('</article>',i)+10;
if(end<10)throw Error('California road discovery: Tioga card incomplete');
html=html.slice(0,end)+'\n'+cards+html.slice(end);
const re=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
const match=html.match(re);
if(!match)throw Error('California road discovery: missing JSON-LD');
const schema=JSON.parse(match[1]);
const graph=schema?.['@graph'];
const list=graph?.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/#toollist');
if(!list?.itemListElement)throw Error('California road discovery: ItemList missing');
const newUrls=new Set(newTools.map(x=>'https://chrisizworski.com/national-tools/'+x.id+'/'));
list.itemListElement=list.itemListElement.filter(x=>!newUrls.has(x.url));
for(const t of newTools)list.itemListElement.push({'@type':'ListItem',position:0,url:'https://chrisizworski.com/national-tools/'+t.id+'/',name:t.name});
list.itemListElement.forEach((x,i)=>x.position=i+1);
list.numberOfItems=list.itemListElement.length;
const page=graph.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/#page');
if(page)page.dateModified='2026-10-19';
html=html.replace(match[0],'<script type="application/ld+json">'+JSON.stringify(schema)+'</script>');
const count=(html.match(/<article class="directory-card" data-search-card/g)||[]).length;
html=html.replace(/(<p class="finder-count" id="finder-count" aria-live="polite">)\d+ tools shown(<\/p>)/,'$1'+count+' tools shown$2');
for(const t of newTools){
 if((html.match(new RegExp('data-tool-id="'+t.id+'"','g'))||[]).length!==1)throw Error('California road discovery duplicate: '+t.id);
}
fs.writeFileSync(target,html,'utf8');
console.log('California road directory cards synced | count='+count+' | schema='+list.numberOfItems);