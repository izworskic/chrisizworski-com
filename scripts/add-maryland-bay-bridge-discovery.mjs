import fs from 'node:fs';

const KEY='maryland-bay-bridge';
const URL='https://chrisizworski.com/chesapeake-bay-bridge-maryland/';
const LASTMOD='2026-10-04';
const NAME='Maryland Chesapeake Bay Bridge Live';
const DESC='Check MDTA wind restrictions, live Maryland CHART traffic and cameras, vehicle rules, planned work and eastbound tolls for the US 50/301 Bay Bridge.';

function patchRegistry(){
  const file='benchmarks/tool-network-registry.json';
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!Array.isArray(data.tools))throw new Error('Maryland Bay Bridge discovery: tool registry missing tools[]');
  if(!data.tools.some(tool=>tool.id===KEY||tool.canonical===URL)){
    data.tools.push({id:KEY,name:NAME,canonical:URL,aliases:[],kind:'flagship-live',cluster:'transportation',primaryIntent:'Maryland Chesapeake Bay Bridge traffic wind restrictions and tolls',seasons:[1,2,3,4,5,6,7,8,9,10,11,12],geographies:['maryland-chesapeake-bay'],personas:['driver','rv-traveler','commercial-driver','trip-planner'],networkRole:'bridge',searchTreatment:{status:'active'},searchEvidence:{status:'new-build'}});
    data.updated=LASTMOD;
    fs.writeFileSync(file,`${JSON.stringify(data,null,2)}\n`);
    console.log('Maryland Bay Bridge added to tool-network registry.');
  }
}

function patchTools(){
  const file='public/tools/index.html';let html=fs.readFileSync(file,'utf8');let changed=false;
  if(!html.includes(`data-featured-tool="${KEY}"`)){
    const anchor=html.match(/    <article class="feature-card" data-featured-tool="niagara-border-crossing">[\s\S]*?    <\/article>\n/);
    if(!anchor)throw new Error('Maryland Bay Bridge discovery: Niagara featured card anchor not found after Niagara discovery runs');
    const card=`    <article class="feature-card" data-featured-tool="${KEY}">\n      <div class="feature-kicker">Live Maryland crossing decision</div>\n      <h3><a href="/chesapeake-bay-bridge-maryland/" data-track-tool="${KEY}" data-placement="tools-featured">Maryland Chesapeake Bay Bridge Live</a></h3>\n      <p>MDTA wind restrictions first, then live CHART traffic, cameras, vehicle rules, planned work and eastbound tolls.</p>\n      <a class="tool-cta" href="/chesapeake-bay-bridge-maryland/" data-track-tool="${KEY}" data-placement="tools-featured">Check the Bay Bridge <span aria-hidden="true">&rarr;</span></a>\n    </article>\n`;
    html=html.replace(anchor[0],`${anchor[0]}${card}`);changed=true;
  }
  if(!html.includes(`data-tool-key="${KEY}"`)){
    const linkIndex=html.indexOf('<a href="/niagara-border-crossing/');
    if(linkIndex<0)throw new Error('Maryland Bay Bridge discovery: Niagara catalog anchor not found');
    const cardIndex=html.lastIndexOf('  <div class="tool-card"',linkIndex);
    if(cardIndex<0)throw new Error('Maryland Bay Bridge discovery: tool-card boundary not found');
    const card=`  <div class="tool-card" data-tool-key="${KEY}" data-tags="planning live-data bridges traffic travel maryland chesapeake eastern-shore tolls cameras wind" data-months="1,2,3,4,5,6,7,8,9,10,11,12">\n    <div class="tk">Live data<span class="tk-season" hidden> / useful now</span></div>\n    <div class="tool-title"><a href="/chesapeake-bay-bridge-maryland/">${NAME}</a></div>\n    <div class="tool-desc">${DESC}</div>\n  </div>\n`;
    html=html.slice(0,cardIndex)+card+html.slice(cardIndex);changed=true;
  }
  const schemaRe=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;let match,patched=false;
  while((match=schemaRe.exec(html))){try{const data=JSON.parse(match[1]);const graph=data?.['@graph'];if(!Array.isArray(graph))continue;const itemList=graph.find(node=>node?.['@id']==='https://chrisizworski.com/tools/#toollist');if(!itemList||!Array.isArray(itemList.itemListElement))continue;if(!itemList.itemListElement.some(entry=>entry?.item?.url===URL))itemList.itemListElement.push({'@type':'ListItem',position:itemList.itemListElement.length+1,item:{'@type':'WebApplication',name:NAME,url:URL,description:DESC,applicationCategory:'TravelApplication',operatingSystem:'Any web browser',isAccessibleForFree:true,author:{'@id':'https://chrisizworski.com/#person'},creator:{'@id':'https://chrisizworski.com/#person'}}});itemList.itemListElement.forEach((entry,index)=>{entry.position=index+1});itemList.numberOfItems=itemList.itemListElement.length;const replacement=`<script type="application/ld+json">${JSON.stringify(data)}</script>`;html=html.slice(0,match.index)+replacement+html.slice(match.index+match[0].length);patched=true;changed=true;break}catch{}}
  if(!patched)throw new Error('Maryland Bay Bridge discovery: tools JSON-LD collection not found');
  const count=(html.match(/class="tool-card"/g)||[]).length;html=html.replace(/search all \d+ tools by name or topic/i,`search all ${count} tools by name or topic`);fs.writeFileSync(file,html);console.log(`Maryland Bay Bridge tools discovery ${changed?'applied':'already present'}; catalog count ${count}.`);
}

function upsertSitemap(){const file='public/sitemap.xml';let xml=fs.readFileSync(file,'utf8');const escaped=URL.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const existing=new RegExp(`<url>\\s*<loc>${escaped}<\\/loc>[\\s\\S]*?<\\/url>`,'m');const entry=`  <url>\n    <loc>${URL}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n    <changefreq>hourly</changefreq>\n    <priority>0.9</priority>\n  </url>`;if(existing.test(xml))xml=xml.replace(existing,entry);else{if(!xml.includes('</urlset>'))throw new Error('Maryland Bay Bridge discovery: sitemap.xml missing </urlset>');xml=xml.replace('</urlset>',`${entry}\n</urlset>`)}fs.writeFileSync(file,xml);console.log('Maryland Bay Bridge canonical URL added to sitemap.xml.')}
function patchLlms(){const file='public/llms.txt';let text=fs.readFileSync(file,'utf8').trimEnd();if(!text.includes(URL))text+=`\n- Maryland Chesapeake Bay Bridge live traffic, wind and tolls: ${URL}`;fs.writeFileSync(file,`${text}\n`)}
patchRegistry();patchTools();upsertSitemap();patchLlms();
