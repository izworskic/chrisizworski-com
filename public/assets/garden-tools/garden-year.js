/* A Michigan garden year: local climate context, seasonal field notes and a packet-based fall calculation. */
(function(root){
'use strict';
var SEASONS={
 winter:{name:'Winter',months:'December – February',heading:'The garden is quiet. The planning can begin.',copy:'Pull out last year’s notes and think about what you loved eating, what crowded its neighbors, and what you would grow again. A seed catalog is more fun with a little room left for an experiment.',jobs:['Sketch the beds and leave room for paths, supports and perennial plants.','Check seed packets for days to maturity and order the varieties you want.','Make a seed-starting plan around your local spring frost reference.'],link:'/seed-starting-guide/',action:'Plan your seed starting'},
 spring:{name:'Spring',months:'March – May',heading:'Start with the soil, then let the season unfold.',copy:'The first warm afternoon can make a gardener reach for a shovel. If a handful of soil is still sticky or frozen, give the bed more time. Hardy crops and tender transplants have very different ideas about spring.',jobs:['Check the soil before working it; wet soil compacts easily.','Start or harden off transplants, depending on your station and packet.','Keep an eye on the actual forecast before setting tender plants outside.'],link:'/michigan-soil-temperature/',action:'Check a nearby soil station'},
 summer:{name:'Summer',months:'June – August',heading:'There is still time to make the garden work harder.',copy:'Harvest what is ready, keep an eye on water and pests, and notice where a row has opened up. Those empty spaces can become a second planting, but start planning the fall garden before the summer heat is gone.',jobs:['Pick regularly and keep notes on what is producing well.','Check the seed packet and local frost reference before sowing a fall crop.','Give new seedlings extra attention during hot, dry weather.'],link:'/national-tools/planting/cover-crops/',action:'Explore cover crops'},
 fall:{name:'Fall',months:'September – November',heading:'The harvest winds down, but the next garden is already beginning.',copy:'Gather what is ready, pay attention to the forecast and make room for garlic. A little time with the beds and your notes now will make next spring feel much closer.',jobs:['Protect or harvest tender crops when frost is forecast.','Plan garlic for three to five weeks before a hard freeze settles in.','Put away tools, review the season and consider a soil test.'],link:'/national-tools/planting/garlic/',action:'Explore fall garlic'}
};
function seasonForMonth(n){return n===12||n<=2?'winter':n<=5?'spring':n<=8?'summer':'fall';}
function fallTarget(year, md, maturity, buffer){
 if(!md || !Number.isInteger(maturity)||maturity<1||maturity>365||!Number.isInteger(buffer)||buffer<0||buffer>60)return null;
 var m=/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2})$/.exec(md);if(!m)return null;
 var mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[1]);
 var dt=new Date(Date.UTC(year,mo,Number(m[2])));dt.setUTCDate(dt.getUTCDate()-maturity-buffer);return dt.toISOString().slice(0,10);
}
function mount(opts){
 var el=function(id){return document.getElementById(id)}, K=opts.kit, current=seasonForMonth(Number(opts.today.iso.slice(5,7))), selected=current, station=null;
 var buttons=Array.prototype.slice.call(document.querySelectorAll('[data-garden-season]'));
 function paint(){var x=SEASONS[selected];buttons.forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-garden-season')===selected));});el('gySeasonName').textContent=x.months+(selected===current?' · Your current season':' · Planning ahead');el('gyHeading').textContent=x.heading;el('gyCopy').textContent=x.copy;el('gyJobs').replaceChildren.apply(el('gyJobs'),x.jobs.map(function(j){return K.h('li',null,j)}));el('gyLink').href=x.link;el('gyLink').textContent=x.action+' →';}
 function calculate(){var out=el('gyResult'), raw=el('gyMaturity').value, b=el('gyBuffer').value;
  if(!station){out.textContent='Choose a Michigan town above to use a frost station.';return;}
  var f=opts.engine.frostOf(station);if(!f.fallText){out.textContent='A sourced typical fall frost date is not available for the '+station.n+' station. Use a locally sourced frost date and count back from that instead.';return;}
  if(raw===''||b===''){out.textContent='Enter your packet’s days to maturity and a buffer to make a planning estimate.';return;}
  var yr=Number(opts.today.iso.slice(0,4)), date=fallTarget(yr,f.fallText,Number(raw),Number(b));
  if(!date){out.textContent='Use 1–365 days to maturity and a buffer from 0–60 days.';return;}
  var d=new Date(date+'T12:00:00Z');var human=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(d);
  out.textContent='Working backward from '+station.n+'’s typical first fall frost of '+f.fallText+', your planning date is '+human+'. '+(date < opts.today.iso ? 'That date has passed this year; check your crop and local conditions before deciding what still fits. ' : 'Use it as a starting point for your plan. ')+'This is an estimate, not a last safe planting date or harvest forecast. Packet timing, germination, weather and frost tolerance vary; your '+b+'-day buffer is your choice.';
 }
 buttons.forEach(function(b){b.addEventListener('click',function(){selected=b.getAttribute('data-garden-season');paint()})});
 ['gyMaturity','gyBuffer'].forEach(function(id){el(id).addEventListener('input',calculate)});
 paint();return {render:function(st){station=st;calculate()}};
}
root.GardenYear={mount:mount,fallTarget:fallTarget,seasonForMonth:seasonForMonth};if(typeof module!=='undefined'&&module.exports)module.exports=root.GardenYear;
})(typeof window!=='undefined'?window:globalThis);
