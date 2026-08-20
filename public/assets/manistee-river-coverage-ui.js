(()=>{
'use strict';
const D=window.MANISTEE_FIELD_DATA;if(!D)return;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt',"'":'&#39;','"':'&quot;'}[c]));
function label(kind){return String(kind||'service').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());}
function directions(p){const q=encodeURIComponent(`${p.lat},${p.lon}`);return `https://www.google.com/maps/dir/?api=1&destination=${q}`;}
function styles(){if($('#manistee-coverage-styles'))return;const s=document.createElement('style');s.id='manistee-coverage-styles';s.textContent=`
#panel-places>.lede{margin:0 0 8px;font-size:12px;line-height:1.35}#panel-places>.eyebrow+h2{margin:5px 0 5px}
.place-row>.trust-agency,.place-row>.trust-mapped-agency-site,.place-row>.trust-community-verified,#place-detail .trust-agency,#place-detail .trust-mapped-agency-site,#place-detail .trust-community-verified{display:none!important}
.mc-place-card{display:grid;grid-template-columns:minmax(0,1fr) 88px;gap:6px;align-items:stretch}.mc-place-card .place-row{min-width:0}.mc-google-directions{display:flex;align-items:center;justify-content:center;text-align:center;border:1px solid #0d5c63;border-radius:8px;padding:6px 7px;background:#0d5c63;color:#fff;text-decoration:none;font-size:10px;font-weight:800;line-height:1.2}.mc-google-directions:hover,.mc-google-directions:focus{background:#173a34;color:#fff}.mc-google-directions:focus-visible{outline:2px solid #2764a8;outline-offset:2px}
.manistee-coverage-tools{display:grid;gap:8px;margin:12px 0}.manistee-coverage-tools details{border:1px solid #ddd9cf;border-radius:9px;background:#fff}.manistee-coverage-tools summary{cursor:pointer;padding:10px 12px;font-size:12px;font-weight:800;color:#29463d}.mc-dir{padding:0 10px 10px;display:grid;gap:6px}.mc-dir-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:9px 2px;border-top:1px solid #eeeae1}.mc-dir-row strong{font-size:12px}.mc-dir-row small{display:block;color:#68736e;font-size:10px;line-height:1.4;margin-top:2px}.mc-dir-row a{font-size:10px;font-weight:800;white-space:nowrap}.mc-pill{display:inline-block;margin:3px 4px 0 0;padding:3px 6px;border-radius:999px;background:#eef2ef;color:#53615b;font-size:9px;text-transform:uppercase}
@media(max-width:560px){.mc-place-card{grid-template-columns:minmax(0,1fr) 76px}.mc-google-directions{font-size:9px;padding:5px}.mc-dir-row{grid-template-columns:1fr}.mc-dir-row a{justify-self:start}}
`;document.head.appendChild(s);}
function crispPanels(){
  const places=$('#panel-places');if(places){const h2=$('h2',places),lede=$('.lede',places);if(h2)h2.textContent='Access & places';if(lede)lede.textContent='Put-ins, takeouts, camps, trails and services.';}
  const plan=$('#panel-plan');if(plan){const eye=$('.eyebrow',plan),h2=$('h2',plan),lede=$('.lede',plan),callout=$('.callout',plan);if(eye)eye.textContent='Trip planner';if(h2)h2.textContent='Plan a float';if(lede)lede.textContent='Choose a put-in and takeout for river mileage and estimated time.';if(callout){const strong=$('strong',callout),p=$('p',callout);if(strong)strong.textContent='Trip estimate';if(p)p.textContent='Add time for fishing, wind, logs, portages, dam operations and stops.';}}
  const river=$('#panel-river');if(river){const eye=$('.eyebrow',river),lede=$('.lede',river),notice=$('.notice',river);if(eye)eye.textContent='Live gauges';if(lede)lede.textContent='USGS flow, stage and temperature at four Manistee gauges plus the Pine River.';if(notice)notice.textContent='Trout temperature: 65–67.9°F caution; 68°F+ thermal-stress range.';}
  const guide=$('#panel-guide');if(guide){const note=$('.source-note',guide);if(note)note.textContent='Little Manistee is shown as a companion river because it enters Manistee Lake separately.';}
}
function crispGuide(){
  const field=$('#field-guide');if(!field)return;
  const intro=$(':scope>p',field);if(intro)intro.textContent='The Manistee changes from upper trout water to broad backwaters and the lower recreation river. Use the reaches below to plan the right trip.';
  $$('.guide-card',field).forEach(card=>{const h=$('h3',card),p=$('p',card);if(!h||!p)return;const t=h.textContent.trim();if(t==='For a trout day')p.textContent='Start with the Upper Manistee, check the Grayling gauge, then open the DNR regulation map for the reach you plan to fish.';else if(t==='For a paddle')p.textContent='Choose a put-in and takeout, check river mileage and set your travel speed. Pine River trips may require a Forest Service permit.';});
  $$('.guide h3').forEach(h=>{
    const text=h.textContent.trim();const p=h.nextElementSibling;
    if(text==='Regulations without pretending the map is the law'){
      h.textContent='Fishing regulations';
      if(p?.tagName==='P')p.textContent="Michigan's 2026 fishing regulations run through March 31, 2027. Use the DNR regulation map for reach-specific rules.";
    }else if(text==='Why the lines matter'){
      h.textContent='River routing';
      if(p?.tagName==='P')p.textContent='Trip mileage follows the USGS river network rather than straight-line distance.';
    }else if(text==='Tributaries: what is actually connected'){
      h.textContent='River system';
      if(p?.tagName==='P')p.textContent='Pine River and Bear Creek feed the Manistee. The Little Manistee reaches Manistee Lake separately and is shown as a companion river.';
    }else if(text==='Data honesty'){
      p?.remove();h.remove();
    }else if(text==='Primary sources and verification links'){
      h.textContent='Sources';
    }
  });
  const footer=$('.footer');if(footer)footer.textContent='Chris Izworski · Michigan field tools';
}
function decoratePlaceRows(){const list=$('#place-list');if(!list)return;$$('button.place-row:not([data-directions-ready])',list).forEach(row=>{const p=D.places.find(x=>x.id===row.dataset.id);if(!p)return;row.dataset.directionsReady='true';const wrap=document.createElement('div');wrap.className='mc-place-card';row.before(wrap);wrap.appendChild(row);const a=document.createElement('a');a.className='mc-google-directions';a.href=directions(p);a.target='_blank';a.rel='noopener';a.textContent='Google directions';a.setAttribute('aria-label',`Google Maps directions to ${p.name}`);wrap.appendChild(a);});}
function crispDetail(){const detail=$('#place-detail');if(!detail)return;const a=$('.action-row a.btn.primary',detail);if(a&&a.href.includes('google.com/maps/dir/'))a.textContent='Google Directions';$$('dl>div',detail).forEach(row=>{if($('dt',row)?.textContent.trim()==='Coordinate source')row.remove();});const micro=$('.micro',detail);if(micro)micro.textContent='Check current DNR regulations before fishing.';}
function crispPopup(root=document){$$('.mrp-card',root).forEach(card=>{const facts=$$('.mrp-facts>div',card);facts.forEach(f=>{if($('span',f)?.textContent.trim()==='Location confidence')f.remove();});$$('.mrp-actions a',card).forEach(a=>{if(a.textContent.trim()==='Official / location source')a.textContent='Source';if(a.textContent.trim()==='Navigate here')a.textContent='Google Directions';});const src=$('.mrp-source',card);if(src&&src.textContent.includes('exact point'))src.remove();});}
function observeUi(){if(document.documentElement.dataset.manisteeCrispObserver)return;document.documentElement.dataset.manisteeCrispObserver='true';const observer=new MutationObserver(()=>{decoratePlaceRows();crispDetail();crispPopup();});observer.observe(document.body,{childList:true,subtree:true});decoratePlaceRows();crispDetail();crispPopup();}
function render(){const panel=$('#panel-places');if(!panel||$('.manistee-coverage-tools',panel))return;const host=document.createElement('div');host.className='manistee-coverage-tools';const services=(D.services||[]).filter(s=>s.kind!=='guide-directory');const audit=D.coverage?.inventoryOnly||[];host.dataset.coverageAudit=`Coverage audit · ${D.places.length} mapped + ${audit.length} audited`;host.dataset.sourceContract='Operator / source';host.innerHTML=`<details><summary>Guides, liveries & outfitters · ${services.length}</summary><div class="mc-dir">${services.map(s=>`<div class="mc-dir-row"><div><strong>${esc(s.name)}</strong><div><span class="mc-pill">${esc(label(s.kind))}</span><span class="mc-pill">${esc(s.coverage)}</span></div><small>${esc(s.note)}</small></div><a href="${esc(s.url)}" target="_blank" rel="noopener">Website</a></div>`).join('')}</div></details>`;const detail=$('#place-detail');detail?.before(host);}
function init(){styles();crispPanels();crispGuide();render();observeUi();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();