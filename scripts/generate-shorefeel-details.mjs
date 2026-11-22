import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function h(x){return String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;")}
function pageFor(b,region,all){
 const canada=region==='ca',area=canada?'canada':'around-the-lakes';
 const slug=b.slug,name=b.name,lake=b.lake;
 const city=canada?b.nearbyTown:b.city,place=canada?city+', Ontario, Canada':city+', '+b.state+', USA';
 const regionHub='/great-lakes-beaches/'+area+'/',rel='/great-lakes-beaches/'+area+'/'+slug+'/',canonical='https://chrisizworski.com'+rel;
 const park=canada?b.officialUrl:b.parkUrl,advisory=canada?b.advisory.url:b.safety.url,authority=canada?b.advisory.authority:b.safety.name;
 const sourceName=canada?'Environment Canada':'National Weather Service',forecastKind=canada?'nearby city forecast':'nearby NWS land forecast';
 const title=h((name+' ShoreFeel | Chris Izworski').length<=60?name+' ShoreFeel | Chris Izworski':name+' ShoreFeel');
 const description=h(('ShoreFeel at '+name+': '+sourceName+' air comfort and wind, an on-the-shore field note, and official local beach advisories.').slice(0,156));
 const maps='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(name+', '+place);
 const neighbors=all.filter(x=>x.lake===lake&&x.slug!==slug).slice(0,3).map(x=>{
   return '<a href="/great-lakes-beaches/'+area+'/'+x.slug+'/">'+h(x.name)+'</a>';
 }).join('\n');
 const setting=lake==='Superior'?'Lake Superior is slow to warm compared with the land in spring and early summer. If wind arrives across cooler water, you may feel that contrast most clearly beyond the shelter of trees or rock.':
  lake==='Michigan'?'Lake Michigan often puts dunes, forest or city blocks a short walk from open sand. Watch how the breeze changes when those sheltered places give way to the lake.':
  lake==='Huron'?'Along Lake Huron and Georgian Bay, points, coves and long beaches face the wind in different directions. The place you choose on shore can matter as much as the nearby town forecast.':
  lake==='Erie'?'Lake Erie is relatively shallow, yet its open beaches can be breezy and changeable. Look at waves and posted notices instead of assuming a warm day means calm or safe water.':
  'Lake Ontario meets dunes, bluffs, city streets and sheltered bays. Air traveling across its water can feel different from the air among buildings or trees, depending on wind direction.';
 const sourceCaveat=canada?'An ECCC city forecast may be more than a few kilometres from the beach, and Canadian apparent temperature is wind chill only when conditions warrant.':
  'The NWS point forecast represents a nearby land-area grid. Heat index or wind chill applies only when source values support it.';
 const jsonLd=JSON.stringify({"@context":"https://schema.org","@graph":[
  {"@type":"WebPage","@id":canonical+"#page","url":canonical,"name":name+" ShoreFeel","description":description,"dateModified":"2026-11-22","isPartOf":{"@id":"https://chrisizworski.com/#website"},"author":{"@id":"https://chrisizworski.com/#person"},"publisher":{"@id":"https://chrisizworski.com/#person"}},
  {"@type":"Person","@id":"https://chrisizworski.com/#person","name":"Chris Izworski","url":"https://chrisizworski.com/"},
  {"@type":"BreadcrumbList","itemListElement":[
   {"@type":"ListItem","position":1,"name":"Great Lakes Beaches","item":"https://chrisizworski.com/great-lakes-beaches/"},
   {"@type":"ListItem","position":2,"name":canada?"Canadian Shores":"U.S. Shores","item":"https://chrisizworski.com"+regionHub},
   {"@type":"ListItem","position":3,"name":name,"item":canonical}]}]}).replaceAll('<','\\u003c');
 return `<!doctype html>
<html lang="${canada?'en-CA':'en-US'}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><meta name="description" content="${description}">
<link rel="canonical" href="${h(canonical)}">
<meta name="author" content="Chris Izworski"><meta name="theme-color" content="#103f4c">
<meta property="og:type" content="website"><meta property="og:url" content="${h(canonical)}">
<meta property="og:title" content="${title}"><meta property="og:description" content="${description}">
<link rel="stylesheet" href="/assets/shorefeel-beach-detail.css">
<script type="application/ld+json">${jsonLd}</script>
<script defer src="/_vercel/insights/script.js"></script><script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>
<script defer src="/_vercel/speed-insights/script.js"></script>
<script defer src="/assets/shorefeel-beach-detail.js"></script>
</head>
<body data-shorefeel-region="${region}" data-shorefeel-slug="${h(slug)}" data-analytics-page="shorefeel-beach-detail">
<a class="skip" href="#main">Skip to ShoreFeel conditions</a>
<header class="shore-site-head"><a href="/" class="brand">Chris Izworski</a>
<nav aria-label="Primary"><a href="/tools/">Tools</a><a href="/great-lakes-beaches/">Beaches</a><a href="${regionHub}">${canada?'Canada':'Around the lakes'}</a></nav></header>
<main id="main">
<section class="shore-lead"><p class="eyebrow">ShoreFeel · Lake ${h(lake)} · ${h(place)}</p>
<h1>${h(name)}</h1><p class="shore-lede">What will it feel like at the beach?</p></section>
<section class="shore-answer" id="shorefeel-live" data-status="loading" aria-label="Source-dated beach-area weather">
<div class="shore-answer-inner">
<p class="eyebrow">Today’s nearby forecast · ${sourceName}</p>
<div class="answer-grid">
<div><strong id="feel-value" class="shore-value" aria-live="polite">Checking forecast</strong>
<p class="shore-secondary" id="feel-secondary">Forecast air comfort, not a thermometer on the sand</p>
<p class="shore-method" id="feel-method">Retrieving ${sourceName} weather</p></div>
<div class="shore-metrics">
<div class="shore-metric"><span>Air</span><strong id="feel-air">Checking</strong></div>
<div class="shore-metric"><span>Wind</span><strong id="feel-wind">Checking</strong></div>
<div class="shore-metric"><span>Valid period</span><strong id="feel-when">Waiting for source</strong></div>
</div></div></div>
<p class="shore-guide" id="feel-guide">The lake has its own weather story. Compare the reported wind with the shoreline when you arrive; this is a nearby area forecast, not a thermometer at ${h(name)}.</p>
<p class="shore-source"><strong>What this reading can tell you</strong><span id="feel-evidence">${sourceName} ${forecastKind}. No measured beach cooling adjustment or current swimming-area water temperature is available from this source.</span></p>
${canada?'<p class="shore-attribution">Contains information licensed under the <a href="https://eccc-msc.github.io/open-data/licence/readme_en/" rel="noopener" target="_blank">Data Server End-use Licence</a> of Environment and Climate Change Canada.</p>':''}
</section>
<section class="shore-columns">
<div><p class="eyebrow">Along the water</p><h2>Meet this shoreline</h2>
<p class="shore-story">${h(b.story)}</p><p class="shore-interpret">${h(setting)}</p>
<p class="shore-interpret">At the water's edge, notice whether the breeze arrives from the lake, how the waves meet this shore, and which parts of the landscape offer shelter. ${h(sourceCaveat)} Check current park and beach advisories, then judge the conditions when you arrive.</p>
</div>
<div><p class="eyebrow">Before you go</p><h2>Before you set out</h2>
${!canada&&b.accessAlert?'<p class="shore-access-notice" role="note"><strong>Park access notice:</strong> '+h(b.accessAlert)+'</p>':''}
<div class="shore-actions">
<a class="shore-action" href="${h(park)}" rel="noopener" target="_blank">Official park or beach details</a>
<a class="shore-action" href="${h(advisory)}" rel="noopener" target="_blank">${h(authority)} advisories</a>
<a class="shore-action" href="${h(maps)}" rel="noopener" target="_blank">Find ${h(name)} on Google Maps</a>
<a class="shore-action" href="${regionHub}?beach=${encodeURIComponent(slug)}">Open this beach in the interactive shoreline map</a>
</div>
<p class="shore-small">Map link finds the named public place, not a verified parking entrance. This page does not establish the swimming flag, current bacteria status, waves, or safe access.</p>
<details><summary>Source method and limits</summary><p class="shore-small">The nearby forecast gives you an official picture of the air, not a thermometer planted in the beach. ${canada?'Canadian wind chill is shown only when its formula applies.':'NWS wind chill or heat index is shown only when its inputs qualify.'} Neither tells us the exact difference between town and sand. Without a recent, suitable forecast, ShoreFeel leaves the number unavailable rather than inventing one.</p></details>
</div></section>
<nav class="shore-nearby" aria-label="Other shores on Lake ${h(lake)}"><p class="eyebrow">Continue exploring</p><h2>Follow the shoreline</h2>
<div class="shore-links">${neighbors}<a href="${regionHub}">View all ${canada?'Ontario':'U.S.'} shores</a></div></nav>
<noscript><p class="shore-small">JavaScript is required for live weather. The official park and ${h(authority)} links above remain available without it.</p></noscript>
</main><footer>ShoreFeel · Source-based area forecasts only · <a href="/great-lakes-beaches/">Great Lakes Beach Report</a> · Built by Chris Izworski</footer>
</body></html>
`;
}
const us=JSON.parse(await readFile(path.join(root,'data/shorefeel-us-coast.json'),'utf8')).beaches;
const ca=JSON.parse(await readFile(path.join(root,'data/shorefeel-canada-ontario.json'),'utf8')).locations;
if(us.length!==16||ca.length!==30)throw Error('Unexpected vetted ShoreFeel catalog size');
for(const [region,all] of [['us',us],['ca',ca]]){
 const area=region==='ca'?'canada':'around-the-lakes';
 const seen=new Set();
 for(const beach of all){
  if(seen.has(beach.slug)||!/^[a-z0-9-]{3,90}$/.test(beach.slug))throw Error('Bad ShoreFeel slug');
  seen.add(beach.slug);
  const filename=path.join(root,'public/great-lakes-beaches',area,beach.slug,'index.html');
  await mkdir(path.dirname(filename),{recursive:true});
  const content=pageFor(beach,region,all);
  await writeFile(filename,content,'utf8');
 }
}
const urls=[...us.map(b=>'/great-lakes-beaches/around-the-lakes/'+b.slug+'/'),...ca.map(b=>'/great-lakes-beaches/canada/'+b.slug+'/')];
const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>'  <url><loc>https://chrisizworski.com'+u+'</loc><lastmod>2026-11-22</lastmod></url>').join('\n')+'\n</urlset>\n';
await writeFile(path.join(root,'public/sitemap-shorefeel-beaches.xml'),xml,'utf8');
console.log('Generated '+urls.length+' independent canonical ShoreFeel beach pages from vetted online weather-source catalogs');
