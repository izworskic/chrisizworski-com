#!/usr/bin/env node

const ORIGIN=process.env.MANISTEE_PRODUCTION_ORIGIN||'https://chrisizworski.com';
const checks=[];

async function fetchText(path,{expectNoindex=false}={}){
  const url=new URL(path,ORIGIN);
  const response=await fetch(url,{redirect:'follow',headers:{'user-agent':'ChrisIzworskiManisteeProductionSmoke/4.0'},signal:AbortSignal.timeout(15000)});
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
  assert(page.text.includes('/assets/manistee-river-map.js'),'Manistee client asset missing from deployed page');
  assert(page.text.includes('/assets/manistee-river-data.js'),'Manistee data asset missing from deployed page');

  const client=await fetchText('/assets/manistee-river-map.js');
  assert(client.text.includes("fetch('/api/manistee-river-conditions')"),'conditions API reference missing from deployed client');
  assert(client.text.includes("fetch('/api/manistee-river-hydrography')"),'hydrography API reference missing from deployed client');
  assert(client.text.includes('routeGraph(state.graphs[from.waterway],from,to)'),'NHD route planner missing from deployed client');
  assert(client.text.includes('accessPopupHtml'),'rich access popup renderer missing from deployed client');
  assert(client.text.includes("m.bindPopup(()=>accessPopupHtml(p)"),'access markers are not using rich popups');
  assert(client.text.includes('gaugePopupHtml(meta,g)'),'USGS gauge rich popup renderer missing');
  assert(client.text.includes('riverPopupHtml'),'rich river-geometry popup renderer missing from deployed client');
  assert(client.text.includes("path.on('click',event=>openRiverPopup"),'colored river geometry is not wired to the rich popup');
  assert(!client.text.includes('`${f.properties.name} · USGS NHD`'),'old sparse river-name-plus-USGS-NHD tooltip is still deployed');
  assert(client.text.includes('Nearest active gauge'),'river popup nearest-gauge context missing');
  assert(client.text.includes('Nearest mapped access'),'river popup nearest-access context missing');
  assert(client.text.includes('Map this river point'),'river popup map action missing');
  assert(client.text.includes('Directions to nearest mapped access'),'river popup access directions missing');
  assert(client.text.includes('Gauge readings describe the gauge location, not this exact point'),'river popup gauge-location disclaimer missing');
  assert(client.text.includes('A river point is not necessarily public access'),'river popup access disclaimer missing');
  assert(client.text.includes('Navigate here'),'popup navigation action missing');
  assert(client.text.includes('Location confidence'),'popup source/trust context missing');

  const data=await fetchText('/assets/manistee-river-data.js');
  assert(data.text.includes('/assets/manistee-ausable-ui.js'),'Au Sable-style UI layer is not loaded by deployed Manistee data asset');
  assert(data.text.includes('/assets/manistee-river-personas.js'),'persona data layer loader missing from deployed data asset');
  assert(data.text.includes('/assets/manistee-river-live-depth.js'),'live-depth layer loader missing from deployed data asset');

  const fieldUi=await fetchText('/assets/manistee-ausable-ui.js');
  for(const phrase of ['Manistee River Field Map','River reach filters','Plan by','Popular starts','Copy trip link','River, weather & field details','conditions-now-strip'])assert(fieldUi.text.includes(phrase),`Au Sable-style UI asset missing ${phrase}`);
  assert(fieldUi.text.includes("mast.dataset.compacted='true'"),'compact masthead state missing');
  assert(fieldUi.text.includes("const intro=$(':scope > p',mast);intro?.remove()"),'verbose masthead intro is not removed');
  assert(!fieldUi.text.includes('river: live data'),'old masthead status bar is still injected');
  assert(!fieldUi.text.includes('agency coordinates'),'old masthead count row is still injected');
  assert(fieldUi.text.includes("riverTab.textContent='River'"),'task nav does not normalize River label');
  assert(fieldUi.text.includes("searchParams.set('from'"),'shareable planner start state missing');
  assert(fieldUi.text.includes("searchParams.set('to'"),'shareable planner end state missing');

  const fieldCss=await fetchText('/assets/manistee-ausable-ui.css');
  assert(fieldCss.text.includes('.shell{display:flex!important;flex-direction:column!important'),'map-first single-instrument shell missing');
  assert(fieldCss.text.includes('height:min(61vh,690px)!important'),'dominant desktop map height missing');
  assert(fieldCss.text.includes('.persona-deck{display:none!important}'),'persona wall is still visible in primary workflow');
  assert(fieldCss.text.includes('.source-strip{display:none!important}'),'source pill wall is still visible in masthead');
  assert(fieldCss.text.includes('height:58svh!important'),'mobile map contract missing');
  assert(fieldCss.text.includes('min-height:44px!important'),'mobile touch-target contract missing');

  const persona=await fetchText('/assets/manistee-river-personas.js');
  for(const key of ['trout','salmon','paddle','camp','boat','family','access'])assert(persona.text.includes(`${key}:{`),`persona asset missing ${key} decision lens`);

  const depth=await fetchText('/assets/manistee-river-live-depth.js');
  for(const phrase of ['River key','Plan from this exact access','River right now','Weather near this access','Before you go'])assert(depth.text.includes(phrase),`live-depth asset missing ${phrase}`);
  assert(depth.text.includes('left:14px'),'river key source asset unexpectedly changed');
  assert(depth.text.includes('/api/manistee-river-weather?lat='),'selected-access weather request missing');
  assert(depth.text.includes('popupLiveHtml'),'popup live enrichment renderer missing');
  assert(depth.text.includes('Weather at this access'),'popup weather block missing');
  assert(depth.text.includes('Nearest gauge'),'popup nearest-gauge context missing');
  assert(depth.text.includes('manistee:popup-open'),'popup enrichment event contract missing');
  assert(depth.text.includes('MutationObserver'),'popup timing fallback missing');
  assert(depth.text.includes('max-width:calc(100vw - 34px)'),'mobile popup width guard missing');

  const conditions=await fetchText('/api/manistee-river-conditions',{expectNoindex:true});
  const conditionsJson=JSON.parse(conditions.text);
  assert(Array.isArray(conditionsJson.gauges),'conditions API gauges missing');
  assert(conditionsJson.gauges.length===5,`conditions API expected 5 gauges, got ${conditionsJson.gauges.length}`);
  const ids=new Set(conditionsJson.gauges.map(g=>g.id));
  for(const id of ['04123500','04124000','04124200','04125550','04125460'])assert(ids.has(id),`conditions API missing ${id}`);
  for(const g of conditionsJson.gauges){
    assert(Object.hasOwn(g,'seasonal_stats'),`conditions API missing seasonal_stats for ${g.id}`);
    assert(Object.hasOwn(g,'flow_context'),`conditions API missing flow_context for ${g.id}`);
    assert(Object.hasOwn(g,'turbidity_fnu'),`conditions API missing turbidity field for ${g.id}`);
    assert(Object.hasOwn(g,'dissolved_oxygen_mgl'),`conditions API missing dissolved oxygen field for ${g.id}`);
  }

  const weather=await fetchText('/api/manistee-river-weather?lat=44.2642&lon=-85.9381',{expectNoindex:true});
  const weatherJson=JSON.parse(weather.text);
  assert(weatherJson.source==='National Weather Service','weather API source mismatch');
  assert(Array.isArray(weatherJson.hourly)&&weatherJson.hourly.length>0,'weather API hourly periods missing');
  assert(Array.isArray(weatherJson.forecast),'weather API forecast periods missing');
  assert(Array.isArray(weatherJson.alerts),'weather API alerts contract missing');
  assert(weatherJson.precipitation_context,'weather API precipitation context missing');

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