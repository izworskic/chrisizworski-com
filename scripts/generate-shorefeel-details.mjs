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
 const title=h((name+' ShoreFeel | Chris Izworski').length<=65?name+' ShoreFeel | Chris Izworski':name+' ShoreFeel');
 const description=h(('ShoreFeel at '+name+': '+sourceName+' air comfort and wind, an on-the-shore field note, and official local beach advisories.').slice(0,156));
 const maps='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(name+', '+place);
 const neighbors=all.filter(x=>x.lake===lake&&x.slug!==slug).slice(0,3).map(x=>{
   return '<a href="/great-lakes-beaches/'+area+'/'+x.slug+'/">'+h(x.name)+'</a>';
 }).join('\n');
 const setting=lake==='Superior'?'Lake Superior stores cold through much of the year, and the wind can change quickly as you leave the shelter of the shore.':
  lake==='Michigan'?'On Lake Michigan, dunes, piers and city blocks can shelter you from wind that becomes more noticeable at the waterline.':
  lake==='Huron'?'Along Lake Huron and Georgian Bay, bays, points and long sand strands can experience noticeably different exposures to moving air.':
  lake==='Erie'?'Lake Erie can warm sooner than the deeper Great Lakes, but an exposed shoreline still deserves a close look at wind and posted swimming notices.':
  'Lake Ontario holds large amounts of heat and cold, while the shoreline can feel different from the nearby town forecast.';
 const sourceCaveat=canada?'An ECCC city forecast may be more than a few kilometres from the beach, and Canadian apparent temperature is wind chill only when conditions warrant.':
  'The NWS point forecast represents a nearby land-area grid. Heat index or wind chill applies only when source values support it.';
 const jsonLd=JSON.stringify({"@context":"https://schema.org","@graph":[
  {"@type":"WebPage","@id":canonical+"#page","url":canonical,"name":name+" ShoreFeel","description":description,"dateModified":"2026-11-21","isPartOf":{"@id":"https://chrisizworski.com/#website"},"author":{"@id":"https://chrisizworski.com/#person"},"publisher":{"@id":"https://chrisizworski.com/#person"}},
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
<p class="shore-guide" id="feel-guide">The forecast describes an area near ${h(name)}, not a measurement from the beach. Wind and sun may change how the shore feels.</p>
<p class="shore-source"><strong>What this reading can tell you</strong><span id="feel-evidence">${sourceName} ${forecastKind}. No measured beach cooling adjustment or current swimming-area water temperature is available from this source.</span></p>
</section>
<section class="shore-columns">
<div><p class="eyebrow">Along the water</p><h2>What shapes this shore</h2>
<p class="shore-story">${h(b.story)}</p><p class="shore-interpret">${h(setting)}</p>
<p class="shore-interpret">An open beach is not the same exposure as a wooded trail, parking lot or town street. ${h(sourceCaveat)} Compare the issued time and wind before you leave, then reassess the conditions you actually encounter.</p>
</div>
<div><p class="eyebrow">Before you go</p><h2>Check the place, not just the forecast</h2>
<div class="shore-actions">
<a class="shore-action" href="${h(park)}" rel="noopener" target="_blank">Official park or beach details</a>
<a class="shore-action" href="${h(advisory)}" rel="noopener" target="_blank">${h(authority)} advisories</a>
<a class="shore-action" href="${h(maps)}" rel="noopener" target="_blank">Find ${h(name)} on Google Maps</a>
<a class="shore-action" href="${regionHub}?beach=${encodeURIComponent(slug)}">Open this beach in the interactive shoreline map</a>
</div>
<p class="shore-small">Map link finds the named public place, not a verified parking entrance. This page does not establish the swimming flag, current bacteria status, waves, or safe access.</p>
<details><summary>Source method and limits</summary><p class="shore-small">The forecast is for an official weather reference near the beach, not an on-sand thermometer. Wind chill and heat index do not calculate the exact lake-breeze cooling or warming at the waterline. There is no calibrated beach-versus-inland temperature correction. If the source is missing or stale, the weather number remains unavailable.</p></details>
</div></section>
<nav class="shore-nearby" aria-label="Other shores on Lake ${h(lake)}"><p class="eyebrow">Continue exploring</p><h2>Nearby Great Lakes field notes</h2>
<div class="shore-links">${neighbors}<a href="${regionHub}">View all ${canada?'Ontario':'U.S.'} shores</a></div></nav>
<noscript><p class="shore-small">JavaScript is required for live weather. The official park and ${h(authority)} links above remain available without it.</p></noscript>
</main><footer>ShoreFeel · Source-based area forecasts only · <a href="/great-lakes-beaches/">Great Lakes Beach Report</a> · Built by Chris Izworski</footer>
</body></html>
`;
}
const us=JSON.parse(await readFile(path.join(root,'data/shorefeel-us-coast.json'),'utf8')).beaches;
const ca=JSON.parse(await readFile(path.join(root,'data/shorefeel-canada-ontario.json'),'utf8')).locations;
if(us.length!==16||ca.length!==18)throw Error('Unexpected vetted ShoreFeel catalog size');
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
const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>'  <url><loc>https://chrisizworski.com'+u+'</loc><lastmod>2026-11-21</lastmod></url>').join('\n')+'\n</urlset>\n';
await writeFile(path.join(root,'public/sitemap-shorefeel-beaches.xml'),xml,'utf8');
console.log('Generated '+urls.length+' independent canonical ShoreFeel beach pages from vetted online weather-source catalogs');
