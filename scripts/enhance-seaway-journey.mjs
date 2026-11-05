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
const oldTitle='St. Lawrence Seaway Ship Tracker | Chris Izworski';
const newTitle='St. Lawrence Seaway Ships & Locks | Chris Izworski';
const oldDescription='Find recent Seaway ships, explore seven locks, compare public viewing spots and see how ships climb inland. Includes Eisenhower and official transit links.';
const newDescription='See recent Seaway ship reports, explore the Montreal–Lake Ontario lock map, choose verified public viewing spots and check official transit sources.';
html=html.replaceAll(oldTitle,newTitle).replaceAll(oldDescription,newDescription);
replaceOnce('Follow the ships. Understand the journey.','Follow the voyage, one river chapter at a time.');
replaceOnce('How does a floating ship climb inland? One roomful of water at a time. Follow recent ship reports, choose a public place to watch, then try the lock model to see how gates, valves and gravity turn a river journey into a staircase.',
'Where was that freighter last reported? Which locks connect it to the Great Lakes? Where can you legally watch from shore? Explore the Montreal–Lake Ontario passage, then follow the voyage into Welland and beyond. Recent AIS positions are observations, not promised arrival times.');
html=html.replace('dateModified":"2026-10-24','dateModified":"2026-11-05');
html=html.replaceAll('/assets/seaway.css?v=20261024b','/assets/seaway.css?v=20261105a')
  .replaceAll('/assets/seaway-core.js?v=20261024c','/assets/seaway-core.js?v=20261105a')
  .replaceAll('/assets/seaway.js?v=20261024c','/assets/seaway.js?v=20261105a');
if(!html.includes('id="journey"')||!html.includes('data-region-count="massena"'))throw new Error('Seaway journey enhancement not generated');
fs.writeFileSync(file,html);
console.log('Seaway corridor journey enhancement applied');
