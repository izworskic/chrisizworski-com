import fs from 'node:fs';

const KEY='sunshine-skyway';
const URL='https://chrisizworski.com/sunshine-skyway-bridge/';
const REL='/sunshine-skyway-bridge/';
const LASTMOD='2026-10-05';
const NAME='Sunshine Skyway Bridge Live';
const DESC='Check Sunshine Skyway closures, FL511 traffic and camera video, wind context and current all-electronic tolls before crossing I-275 Tampa Bay.';

function patchRegistry(){
  const file='benchmarks/tool-network-registry.json';
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!Array.isArray(data.tools))throw new Error('Sunshine Skyway discovery: tool registry missing tools[]');
  if(!data.tools.some(tool=>tool.id===KEY||tool.canonical===URL)){
    data.tools.push({
      id:KEY,name:NAME,canonical:URL,aliases:[],kind:'flagship-live',cluster:'transportation',
      primaryIntent:'Sunshine Skyway Bridge traffic closures wind camera and tolls',
      seasons:[1,2,3,4,5,6,7,8,9,10,11,12],geographies:['florida-tampa-bay'],
      personas:['driver','rv-traveler','motorcycle-traveler','towing-traveler','trip-planner'],
      networkRole:'bridge',searchTreatment:{status:'active'},searchEvidence:{status:'new-build'}
    });
    data.updated=LASTMOD;
    fs.writeFileSync(file,`${JSON.stringify(data,null,2)}\n`);
    console.log('Sunshine Skyway added to tool-network registry.');
  }
}

function patchTools(){
  const file='public/tools/index.html';
  let html=fs.readFileSync(file,'utf8');
  let changed=false;
  if(!html.includes(`data-featured-tool="${KEY}"`)){
    const maryland=html.match(/    <article class="feature-card" data-featured-tool="maryland-bay-bridge">[\s\S]*?    <\/article>\n/);
    const niagara=html.match(/    <article class="feature-card" data-featured-tool="niagara-border-crossing">[\s\S]*?    <\/article>\n/);
    const anchor=maryland||niagara;
    if(!anchor)throw new Error('Sunshine Skyway discovery: bridge featured-card anchor not found');
    const card=`    <article class="feature-card" data-featured-tool="${KEY}">\n      <div class="feature-kicker">Live Florida bridge decision</div>\n      <h3><a href="${REL}" data-track-tool="${KEY}" data-placement="tools-featured">Sunshine Skyway Bridge Live</a></h3>\n      <p>Official FL511 road status first, then Skyway camera video, wind context and current all-electronic tolls.</p>\n      <a class="tool-cta" href="${REL}" data-track-tool="${KEY}" data-placement="tools-featured">Check the Skyway <span aria-hidden="true">&rarr;</span></a>\n    </article>\n`;
    html=html.replace(anchor[0],`${anchor[0]}${card}`);changed=true;
  }
  if(!html.includes(`data-tool-key="${KEY}"`)){
    const marylandKey=html.indexOf('data-tool-key="maryland-bay-bridge"');
    const niagaraKey=html.indexOf('data-tool-key="niagara-border-crossing"');
    const keyIndex=marylandKey>=0?marylandKey:niagaraKey;
    if(keyIndex<0)throw new Error('Sunshine Skyway discovery: bridge catalog anchor not found');
    const start=html.lastIndexOf('<div class="tool-card"',keyIndex);
    if(start<0)throw new Error('Sunshine Skyway discovery: tool-card boundary not found');
    const card=`  <div class="tool-card" data-tool-key="${KEY}" data-tags="planning live-data bridges traffic travel florida tampa bay skyway i-275 tolls cameras wind" data-months="1,2,3,4,5,6,7,8,9,10,11,12">\n    <div class="tk">Live data<span class="tk-season" hidden> / useful now</span></div>\n    <div class="tool-title"><a href="${REL}">${NAME}</a></div>\n    <div class="tool-desc">${DESC}</div>\n  </div>\n`;
    html=html.slice(0,start)+card+html.slice(start);changed=true;
  }
  const count=(html.match(/class="tool-card"/g)||[]).length;
  html=html.replace(/search all \d+ tools by name or topic/i,`search all ${count} tools by name or topic`);
  fs.writeFileSync(file,html);
  console.log(`Sunshine Skyway tools discovery ${changed?'applied':'already present'}; catalog count ${count}.`);
}

function patchNationalTools(){
  const file='public/synced-national-tools/index.html';
  let html=fs.readFileSync(file,'utf8');
  if(!html.includes(`data-tool-id="${KEY}"`)){
    const marker='<article class="directory-card" data-search-card data-tool-id="maryland-bay-bridge"';
    let at=html.indexOf(marker);
    if(at<0){
      const fallback='<article class="directory-card" data-search-card data-tool-id="cbbt"';
      at=html.indexOf(fallback);
    }
    if(at<0)throw new Error('National tools: bridge anchor missing for Sunshine Skyway insertion');
    const card=`<article class="directory-card" data-search-card data-tool-id="${KEY}" data-personas="trip conditions" data-tags="florida tampa bay sunshine skyway bridge i-275 st petersburg bradenton toll wind closures traffic cameras fl511 gulf coast" data-months="1,2,3,4,5,6,7,8,9,10,11,12"><div class="card-top"><span class="kind">Live bridge crossing decision</span><span class="season-label" hidden>Useful now</span></div><h3>${NAME}</h3><p class="place">Florida · Tampa Bay</p><p class="description">${DESC}</p><p class="signals"><strong>Signals:</strong> FDOT / FL511 operational evidence + Florida Turnpike tolls + NWS weather context</p><div class="card-actions"><a class="primary-action" href="${REL}">Open Sunshine Skyway Live →</a></div></article>\n`;
    html=html.slice(0,at)+card+html.slice(at);
  }
  const schemaMatch=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if(!schemaMatch)throw new Error('National tools: JSON-LD graph missing');
  const schema=JSON.parse(schemaMatch[1]);
  const graph=schema['@graph'];
  if(!Array.isArray(graph))throw new Error('National tools: JSON-LD @graph missing');
  const list=graph.find(node=>node?.['@id']==='https://chrisizworski.com/national-tools/#toollist');
  if(!list||!Array.isArray(list.itemListElement))throw new Error('National tools: ItemList missing');
  if(!list.itemListElement.some(entry=>entry?.url===URL)){
    const md=list.itemListElement.findIndex(entry=>entry?.url==='https://chrisizworski.com/chesapeake-bay-bridge-maryland/');
    const cbbt=list.itemListElement.findIndex(entry=>entry?.url==='https://chrisizworski.com/chesapeake-bay-bridge-tunnel/');
    const at=Math.max(md,cbbt);
    const entry={'@type':'ListItem',position:0,url:URL,name:NAME};
    if(at>=0)list.itemListElement.splice(at+1,0,entry);else list.itemListElement.push(entry);
  }
  list.itemListElement.forEach((entry,index)=>{entry.position=index+1});
  list.numberOfItems=list.itemListElement.length;
  const page=graph.find(node=>node?.['@id']==='https://chrisizworski.com/national-tools/#page');
  if(page)page.dateModified=LASTMOD;
  html=html.replace(schemaMatch[0],`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
  const count=(html.match(/data-search-card/g)||[]).length;
  html=html.replace(/(<p class="finder-count" id="finder-count" aria-live="polite">)\d+ tools shown(<\/p>)/,`$1${count} tools shown$2`);
  fs.writeFileSync(file,html);
  console.log(`National tools reconciled: Sunshine Skyway embedded; ${count} searchable tools.`);
}

function upsertSitemap(){
  const file='public/sitemap.xml';
  let xml=fs.readFileSync(file,'utf8');
  const escaped=URL.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const existing=new RegExp(`<url>\\s*<loc>${escaped}<\\/loc>[\\s\\S]*?<\\/url>`,'m');
  const entry=`  <url>\n    <loc>${URL}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n    <changefreq>hourly</changefreq>\n    <priority>0.9</priority>\n  </url>`;
  if(existing.test(xml))xml=xml.replace(existing,entry);
  else{
    if(!xml.includes('</urlset>'))throw new Error('Sunshine Skyway discovery: sitemap.xml missing </urlset>');
    xml=xml.replace('</urlset>',`${entry}\n</urlset>`);
  }
  fs.writeFileSync(file,xml);
}

function patchLlms(){
  const file='public/llms.txt';
  let text=fs.readFileSync(file,'utf8').trimEnd();
  if(!text.includes(URL))text+=`\n- Sunshine Skyway Bridge live traffic, wind, camera and tolls: ${URL}`;
  fs.writeFileSync(file,`${text}\n`);
}

function patchInboundLinks(){
  const pages=[
    ['public/chesapeake-bay-bridge-maryland/index.html','Maryland Bay Bridge'],
    ['public/chesapeake-bay-bridge-tunnel/index.html','CBBT'],
    ['public/niagara-border-crossing/index.html','Niagara'],
    ['public/mackinac-bridge-live/index.html','Mackinac Bridge'],
  ];
  for(const [file,label] of pages){
    if(!fs.existsSync(file))continue;
    let html=fs.readFileSync(file,'utf8');
    if(html.includes(REL))continue;
    const link=`<p class="bridge-network-link">Florida crossing: <a href="${REL}">Sunshine Skyway Bridge traffic, wind, camera &amp; tolls</a></p>`;
    if(html.includes('</footer>'))html=html.replace('</footer>',`${link}</footer>`);
    else if(html.includes('</main>'))html=html.replace('</main>',`${link}</main>`);
    else throw new Error(`Sunshine Skyway discovery: cannot place inbound link in ${label}`);
    fs.writeFileSync(file,html);
  }
}

patchRegistry();
patchTools();
patchNationalTools();
upsertSitemap();
patchLlms();
patchInboundLinks();
