import fs from 'node:fs';

const MARK = '2026-09-29';

function moveSection(html, needle, insertNeedle, mode = 'before') {
  const needleAt = html.indexOf(needle);
  if (needleAt < 0) throw new Error(`Breakout enhancer: missing section needle: ${needle}`);
  const sectionStart = html.lastIndexOf('<section', needleAt);
  const sectionEndStart = html.indexOf('</section>', needleAt);
  if (sectionStart < 0 || sectionEndStart < 0) throw new Error(`Breakout enhancer: could not bound section for ${needle}`);
  const sectionEnd = sectionEndStart + '</section>'.length;
  const section = html.slice(sectionStart, sectionEnd);
  const marked = section.replace('<section', `<section data-breakout-relocated="${MARK}"`);
  const without = html.slice(0, sectionStart) + html.slice(sectionEnd);
  const anchorAt = without.indexOf(insertNeedle);
  if (anchorAt < 0) throw new Error(`Breakout enhancer: missing insertion anchor: ${insertNeedle}`);
  if (mode === 'before') return without.slice(0, anchorAt) + marked + '\n\n' + without.slice(anchorAt);
  const anchorStart = without.lastIndexOf('<section', anchorAt);
  const anchorEndStart = without.indexOf('</section>', anchorAt);
  if (anchorStart < 0 || anchorEndStart < 0) throw new Error(`Breakout enhancer: could not bound insertion section: ${insertNeedle}`);
  const anchorEnd = anchorEndStart + '</section>'.length;
  return without.slice(0, anchorEnd) + '\n\n' + marked + without.slice(anchorEnd);
}

export function enhanceFreighter(html) {
  if (html.includes(`data-breakout-relocated="${MARK}"`) && html.indexOf('data-gazette-placement="freighter-tracker"') > html.indexOf('id="live-map"')) return html;
  return moveSection(
    html,
    'data-gazette-placement="freighter-tracker"',
    '<section class="content-section" aria-labelledby="how-to-track">',
    'before',
  );
}

export function enhanceMackinac(html) {
  if (html.includes(`data-breakout-relocated="${MARK}"`) && html.indexOf('data-gazette-placement="mackinac-conditions"') > html.indexOf('id="statusCard"')) return html;
  return moveSection(
    html,
    'data-gazette-placement="mackinac-conditions"',
    'id="statusCard"',
    'after',
  );
}

const LOCATION_UI = `
    <div class="breakout-near-me" data-breakout-location="${MARK}">
      <button class="near-me-btn" id="launch-near-me" type="button">Use my location</button>
      <p><strong>Near me:</strong> location is requested only after you tap. Your coordinates stay in this browser, are not stored, and are not sent to this site.</p>
    </div>
    <div class="near-me-results" id="launch-near-me-results" hidden aria-live="polite"></div>`;

const LOCATION_STYLE = `
<style data-breakout-location-style="${MARK}">
.breakout-near-me{display:flex;gap:10px;align-items:center;margin-top:9px;padding:9px 10px;border:1px solid #d9dfda;border-radius:10px;background:#fafcf9}.breakout-near-me p{margin:0;color:#647068;font-size:11px;line-height:1.4}.near-me-btn{min-height:40px;border:0;border-radius:9px;padding:0 14px;background:#245f86;color:#fff;font-weight:800;white-space:nowrap;cursor:pointer}.near-me-results{margin-top:9px;border:1px solid #d9dfda;border-radius:10px;background:#fff;padding:10px}.near-me-results h3{margin:0 0 6px;font:600 16px Georgia,serif}.near-me-list{display:grid;gap:6px}.near-me-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:7px 0;border-top:1px solid #e9ede9}.near-me-row:first-child{border-top:0}.near-me-pick{border:0;background:transparent;padding:0;text-align:left;color:#173d26;font-weight:800;cursor:pointer}.near-me-meta{display:block;color:#647068;font-size:10px;font-weight:400;margin-top:2px}.near-me-distance{font-size:11px;color:#225b34;font-weight:800;white-space:nowrap}.near-me-results .near-me-note{margin:7px 0 0;color:#647068;font-size:10px;line-height:1.4}@media(max-width:620px){.breakout-near-me{align-items:flex-start;flex-direction:column}.near-me-btn{width:100%}}
</style>`;

const LOCATION_SCRIPT = `
<script data-breakout-location-script="${MARK}">
(()=>{
  'use strict';
  const button=document.getElementById('launch-near-me');
  const box=document.getElementById('launch-near-me-results');
  const form=document.getElementById('launch-search-form');
  const input=document.getElementById('launch-search');
  if(!button||!box||!form||!input)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const rad=d=>d*Math.PI/180;
  const miles=(a,b,c,d)=>2*3958.7613*Math.asin(Math.sqrt(Math.sin(rad(c-a)/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2));
  function fail(message){box.hidden=false;box.innerHTML='<strong>'+esc(message)+'</strong><p class="near-me-note">You can still search a city, lake, river, harbor or launch above.</p>';button.disabled=false;button.textContent='Use my location';}
  button.addEventListener('click',()=>{
    if(!navigator.geolocation){fail('Location is not available in this browser.');return;}
    button.disabled=true;button.textContent='Finding nearby launches…';box.hidden=false;box.innerHTML='<span>Reading your device location…</span>';
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{
        const response=await fetch('/api/boat-launches',{headers:{Accept:'application/json'}});
        const data=await response.json().catch(()=>({}));
        if(!response.ok||!Array.isArray(data.launches))throw new Error('Launch inventory unavailable');
        const lat=Number(pos.coords.latitude),lon=Number(pos.coords.longitude);
        const nearest=data.launches.map(a=>({a,d:miles(lat,lon,Number(a.latitude),Number(a.longitude))})).filter(x=>Number.isFinite(x.d)).sort((x,y)=>x.d-y.d).slice(0,5);
        if(!nearest.length)throw new Error('No nearby launch records available');
        box.innerHTML='<h3>Nearest source-backed launches</h3><div class="near-me-list">'+nearest.map(({a,d})=>'<div class="near-me-row"><button type="button" class="near-me-pick" data-launch-name="'+esc(a.name)+'">'+esc(a.name)+'<span class="near-me-meta">'+esc(a.waterbody||a.county||'Waterbody not listed')+'</span></button><span class="near-me-distance">'+d.toFixed(1)+' mi straight line</span></div>').join('')+'</div><p class="near-me-note">Tap a launch to open it in the existing finder. Distances here are straight-line; the finder can calculate driving distance when routing is available.</p>';
        button.textContent='Location used once';
      }catch(error){fail(error?.message||'Could not load nearby launches.');}
      finally{button.disabled=false;}
    },()=>fail('Location permission was not granted.'),{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
  });
  box.addEventListener('click',event=>{
    const pick=event.target.closest('[data-launch-name]');
    if(!pick)return;
    input.value=pick.dataset.launchName||'';
    form.requestSubmit();
    document.getElementById('launch-app')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
})();
</script>`;

export function enhanceBoatLaunches(html) {
  if (html.includes(`data-breakout-location="${MARK}"`)) return html;
  const oldDescription = 'Explore Michigan public boat launches on one statewide map. Search a city, lake, river or ramp, compare access details, get directions and local NWS weather.';
  const newDescription = 'Find Michigan boat launches near you on one statewide map. Use your location or search a city, lake or river; compare access, directions and NWS weather.';
  if (!html.includes(oldDescription)) throw new Error('Breakout enhancer: boat-launch meta description anchor changed');
  let out = html.replace(oldDescription, newDescription);
  const formCloseNeedle = '    </form>\n    <div class="filter-row">';
  if (!out.includes(formCloseNeedle)) throw new Error('Breakout enhancer: boat-launch search form anchor changed');
  out = out.replace(formCloseNeedle, `    </form>${LOCATION_UI}\n    <div class="filter-row">`);
  const privacyPattern = /<p class="launch-guide-note"><strong>Near-me privacy:<\/strong>[\s\S]*?<\/p>/;
  if (!privacyPattern.test(out)) throw new Error('Breakout enhancer: boat-launch privacy note anchor changed');
  out = out.replace(privacyPattern, '<p class="launch-guide-note"><strong>Near-me privacy:</strong> precise device location is requested only after you tap “Use my location.” The nearest-launch calculation happens in your browser; your coordinates are not stored or sent to this site. You can always search a city, lake, river or harbor instead.</p>');
  if (!out.includes('</head>') || !out.includes('</body>')) throw new Error('Breakout enhancer: boat-launch document boundaries missing');
  out = out.replace('</head>', `${LOCATION_STYLE}\n</head>`).replace('</body>', `${LOCATION_SCRIPT}\n</body>`);
  return out;
}

export function applyBreakoutConstraints(root = '.') {
  const jobs = [
    ['public/great-lakes-freighter-tracking/index.html', enhanceFreighter],
    ['public/mackinac-bridge-live/index.html', enhanceMackinac],
    ['public/michigan-boat-launches/index.html', enhanceBoatLaunches],
  ];
  const changed = [];
  for (const [relative, enhance] of jobs) {
    const file = `${root}/${relative}`;
    const before = fs.readFileSync(file, 'utf8');
    const after = enhance(before);
    if (after !== before) {
      fs.writeFileSync(file, after);
      changed.push(relative);
    }
  }
  console.log(`Breakout constraints: ${changed.length ? changed.join(', ') : 'already applied'}`);
  return changed;
}
