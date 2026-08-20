#!/usr/bin/env node

const ORIGIN=process.env.MANISTEE_PRODUCTION_ORIGIN||'https://chrisizworski.com';
const checks=[];

async function fetchText(path,{expectNoindex=false}={}){
  const url=new URL(path,ORIGIN);
  const response=await fetch(url,{redirect:'follow',headers:{'user-agent':'ChrisIzworskiManisteeProductionSmoke/1.0'},signal:AbortSignal.timeout(15000)});
  const text=await response.text();
  const robots=(response.headers.get('x-robots-tag')||'').toLowerCase();
  if(!response.ok)throw new Error(`${path} returned ${response.status}`);
  if(expectNoindex&&!robots.includes('noindex'))throw new Error(`${path} should be noindex but x-robots-tag was ${robots||'(missing)'}`);
  if(!expectNoindex&&robots.includes('noindex'))throw new Error(`${path} unexpectedly returned noindex`);
  checks.push({path,status:response.status,robots:robots||null});
  return {response,text};
}

function assert(condition,message){if(!condition)throw new Error(message);}

try{
  const page=await fetchText('/manistee-river-map/');
  assert(page.text.includes('<title>Manistee River Map & Trip Planner | Access, Flows, Fishing</title>'),'Manistee page title mismatch or stale HTML');
  assert(page.text.includes('The Manistee River: A Field Map'),'Manistee field-map heading missing');
  assert(page.text.includes('/api/manistee-river-conditions'),'conditions API reference missing from deployed client contract');
  assert(page.text.includes('/api/manistee-river-hydrography'),'hydrography API reference missing from deployed client contract');

  const conditions=await fetchText('/api/manistee-river-conditions',{expectNoindex:true});
  const conditionsJson=JSON.parse(conditions.text);
  assert(Array.isArray(conditionsJson.gauges),'conditions API gauges missing');
  assert(conditionsJson.gauges.length===5,`conditions API expected 5 gauges, got ${conditionsJson.gauges.length}`);
  const ids=new Set(conditionsJson.gauges.map(g=>g.id));
  for(const id of ['04123500','04124000','04124200','04125550','04125460'])assert(ids.has(id),`conditions API missing ${id}`);

  const hydro=await fetchText('/api/manistee-river-hydrography',{expectNoindex:true});
  const hydroJson=JSON.parse(hydro.text);
  assert(hydroJson.type==='FeatureCollection','hydrography API is not a FeatureCollection');
  assert(Array.isArray(hydroJson.features)&&hydroJson.features.length>=20,`hydrography feature count too small: ${hydroJson.features?.length??'missing'}`);
  const names=new Set(hydroJson.features.map(f=>f?.properties?.name).filter(Boolean));
  for(const name of ['Manistee River','Pine River','Bear Creek','Little Manistee River'])assert(names.has(name),`hydrography API missing ${name}`);

  const sitemap=await fetchText('/sitemap-manistee.xml');
  assert(sitemap.text.includes('<loc>https://chrisizworski.com/manistee-river-map/</loc>'),'Manistee sitemap is stale or missing route');

  const robots=await fetchText('/robots.txt');
  assert(robots.text.includes('Sitemap: https://chrisizworski.com/sitemap-manistee.xml'),'robots.txt does not advertise Manistee sitemap');

  console.log(`Manistee production smoke PASS — ${checks.map(c=>`${c.path} ${c.status}`).join(' · ')}`);
}catch(error){
  console.error(`Manistee production smoke FAIL — ${error?.message||error}`);
  process.exit(1);
}
