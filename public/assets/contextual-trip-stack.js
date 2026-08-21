(()=>{
'use strict';
window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};
const path=window.location.pathname.replace(/\/+$/,'')||'/';
const DEST={
  aurora:{label:'Northern lights tonight',detail:'Check whether an evening aurora chase is worth adding.',href:'/northern-lights-michigan/'},
  bridge:{label:'Mackinac Bridge conditions',detail:'Check the crossing before a U.P. or Straits trip.',href:'/mackinac-bridge-live/'},
  border:{label:'U.S.–Canada border wait times',detail:'Check current Michigan–Ontario crossing waits before the international legs.',href:'/michigan-border-wait-times/'},
  soo:{label:'Soo Locks ships today',detail:'Add live vessel activity to an eastern U.P. trip.',href:'/soo-locks/'},
  pictured:{label:'Pictured Rocks planner',detail:'Choose boat, kayak, hike or drive near Munising.',href:'https://picturedrocks.chrisizworski.com/'},
  circle:{label:'Lake Superior Circle Tour',detail:'Turn the color stop into a longer Lake Superior route.',href:'/lake-superior-circle-tour/'},
  wine:{label:'Traverse City wine planner',detail:'Build a Leelanau or Old Mission fall-color day.',href:'https://tcwine.chrisizworski.com/'},
  outdoors:{label:'Michigan Outdoors Now',detail:'Compare the best outdoor plans for current conditions.',href:'https://michiganoutdoorsnow.chrisizworski.com/'},
  weekend:{label:'Michigan Outdoor Weekend',detail:'Route a full weekend into outdoor tools and campsites.',href:'https://weekend.chrisizworski.com/'},
  ausable:{label:'Au Sable Field Map',detail:'Access, camps, live river conditions and float planning.',href:'https://ausable.chrisizworski.com/'},
  manistee:{label:'Manistee River Field Map',detail:'Access, camps, live gauges and river trip planning.',href:'/manistee-river-map/'},
  trout:{label:'Michigan Trout Report',detail:'Check live flow, temperature and today’s fishing read.',href:'https://michigantroutreport.com/'},
  salmon:{label:'Salmon & steelhead run tracker',detail:'Check run timing and live conditions on major rivers.',href:'https://michigantroutreport.com/salmon-run/'},
  birding:{label:'Michigan Birding Report',detail:'See live sightings and nearby hotspots.',href:'https://michiganbirdingreport.com/'},
  saginaw:{label:'Saginaw Bay Report',detail:'Check wind, lee shore and current bay conditions.',href:'https://saginawbay.chrisizworski.com/'},
  whitetail:{label:'Michigan Whitetail Report',detail:'Check corn harvest, rut timing and live deer movement conditions.',href:'https://whitetail.chrisizworski.com/'},
  beaches:{label:'Michigan Beach Report',detail:'Check beach hazards, lake observations and notices.',href:'/great-lakes-beaches/'},
  buoys:{label:'Great Lakes buoy conditions',detail:'Check live wind, waves and nearby Lake Michigan conditions.',href:'/great-lakes-buoys/'},
  fall:{label:'Michigan fall color',detail:'Check current color timing before choosing the river day.',href:'/fall-color/'},
  tools:{label:'All Michigan tools',detail:'Browse the full Michigan and Great Lakes tool network.',href:'/tools/'}
};
const REGION={
  wup:{title:'Build the rest of a western U.P. trip',keys:['aurora','circle','pictured','weekend']},
  eup:{title:'Build the rest of an eastern U.P. trip',keys:['bridge','soo','pictured','aurora']},
  tip:{title:'Build the rest of a Straits trip',keys:['bridge','aurora','weekend','outdoors']},
  nwl:{title:'Build the rest of a northwest Michigan trip',keys:['wine','outdoors','aurora','weekend']},
  nel:{title:'Build the rest of a northeast Michigan trip',keys:['ausable','manistee','trout','aurora']},
  cen:{title:'Build the rest of a central Michigan trip',keys:['saginaw','birding','whitetail','outdoors','weekend']},
  swl:{title:'Build the rest of a west Michigan trip',keys:['beaches','birding','outdoors','weekend']},
  sel:{title:'Build the rest of a southeast Michigan trip',keys:['birding','outdoors','weekend','tools']},
  generic:{title:'Build the rest of the Michigan trip',keys:['aurora','bridge','outdoors','weekend']}
};
const ROUTE_REGION={
  '/fall-color/porcupine-mountains-fall-color':'wup',
  '/fall-color/keweenaw-peninsula-fall-color':'wup',
  '/fall-color/upper-peninsula-fall-color':'wup',
  '/fall-color/tahquamenon-falls-fall-color':'eup',
  '/fall-color/mackinac-island-fall-color':'tip',
  '/fall-color/tunnel-of-trees-fall-color':'tip',
  '/fall-color/sleeping-bear-dunes-fall-color':'nwl',
  '/fall-color/au-sable-river-fall-color':'nel',
  '/fall-color/ann-arbor-irish-hills-fall-color':'sel'
};
const MANISTEE={title:'More for this river trip',keys:['trout','salmon','ausable','weekend']};
const CIRCLE={title:'Before the next Circle Tour leg',keys:['border','soo','pictured','aurora']};
const EXPERIMENT_ID='fall-river-window-v1';
function style(){if(document.getElementById('contextual-trip-stack-style'))return;const s=document.createElement('style');s.id='contextual-trip-stack-style';s.textContent=`.contextual-trip-stack{max-width:980px;margin:24px auto;padding:18px;border:1px solid #d8cdb9;border-radius:14px;background:#fffaf1}.contextual-trip-stack h2{font-size:1.1rem;margin:0 0 4px}.contextual-trip-stack>p{margin:0 0 12px;font-size:.9rem;opacity:.75}.contextual-trip-stack__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:9px}.contextual-trip-stack a{display:block;border:1px solid #ddd2c0;border-radius:11px;padding:12px;text-decoration:none;background:#fff;color:inherit}.contextual-trip-stack a strong{display:block;margin-bottom:3px}.contextual-trip-stack a span{display:block;font-size:.8rem;line-height:1.35;opacity:.72}.contextual-trip-stack a:hover,.contextual-trip-stack a:focus{border-color:#8f6a42}.contextual-trip-stack a:focus-visible{outline:2px solid #2764a8;outline-offset:2px}.contextual-trip-stack--experiment{border-style:dashed}.contextual-trip-stack__eyebrow{font:700 .7rem/1.2 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;opacity:.62;margin-bottom:5px}`;document.head.appendChild(s)}
function cards(keys,surface,experiment=''){return keys.map(key=>{const d=DEST[key];return `<a href="${d.href}" data-trip-stack-link="${key}" data-trip-stack-surface="${surface}"${experiment?` data-network-experiment="${experiment}"`:''}><strong>${d.label}</strong><span>${d.detail}</span></a>`}).join('')}
function html(cfg,surface){return `<h2>${cfg.title}</h2><p>One trip, a few useful checks.</p><div class="contextual-trip-stack__grid">${cards(cfg.keys,surface)}</div>`}
function insertHost(host){
  if(path==='/manistee-river-map'){const footer=document.querySelector('.footer');if(footer?.parentNode)footer.parentNode.insertBefore(host,footer);else document.querySelector('main')?.appendChild(host);return}
  if(path==='/lake-superior-circle-tour'){const anchor=document.querySelector('.planning-box')||document.querySelector('#circle-tour-itineraries');if(anchor?.parentNode){anchor.parentNode.insertBefore(host,anchor.nextSibling);return}}
  const main=document.querySelector('main')||document.querySelector('.wrap')||document.body;main?.appendChild(host)
}
function mount(cfg,surface){style();let host=document.querySelector(`[data-contextual-trip-stack="${surface}"]`);if(host){host.classList.add('contextual-trip-stack');host.innerHTML=html(cfg,surface);return host}host=document.createElement('section');host.className='contextual-trip-stack';host.dataset.contextualTripStack=surface;host.setAttribute('aria-label',cfg.title);host.innerHTML=html(cfg,surface);insertHost(host);return host}
function emit(name,data){try{window.va('event',{name,data})}catch{}}
function mountFallRiverExperiment(surface){
  if(document.querySelector(`[data-network-experiment-host="${EXPERIMENT_ID}"]`))return;
  style();
  const host=document.createElement('section');
  host.className='contextual-trip-stack contextual-trip-stack--experiment';
  host.dataset.networkExperimentHost=EXPERIMENT_ID;
  host.setAttribute('aria-label','Fall river paddle window');
  const keys=path==='/manistee-river-map'?['fall','ausable','buoys']:['ausable','manistee','buoys'];
  host.innerHTML=`<div class="contextual-trip-stack__eyebrow">Fall + river</div><h2>Find a fall river paddle window</h2><p>Pair color timing with river and lake conditions before you pick the day.</p><div class="contextual-trip-stack__grid">${cards(keys,surface,EXPERIMENT_ID)}</div>`;
  insertHost(host);
  emit('Network Experiment Exposure',{experiment:EXPERIMENT_ID,source:path,surface});
}
function fallRegion(){return document.documentElement.dataset.fallBestRegion||ROUTE_REGION[path]||'generic'}
function renderFall(){mount(REGION[fallRegion()]||REGION.generic,path==='/fall-color/this-weekend'?'fall-weekend':'fall-route')}
if(path==='/manistee-river-map'){
  mount(MANISTEE,'manistee');
  mountFallRiverExperiment('manistee');
}else if(path==='/lake-superior-circle-tour'){
  mount(CIRCLE,'circle-tour');
  emit('Network Amplification Exposure',{source:'circle-tour',surface:'circle-tour',destinations:CIRCLE.keys.join(',')});
}else if(path==='/fall-color'||path.startsWith('/fall-color/')){
  renderFall();
  if(path==='/fall-color')mountFallRiverExperiment('fall-color');
  if(path==='/fall-color/this-weekend')mountFallRiverExperiment('fall-weekend');
}
window.addEventListener('fall-weekend-ranked',e=>{const id=e.detail?.bestId;if(!REGION[id])return;document.documentElement.dataset.fallBestRegion=id;mount(REGION[id],'fall-weekend')});
document.addEventListener('click',e=>{const a=e.target.closest('[data-trip-stack-link]');if(!a)return;const destination=a.dataset.tripStackLink||'unknown';const surface=a.dataset.tripStackSurface||'unknown';const experiment=a.dataset.networkExperiment||'';emit('Contextual Tool Handoff',{source:path,destination,surface,experiment:experiment||'none'});if(experiment)emit('Network Experiment Handoff',{experiment,source:path,destination,surface})});
})();
