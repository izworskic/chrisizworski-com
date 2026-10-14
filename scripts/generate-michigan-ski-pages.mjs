import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {RESORTS}=require('../lib/michigan-ski/resorts');
const base='https://chrisizworski.com/michigan-ski-hills/';
const P='https://chrisizworski.com/#person';
const today='2026-10-14';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function dataTag(objects){return '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@graph':objects}).replace(/</g,'\\u003c')+'</script>';}
function person(){return {'@type':'Person','@id':P,name:'Chris Izworski',url:'https://chrisizworski.com/'};}
function pageShell({title,description,url,h1,subtitle,content,slug=null}){
 if(title.length>60||description.length>158)throw Error('Search snippet length: '+title+' '+description);
 const json=[
 person(),{'@type':'WebPage','@id':url+'#page',url,name:title,description,dateModified:today,author:{'@id':P},publisher:{'@id':P},isPartOf:{'@id':'https://chrisizworski.com/#website'}},
 {'@type':'SoftwareApplication','@id':url+'#tool',name:h1,applicationCategory:'TravelApplication',operatingSystem:'Web',
 url,isAccessibleForFree:true,creator:{'@id':P},offers:{'@type':'Offer',price:0,priceCurrency:'USD'}}
 ];
 const p=slug?' data-resort="'+esc(slug)+'"':'';
 return [
 '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<meta name="robots" content="index,follow,max-image-preview:large">',
 '<title>'+esc(title)+'</title><meta name="description" content="'+esc(description)+'">',
 '<link rel="canonical" href="'+url+'"><meta property="og:type" content="website">',
 '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'">',
 '<meta property="og:url" content="'+url+'"><meta name="twitter:card" content="summary">',
 '<meta name="twitter:title" content="'+esc(title)+'"><meta name="twitter:description" content="'+esc(description)+'">',
 '<link rel="stylesheet" href="/assets/michigan-ski.css">',
 dataTag(json),'</head><body data-ski-page'+p+'>',
 '<a class="skip" href="#ski-main">Skip to ski decision</a>',
 '<header class="mast"><a href="/"><strong>Chris Izworski</strong></a><nav><a href="/michigan-ski-hills/">Michigan Ski Hills</a><a href="/michigan-snow-totals/">Snow Totals</a><a href="/utah-ski-access/">Utah Ski Access</a><a href="/tools/">All Tools</a></nav></header>',
 '<main id="ski-main" class="wrap"><div class="hero"><p class="eyebrow">Michigan ski decisions · 2026–27 season · NWS sources</p>',
 '<h1>'+esc(h1)+'</h1><p class="lede">'+esc(subtitle)+'</p>',
 '<p class="answer">A ski weekend is worth considering when snow, operating lifts, price, and travel fit your plans. This tool compares the evidence; it does not certify that any resort is open.</p>',
 '<p class="update" id="updated" aria-live="polite">Loading the latest official signals…</p></div>',
 content,
 '<footer class="foot"><p>Conditions and ski operations can change quickly. NWS forecast, nearby snow observations, active alerts and resort-reported operations are distinct sources. A warning is never a promise of powder or safe travel.</p>',
 '<p>Built by <a rel="author" href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a> · © 2026 Chris Izworski · <a href="/michigan-ski-hills/">Michigan Ski Hills</a> · <a href="https://www.weather.gov/">National Weather Service</a></p></footer></main>',
 '<script defer src="/assets/michigan-ski.js"></script><script defer src="/assets/michigan-ski-decision.js"></script></body></html>'
 ].join('\n');
}
function details(r){
 const label=r.kind==='nordic'?'Nordic trail conditions':'snow report';
 const h=r.name+' '+label+' 2026–27';
 const t=r.name+' Snow Report 2026–27 | Chris Izworski';
 const title=t.length<=60?t:(r.name+' Ski Conditions 2026–27').slice(0,60);
 const desc='Check '+r.name+' snow forecasts, lake-effect alerts, ticket links and travel from Detroit or Grand Rapids before planning a 2026–27 ski trip.';
 const area=r.region.replaceAll('-',' ');
 const minutes=(m)=>Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m';
 const wind=({'boyne-mountain':'Wind from the west-northwest has historically favored the Boyne Falls area.',
 'treetops':'West-northwest flow has historically favored the Gaylord snowbelt.',
 'shanty-creek':'Northwest flow has historically favored the Mancelona area.',
 'nubs-nob':'West-southwest flow has historically favored Harbor Springs.',
 'the-highlands':'West-southwest flow has historically favored Harbor Springs.',
 'mt-bohemia':'A northerly Lake Superior flow may favor the Keweenaw; local elevation can change totals.',
 'marquette-mountain':'Northerly Lake Superior flow can favor the southern shoreline; local bands vary sharply.',
 'porcupine-mountains':'Lake Superior snowbands and inland elevation can change conditions quickly.',
 'big-powderhorn':'Lake Superior snowbands vary across western Upper Michigan.',
 'snowriver':'Lake Superior snowbands vary across western Upper Michigan.'})[r.slug]||'There is no verified resort-specific wind-alignment sector in this tool; NWS forecast snowfall and local reports remain the basis.';
 const intro=r.kind==='nordic'?
 'Garland Lodge is included as an outdoor winter option, but is not ranked against downhill lift-served resorts. Confirm trail grooming and availability with the venue.':
 'This resort is evaluated by the same transparent Michigan weekend framework as other hills. Saturday and Sunday have separate NWS 4 PM-to-4 PM forecast windows, including freeze/thaw indicators. Official resort status is displayed only where a verifiable source can be parsed.';
 const html=[
 '<p class="breadcrumbs"><a href="/michigan-ski-hills/">All Michigan ski hills</a> / '+esc(r.name)+'</p>',
 '<section class="panel"><p class="eyebrow">Live resort comparison</p><h2>Is '+esc(r.name)+' worth the drive this weekend?</h2>',
 '<p>'+esc(intro)+'</p><div class="controls"><label>Compare from<select id="origin"><option value="detroit">Detroit metro</option><option value="grandRapids">Grand Rapids</option></select></label></div>',
 '<div id="hill-live" aria-live="polite"><p class="small">Requesting NWS snowfall grid and warning matches…</p></div></section>',
 '<div class="details-grid"><section class="panel"><h2>Why this mountain can be different</h2><p>'+esc(r.note)+'. '+esc(wind)+'</p>',
 '<p><strong>Drive-time planning:</strong> approximately '+minutes(r.driveMinutes.detroit)+' from Detroit metro, or '+minutes(r.driveMinutes.grandRapids)+' from Grand Rapids. These are baseline estimates, not live traffic or winter road guarantees.</p>',
 '<p><strong>Ticket planning:</strong> '+(r.adultDayPrice2026.sat?'Published day-session adult weekend reference: $'+r.adultDayPrice2026.sat+' Saturday; $'+(r.adultDayPrice2026.sun||r.adultDayPrice2026.sat)+' Sunday. Verify date and availability.':'Price varies or is not independently confirmed for a specific weekend. Do not assume a fixed ticket rate.')+'</p>',
 '<div class="source-links"><a href="'+esc(r.tickets)+'" rel="noopener noreferrer" target="_blank">Official tickets ↗</a><a href="'+esc(r.snow)+'" rel="noopener noreferrer" target="_blank">Official resort / conditions ↗</a></div></section>',
 '<section class="panel"><h2>How to interpret local lake-effect snow</h2>',
 '<p>Michigan lake-effect snow depends on wind direction, lake-air temperature contrast, fetch and the terrain downwind. Bands can move miles with subtle wind shifts. Forecast snowfall for a resort is not an on-mountain measurement.</p>',
 '<p>Use NWS point forecasts for expected snow, a resort report for base depth, and NWS local storm reports only as nearby evidence. If this page says “wind aligned,” it describes climatological potential, not proof of a powder day.</p>',
 '<p class="small"><a href="https://www.weather.gov/apx/les">NWS Gaylord lake-effect science</a> · <a href="https://www.weather.gov/dlh/lakesnow">NWS Lake Superior snowbelt science</a></p></section></div>',
 '<section class="panel faq"><h2>'+esc(r.name)+' ski weekend questions</h2>',
 '<details><summary>How much snow has '+esc(r.name)+' received in the last 24 hours?</summary><p>Nearby NWS local storm reports do not establish a resort-specific 24-hour snowfall amount; intervals differ by observer. Use the current resort report for resort-measured new snow. This page shows the observation distance and original time.</p></details>',
 '<details><summary>Does a lake-effect warning mean this mountain has fresh powder?</summary><p>No. NWS warnings may cover travel corridors or broad forecast zones. Check the mountain report and exact elevation; the warning can make travel hazardous.</p></details>',
 '<details><summary>How much is a lift ticket and will the hill be open?</summary><p>Prices and lift operation depend on the selected date. Follow the official ticket and mountain-report links above; the tool deliberately does not infer open lifts from snowfall.</p></details>',
 '<details><summary>Should I drive from Detroit or Grand Rapids?</summary><p>Compare planning drive estimates, active weather alerts, weekend snowfall forecast and published tickets. Check winter road conditions before leaving; the index never certifies driving safety.</p></details>',
 '</section><section class="panel"><h2>Compare nearby Michigan alternatives</h2><p>Lake-effect snow is unusually local. A nearby hill can have different weather, available lifts and pricing. <a href="/michigan-ski-hills/">Compare all 18 monitored destinations</a> using the same NWS data and selected starting city.</p></section>'
 ].join('');
 return pageShell({title,description:desc.slice(0,158),url:base+r.slug+'/',h1:h,subtitle:r.location+' · '+area+' · NWS snow forecast, lake-effect alerts and published resort sources.',content:html,slug:r.slug});
}
function index(){
 const url=base;
 const links=RESORTS.map(r=>'<li><a href="/michigan-ski-hills/'+r.slug+'/">'+esc(r.name)+'</a> — '+esc(r.location)+' ('+esc(r.region.replaceAll('-',' '))+')</li>').join('');
 const html=[
 '<section class="panel"><p class="eyebrow">01 / Lake-effect watch</p><h2>Where are the lake-effect alerts right now?</h2>',
 '<div id="lake-watch" aria-live="polite"><p class="small">Checking official NWS forecast zones and alert polygons…</p></div>',
 '<p class="note">Lake-effect alerts are an early warning of dangerous travel as well as possible snowfall. A matched alert does not prove that a resort received measurable snow. NWS forecast wind alignment is labeled separately from official warnings.</p>',
 '</section>',
 '<section class="panel decision-workspace" id="ski-decision"><p class="eyebrow">02 / Powder Chase + Worth the Drive</p><h2>Find your best ski-day candidate</h2>',
 '<p>Decide whether to chase forecast snow, take the family, save on tickets or ski close to home. NWS conditions inform the shortlist; official operating status and actual checkout prices remain separate checks.</p>',
 '<div class="controls decision-filters"><label>What matters most?<select id="ski-goal"><option value="powder">Fresh snow / powder potential</option><option value="family">Family &amp; beginner terrain</option><option value="value">Ticket &amp; drive value</option><option value="local">Shortest drive</option></select></label>',
 '<label>Which day?<select id="ski-day"><option value="saturday">Saturday</option><option value="sunday">Sunday</option></select></label>',
 '<label>Adults<select id="ski-adults"><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select></label>',
 '<label>Kids age 8 and under<select id="ski-kids"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>',
 '<label>Rentals needed<select id="ski-rentals"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label></div>',
 '<div id="ski-decision-results" aria-live="polite"><p class="small">Checking NWS snow windows and operating evidence…</p></div>',
 '<div class="trip-tool"><h3>Trip cost: compare two hills</h3><div id="ski-trip-cost"><p>Waiting for live source results…</p></div></div>',
 '<p class="small">Shortlist is an explanatory planning fit, not a guaranteed powder day, lift opening, road safety or ticket checkout price. Unverified price and travel inputs are never silently replaced with estimates.</p></section>',
'<section class="panel"><p class="eyebrow">03 / All monitored hills</p><h2>Michigan ski hills ranked by evidence and travel</h2>',
 '<p class="small">Composite 0–100 score is <strong>provisional</strong>: nearby storm reports (20), NWS weekend snow forecast (25), drive-time value (27), ticket value (14), and base depth if confirmed (14). An active winter warning suspends a resort’s rank instead of increasing its powder score. Saturday and Sunday snow outlooks use separate 4 PM-to-4 PM Michigan local-time intervals. Missing resort data gets no positive points; a high score is not proof of open lifts, good roads or available tickets.</p>',
 '<div class="controls"><label>Leaving from<select id="origin"><option value="detroit">Detroit metro</option><option value="grandRapids">Grand Rapids</option></select></label>',
 '<label>Region<select id="region"><option value="all">All Michigan</option><option value="southern-lower">Southern Lower</option><option value="northern-lower">Northern Lower</option><option value="central-up">Central Upper</option><option value="western-up">Western Upper</option></select></label></div>',
 '<p class="count" id="count">18 destinations · 17 downhill ski areas and one Nordic center</p>',
 '<div id="resort-list" class="ranking" aria-live="polite"><p>Requesting NWS conditions…</p></div></section>',
 '<section class="panel"><h2>All 18 mountain and winter-ski pages</h2><p>Each destination has its own forecast coordinates, matching NWS zones, ticket link, terrain context and travel comparisons.</p><ul>'+links+'</ul></section>',
 '<section class="panel faq"><h2>Michigan ski and lake-effect questions</h2>',
 '<details><summary>Where is Michigan getting lake-effect snow right now?</summary><p>Active NWS warning zones show where hazardous lake-effect conditions are expected or occurring. Actual snowfall observations are a different evidence layer, and ski-base depth must come from the resort.</p></details>',
 '<details><summary>Which Michigan ski resort has the most new snow?</summary><p>Resort-reported 24-hour snow depth is not uniformly available in a documented public API. We show nearby NWS reports with their distance and original reporting period, never relabeling a storm total as a 24-hour resort total.</p></details>',
 '<details><summary>Does every ski hill benefit from Lake Michigan or Lake Superior snow?</summary><p>No. Wind direction, lake-air temperature contrast, fetch, topography and distance inland matter. The NWS Gaylord wind-sector climatology favors Mancelona with northwest flow and the Boyne Falls area with west-northwest flow, but no single direction guarantees fresh snow on a hill.</p></details>',
 '<details><summary>Is the highest-ranked resort guaranteed to be worth the drive?</summary><p>No. The index helps prioritize a shortlist. Off-season, uncertain base depth, variable lift tickets and unknown opening information can make any rank provisional. Always verify operating lifts, weather hazards and official pricing.</p></details></section>'
 ].join('');
 return pageShell({title:'Michigan Ski Hills 2026–27: Snow & Drive | Chris Izworski',description:'Compare 18 Michigan ski destinations by NWS snow forecasts, lake-effect alerts, drive time, and adult ticket evidence for the 2026–27 season.',url,h1:'Michigan ski hills: worth the drive this weekend?',subtitle:'See where lake-effect snow may matter, then compare official forecasts, nearby reported snowfall, price and driving distance for 18 destinations.',content:html});
}
const dry=process.argv.includes('--check');
function produce(file,content){
 if(dry){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==content)throw Error('Missing or outdated output: '+file);}
 else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);}
}
produce('public/michigan-ski-hills/index.html',index());
for(const r of RESORTS)produce('public/michigan-ski-hills/'+r.slug+'/index.html',details(r));
const sitemap='public/sitemap.xml';
let xml=fs.readFileSync(sitemap,'utf8');
const urls=[base,...RESORTS.map(r=>base+r.slug+'/')];
for(const url of urls){
 if(xml.includes('<loc>'+url+'</loc>'))continue;
 xml=xml.replace('</urlset>','  <url><loc>'+url+'</loc><lastmod>'+today+'</lastmod><changefreq>daily</changefreq><priority>'+ (url===base?'0.8':'0.6')+'</priority></url>\n</urlset>');
}
if(dry){if(fs.readFileSync(sitemap,'utf8')!==xml)throw Error('Sitemap out of date');}
else fs.writeFileSync(sitemap,xml);
console.log('Michigan ski: '+urls.length+' pages, canonical and sitemap entries '+(dry?'verified':'generated'));
