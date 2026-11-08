// Post-generation enhancement: preserve the original educational Seaway build,
// then give the corridor hub an intent-led, accessible journey through five regions.
import fs from 'node:fs';

const file='public/st-lawrence-seaway/index.html';
const places=JSON.parse(fs.readFileSync('data/seaway/places.json','utf8'));
let html=fs.readFileSync(file,'utf8');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function replaceOnce(before,after){
  const count=html.split(before).length-1;
  if(count!==1)throw new Error('Seaway journey generator drift: expected one anchor, found '+count+' for '+before.slice(0,70));
  html=html.replace(before,after);
}

const summaries={
  montreal:'The voyage enters the engineered channel at Saint-Lambert and Côte-Sainte-Catherine.',
  beauharnois:'Two water elevators bring ships toward Lake St. Francis.',
  massena:'Snell and Eisenhower: the U.S. pair and documented public observation decks.',
  iroquois:'A variable adjustment in water level and a documented public riverbank viewing area.',
  'thousand-islands':'Beyond the locks, the river opens toward Lake Ontario and the Welland connection.'
};
const steps=places.regions.map((r,i)=>'<li><a class="journey-stop" data-journey-region="'+esc(r.id)+'" href="?region='+encodeURIComponent(r.id)+'#ship-watch"><span class="journey-step">0'+(i+1)+'</span><strong>'+esc(r.name)+'</strong><span class="journey-summary">'+esc(summaries[r.id])+'</span><span class="journey-live" data-region-count="'+esc(r.id)+'">Check recent reports →</span></a></li>').join('');
const journey='<section id="journey" class="journey-primer" aria-labelledby="journey-title">'+
'<p class="eyebrow">Five river chapters · one connected voyage</p><h2 id="journey-title">Where is the ship in its journey?</h2>'+
'<p>Follow the five stretches between Montreal and Lake Ontario and the <strong>seven locks</strong> connecting them. A ship report shows where a receiver heard the vessel, not the vessel\'s entire itinerary. Pick a chapter to examine its recent signals, explore a lock, or find a documented public watching place.</p>'+
'<nav aria-label="Follow the river from Montreal to Lake Ontario"><ol class="journey-rail">'+steps+'</ol></nav>'+
'<p class="journey-next">Looking for a close-up? <a href="/eisenhower-lock/">Visit Eisenhower Lock</a> or <a href="#viewing-plan">choose a verified public viewpoint</a>. Follow the passage west into the <a href="/welland-canal/">Welland Canal</a>, the <a href="/soo-locks/">Soo Locks</a> and the <a href="/great-lakes-freighter-tracking/">Great Lakes ship tracker</a>.</p>'+
'<p class="fine">This interactive map covers the Montreal–Lake Ontario section, not the entire Great Lakes–St. Lawrence system. Map regions and lock markers are not verified public entrances. All live positions depend on participating AIS receivers.</p></section>';

replaceOnce('<div class="wrap"><section class="station" id="ship-watch"','<div class="wrap">'+journey+'<section class="station" id="ship-watch"');
replaceOnce('<div class="link-row"><a href="#ship-watch">Find ships & viewing spots ↓</a><a href="#lock-lab">Explore a lock ↓</a></div>',
'<div class="link-row"><a href="#ship-watch">Find recent ships ↓</a><a href="#viewing-plan">Choose a shore viewpoint ↓</a><a href="#journey">Follow the voyage ↓</a></div>');
// Metadata is generated once from data/seaway/search-surface.json, never rewritten here.
const searchSurface=JSON.parse(fs.readFileSync('data/seaway/search-surface.json','utf8'));
const hubSeo=searchSurface['st-lawrence-seaway'];
if(!html.includes('<title>'+esc(hubSeo.title)+'</title>') ||
   !html.includes('<meta name="description" content="'+esc(hubSeo.description)+'">') ||
   !html.includes('"dateModified":"'+hubSeo.dateModified+'"')) {
  throw new Error('Seaway journey search metadata drift from canonical source');
}
replaceOnce('Follow the ships. Understand the journey.','Follow the voyage, one river chapter at a time.');
replaceOnce('How does a floating ship climb inland? One roomful of water at a time. Follow recent ship reports, choose a public place to watch, then try the lock model to see how gates, valves and gravity turn a river journey into a staircase.',
'Where was that freighter last reported? Which locks connect it to the Great Lakes? Where can you legally watch from shore? Explore the Montreal–Lake Ontario passage, then follow the voyage into Welland and beyond. Recent AIS positions are observations, not promised arrival times.');
// Assets keep their version in scripts/generate-seaway.mjs for both canonical pages.
if(!html.includes('id="journey"')||!html.includes('data-region-count="massena"'))throw new Error('Seaway journey enhancement not generated');
// Python Intelligence OS: read a versioned and independently checked BTS
// artifact. Vercel does NOT execute Python or fetch new data at request time.
const fieldbook=JSON.parse(fs.readFileSync('public/assets/seaway-seasonal-fieldbook.json','utf8'));
if(fieldbook.schema!=='seaway-seasonal-fieldbook-v1'||fieldbook.months?.length!==12
   ||fieldbook.months.some((m,i)=>m.month!==i+1||!['available','partial','unreported'].includes(m.state))){
  throw new Error('Invalid Seaway seasonal fieldbook contract');
}
const monthsShort=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const maxMedian=Math.max(1,...fieldbook.months.filter(m=>m.median!==null).map(m=>m.median));
const monthButtons=fieldbook.months.map(m=>{
  const scale=m.median===null?0:Math.round(m.median/maxMedian*100);
  const indicator=m.state==='available'?esc(String(m.median)):'—';
  const label=m.name+': '+(m.state==='available'?m.median+' median monthly transits across '+m.sampleCount+' historical years':'no comparable monthly total in this archive');
  return '<button class="seasonal-month" type="button" data-seaway-month="'+m.month+'" aria-pressed="false" aria-label="'+esc(label)+'">'+
    '<span class="seasonal-month-label">'+monthsShort[m.month-1]+'</span>'+
    '<span class="seasonal-month-gauge" aria-hidden="true"><span style="height:'+scale+'%"></span></span>'+
    '<span class="seasonal-month-value">'+indicator+'</span></button>';
}).join('');
const monthRows=fieldbook.months.map(m=>'<tr><th scope="row">'+esc(m.name)+'</th><td>'+
    (m.median===null?'Not established':m.median)+'</td><td>'+
    (m.minimum===null?'Not reported':m.minimum+'–'+m.maximum)+'</td><td>'+
    m.sampleCount+'/'+fieldbook.years.length+'</td></tr>').join('');
const seasonalDesk='<section class="editorial seaway-seasonal-desk" id="seaway-seasonal-lens" aria-labelledby="seaway-seasonal-title">'+
'<p class="eyebrow">The seasonal passage · Python-checked historical fieldbook</p>'+
'<h2 id="seaway-seasonal-title">When has the Seaway been busiest?</h2>'+
'<p>Visitors planning a trip have two clocks: monthly shipping activity and whether a public viewing area is accessible. Choose a month to compare <strong>observed monthly system-wide vessel transits from 2022–2024</strong>. The range shows how much those years differed. This is not a prediction of ships at an individual lock or a recommended visit date.</p>'+
'<div class="seasonal-months" role="group" aria-label="Choose a calendar month for historical shipping patterns">'+monthButtons+'</div>'+
'<p class="seasonal-swipe-hint">On a phone, swipe this row sideways to explore all twelve months.</p>'+
'<div class="seasonal-reading" id="seawaySeasonalReadout" role="status" aria-live="polite"><strong>Select a month to read the historical evidence.</strong><p>Missing monthly values remain unreported. The historical table is available below without JavaScript.</p></div>'+
'<div class="seasonal-visit-bridge"><strong>Want to turn the history into a real visit?</strong> Check <a data-seasonal-destination="eisenhower" href="/eisenhower-lock/">Eisenhower’s documented public viewing guide</a>, <a data-seasonal-destination="operator_hours" href="https://www.seaway.dot.gov/explore/seaway-visitor-center" target="_blank" rel="noopener noreferrer">operator visitor hours</a>, <a data-seasonal-destination="official_queue" href="'+esc(places.officialQueue)+'" target="_blank" rel="noopener noreferrer">official vessel order of turn</a>, and <a data-seasonal-destination="seaway_notices" href="https://greatlakes-seaway.com/en/news-and-information/notices/seaway-notices/" target="_blank" rel="noopener noreferrer">current Seaway notices</a> independently. More monthly transits do not guarantee a ship will be visible when you arrive.</div>'+
'<p class="seasonal-next-tools">Prefer watching ships move? <a data-seasonal-destination="ship_watch" href="#ship-watch">Return to recent Seaway ship reports</a>, or <a data-seasonal-destination="welland" href="/welland-canal/">continue inland to Welland Canal’s ships and locks</a>.</p>'+
'<details><summary>Read the 2022–2024 comparison as a table</summary><div class="table-scroll"><table><thead><tr><th>Calendar month</th><th>Median transits</th><th>Observed min–max</th><th>Years reporting</th></tr></thead><tbody>'+monthRows+'</tbody></table></div></details>'+
'<p class="fine">Source: <a href="'+esc(fieldbook.sourceMetadata)+'">U.S. Bureau of Transportation Statistics, Great Lakes–St. Lawrence Seaway Performance</a> (public-domain federal data). Archive retrieved '+esc(fieldbook.snapshotRetrievedAt)+'. Only three historical years; no inference about tomorrow, exact passages, individual vessels or this season’s opening dates. January–March are annotated closed in the archived source; actual annual opening and closing dates vary.</p>'+
'<script type="application/json" id="seawaySeasonalData">'+JSON.stringify(fieldbook).replace(/</g,'\\u003c')+'</script>'+
'</section>';
replaceOnce('<section class="editorial resources">',seasonalDesk+'<section class="editorial resources">');

// Keep the measurement script next to the Seaway UI, without a new data API.
const funnelAnchor='<script defer src="/assets/seaway.js?v=20261108g"></script>';
replaceOnce(funnelAnchor,funnelAnchor+'<script defer src="/assets/seaway-seasonal-funnel.js?v=20261105a"></script>');
// Experience Foundry pilot 02: a selected-vessel passage desk directly below
// the map + ship list. The panel stays hidden until a real AIS report is chosen.
// Do not put it above the map or inside an ad/Leaflet overlay.
const followFreighter='<section class="follow-panel" id="followFreighter" aria-labelledby="followFreighterTitle" data-has-ship="false" hidden>'+
'<p class="follow-kicker">After choosing a ship · an individual river story</p>'+
'<h2 id="followFreighterTitle" tabindex="-1">Follow the Freighter</h2>'+
'<p class="follow-intro-copy">From the selected AIS radio report, explore the documented river chapter, locks within it, and verified public viewpoints. Other stretches are a geographic guide, not that ship\'s confirmed route.</p>'+
'<p class="follow-status" id="followFreighterStatus" role="status" aria-live="polite"></p>'+
'<div id="followFreighterContent"></div></section>';
replaceOnce('<div id="regionReports" class="region-reports"',followFreighter+'<div id="regionReports" class="region-reports"');
replaceOnce('<p id="shipAttribution" class="fine">','<button id="followSelectedShip" type="button" class="button follow-list-button" aria-controls="followFreighter" hidden>Follow the selected ship\'s journey ↓</button><p id="shipAttribution" class="fine">');
replaceOnce('<link rel="stylesheet" href="/assets/seaway.css?v=20261108f">','<link rel="stylesheet" href="/assets/seaway.css?v=20261108f"><link rel="stylesheet" href="/assets/seaway-follow.css?v=20261108a">');
// The follow module loads first, then mounts inside the existing live AIS UI.
replaceOnce('<script defer src="/assets/seaway.js?v=20261108g"></script>','<script defer src="/assets/seaway-follow.js?v=20261108a"></script><script defer src="/assets/seaway.js?v=20261108g"></script>');
if(!html.includes('id="followFreighter"')||!html.includes('aria-controls="followFreighter"'))throw new Error('Follow the Freighter generation missing');

fs.writeFileSync(file,html);
console.log('Seaway corridor journey enhancement applied');
