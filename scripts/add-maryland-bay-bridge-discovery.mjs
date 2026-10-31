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

function upsertSitemap(){const file='public/sitemap.xml';let xml=fs.readFileSync(file,'utf8');const escaped=URL.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const existing=new RegExp(`<url>\\s*<loc>${escaped}<\\/loc>[\\s\\S]*?<\\/url>`,'m');const entry=`  <url>\n    <loc>${URL}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n    <changefreq>hourly</changefreq>\n    <priority>0.9</priority>\n  </url>`;if(existing.test(xml))xml=xml.replace(existing,entry);else{if(!xml.includes('</urlset>'))throw new Error('Maryland Bay Bridge discovery: sitemap.xml missing </urlset>');xml=xml.replace('</urlset>',`${entry}\n</urlset>`)}fs.writeFileSync(file,xml);console.log('Maryland Bay Bridge canonical URL added to sitemap.xml.')}
function patchLlms(){const file='public/llms.txt';let text=fs.readFileSync(file,'utf8').trimEnd();if(!text.includes(URL))text+=`\n- Maryland Chesapeake Bay Bridge live traffic, wind and tolls: ${URL}`;fs.writeFileSync(file,`${text}\n`)}
patchRegistry();upsertSitemap();patchLlms();
