import { suitableOutings, decisionMessage, statusLabel } from './pukaskwa-choice.mjs';

const form = document.getElementById('pk-preferences');
const cards = [...document.querySelectorAll('.pk-trail[data-trail]')];
const byId = new Map(cards.map(el => [el.dataset.trail, el]));
const refs = {
  title: document.getElementById('pk-result-heading'),
  lead: document.getElementById('pk-result-desc'),
  badge: document.getElementById('pk-result-badge'),
  minutes: document.getElementById('pk-result-time'),
  distance: document.getElementById('pk-result-distance'),
  source: document.getElementById('pk-result-source'),
  link: document.getElementById('pk-result-link'),
  foot: document.getElementById('pk-result-foot'),
  other: document.getElementById('pk-shortlist'),
  strip: document.getElementById('pk-source-strip'),
  stripHead: document.getElementById('pk-source-head'),
  stripDetail: document.getElementById('pk-source-detail'),
  monitor: document.getElementById('pk-monitor-state'),
  bridgeTitle: document.getElementById('pk-bridge-warning-title'),
  bridgeText: document.getElementById('pk-bridge-warning-description'),
  copy: document.getElementById('pk-copy'),
};

const origin = 'https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking/etat-sentiers-trail-conditions';
const fallback = cards.map(el => ({
  id:el.dataset.trail, name:el.dataset.name, hikingMinutes:Number(el.dataset.minutes),
  distanceKm:Number(el.dataset.km), difficulty:el.dataset.effort,
  status:el.dataset.status, observations:[],
}));
const data = { trails:fallback, source:null, selected:null, ready:false };
const showKm = km => km == null ? 'Distance not verified' : Number(km).toLocaleString('en-CA', {maximumFractionDigits:1}) + ' km round trip';
const showTime = mins => {
  if (!Number.isFinite(mins)) return 'Duration not verified';
  if (mins < 60) return mins + ' min hiking';
  if (mins === 540) return '8–9 hr hiking';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h + (m ? ' hr ' + m + ' min hiking' : ' hr hiking');
};
const asDate = iso => {
  if (!iso || Number.isNaN(Date.parse(iso))) return 'unknown';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [year,month,day]=iso.split('-').map(Number);
    return new Intl.DateTimeFormat('en-CA',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})
      .format(new Date(Date.UTC(year,month-1,day)));
  }
  return new Intl.DateTimeFormat('en-CA',{
    month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Toronto',
    timeZoneName:'short',
  }).format(new Date(iso));
};

function readPrefs() {
  return {
    minutes:Number(form.querySelector('input[name="pk-time"]:checked')?.value || 120),
    effort:form.elements.namedItem('pk-effort').value,
    vibe:form.elements.namedItem('pk-vibe').value,
  };
}
function renderCards(choices) {
  const top = choices.matches[0]?.id;
  const matchIds = new Set(choices.matches.map(x=>x.id));
  for (const card of cards) {
    const item = data.trails.find(t=>t.id===card.dataset.trail);
    if (!item) continue;
    const isTop = item.id === top;
    card.classList.toggle('is-selected', isTop);
    card.classList.toggle('is-ineligible', !matchIds.has(item.id));
    const badge = card.querySelector('[data-access]');
    if (badge) badge.textContent=statusLabel(item.status);
    card.dataset.status = item.status;
    const issued = item.observations?.map(o=>o.issuedOn).filter(Boolean).sort().at(-1);
    const evidence = card.querySelector('[data-issued]');
    if (evidence) {
      evidence.textContent = issued
        ? 'Parks Canada observation dated ' + asDate(issued) + '. ' +
          (item.status === 'closed' ? 'Closure applies; do not enter.' : 'Not a present-access guarantee.')
        : 'No dated official observation is confirmed for this itinerary. Verify with Parks Canada.';
    }
  }
}
function renderChoices() {
  let choice;
  try {choice=suitableOutings(data.trails,readPrefs());}
  catch {return;}
  const message=decisionMessage(choice);
  const primary=choice.matches[0] || null;
  data.selected=primary;
  refs.title.textContent=message.heading;
  refs.lead.textContent=message.lead;
  refs.source.textContent=message.foot;
  refs.badge.textContent=primary ? statusLabel(primary.status) : 'No appropriate trail match';
  refs.badge.dataset.state=primary?.status || 'unverified';
  refs.minutes.textContent=primary ? showTime(primary.hikingMinutes) : 'Adjust the filters';
  refs.distance.textContent=primary ? showKm(primary.distanceKm) : 'No route selected';
  refs.link.href=primary ? '#pk-'+primary.id : '#pk-trails';
  refs.link.textContent=primary ? 'Read this trail' : 'Review all trails';
  refs.foot.textContent=primary
    ? (primary.status==='recently-reported-open'
      ? 'Parks Canada recently reported this trail open. Confirm signs, weather, parking and actual access on arrival.'
      : 'This is an itinerary suggestion only. Current access has not been confirmed by a sufficiently recent official observation.')
    : 'The chooser does not override closures, operating seasons or your hiking limits.';

  refs.other.replaceChildren();
  for (const item of choice.matches.filter(x=>x.id!==primary?.id).slice(0,3)) {
    const li=document.createElement('li');
    const a=document.createElement('a');
    a.href='#pk-'+item.id;
    a.textContent=item.name;
    const small=document.createElement('small');
    small.textContent=showTime(item.hikingMinutes) + ' · ' + statusLabel(item.status);
    li.append(a,small);refs.other.append(li);
  }
  if (!refs.other.childElementCount) {
    const li=document.createElement('li');
    li.textContent='No other hike meets those limits. Review the trail list and official source before travel.';
    refs.other.append(li);
  }
  renderCards(choice);
  // Public, non-personal selection state for the Hattie Cove map. This event
  // never implies the mapped landmark is a trailhead or current access.
  document.dispatchEvent(new CustomEvent('pukaskwa:choice',{
    detail:{id:primary?.id || null,status:primary?.status || 'unverified'}
  }));
}
function renderSource(feed) {
  if (!feed || !Array.isArray(feed.dayHikes) || !feed.dayHikes.length) throw new Error('Incomplete visitor condition data');
  const current=new Map(feed.dayHikes.filter(x=>x?.id).map(x=>[x.id,x]));
  data.trails=fallback.map(t=>{
    const found=current.get(t.id);
    return found ? {...t,status:found.status,observations:found.observations||[]} : {...t,status:'source-unverified',observations:[]};
  });
  data.source=feed;
  const monitor=feed.monitor||{};
  const healthy=feed.ok===true && monitor.recent===true && monitor.health==='ok';
  refs.strip.dataset.mode=healthy?'normal':'warning';
  refs.stripHead.textContent=healthy ? 'Parks Canada observations loaded · issue dates shown below' : 'Current trail access cannot be confirmed from this monitor';
  refs.stripDetail.textContent=healthy
    ? 'Monitor last retrieved Parks Canada evidence ' + asDate(monitor.lastSuccessAt) + '. Official trail observations may still be weeks old.'
    : 'Monitoring is ' + (monitor.health||'unavailable') + '. The park’s actual trail observations may be outdated. Check its posted notices.';
  refs.monitor.textContent=monitor.lastSuccessAt
    ? 'Last successful source fetch: '+asDate(monitor.lastSuccessAt)+'; monitoring: '+(monitor.health||'unknown')
    : 'Recent source status unavailable; consult Parks Canada';
  const bridge=data.trails.find(t=>t.id==='white-river-bridge');
  const issued=bridge?.observations?.map(o=>o.issuedOn).filter(Boolean).sort().at(-1);
  if (bridge?.status==='closed'||bridge?.status==='last-known-closed') {
    refs.bridgeTitle.textContent='White River Suspension Bridge: official closure reported';
    refs.bridgeText.textContent='Parks Canada reported the bridge trail closed'+(issued?' on '+asDate(issued):'')+
      '. The 18 km, 8–9 hour hike is excluded from choices. Check official notices for any later reopening.';
  } else {
    refs.bridgeTitle.textContent='White River Suspension Bridge: confirm conditions before planning';
    refs.bridgeText.textContent='This challenging 18 km outing takes 8–9 hours. '+
      (bridge?.status==='recently-reported-open'?'Parks Canada has a more recent open report; this is not guaranteed access.':'Current bridge access is not independently confirmed.')+
      ' Check the official report and park staff before setting out.';
  }
  renderChoices();
}

function shareUrl() {
  const url = new URL(location.pathname,location.origin);
  const p = readPrefs();
  url.searchParams.set('time',String(p.minutes));
  url.searchParams.set('effort',p.effort);
  url.searchParams.set('vibe',p.vibe);
  return url.href;
}
function restoreQuery() {
  const query=new URLSearchParams(location.search);
  const time=Number(query.get('time'));
  if ([30,60,120,240,540].includes(time)) {
    const radio=form.querySelector('input[name="pk-time"][value="'+time+'"]');
    if(radio)radio.checked=true;
  }
  const effort=query.get('effort'),vibe=query.get('vibe');
  if(['easy','moderate','difficult'].includes(effort))form.elements.namedItem('pk-effort').value=effort;
  if(['coast','beach','forest','challenge'].includes(vibe))form.elements.namedItem('pk-vibe').value=vibe;
}
restoreQuery();
form.addEventListener('change',()=>{
  renderChoices();
  // Shareable, non-personal, reversible state; canonical page remains unchanged.
  history.replaceState(null,'',shareUrl());
});
refs.copy.addEventListener('click',async()=>{
  const p=readPrefs();
  const text=[
    'My Pukaskwa day-hike plan',
    (data.selected?.name||'No trail selected')+' · '+(data.selected?showTime(data.selected.hikingMinutes):''),
    'Access evidence: '+(data.selected?statusLabel(data.selected.status):'Not verified'),
    'Hiking time excludes the drive to Hattie Cove (~15 km one way from Highway 17).',
    'Verify Parks Canada before hiking: '+origin,
    shareUrl(),
  ].filter(Boolean).join('\n');
  try {
    if(!navigator.clipboard?.writeText)throw new Error('Copy unsupported');
    await navigator.clipboard.writeText(text);
    refs.copy.textContent='Plan copied';
  } catch {
    refs.copy.textContent='Copy unavailable — use your browser share menu';
  }
});
renderChoices();
fetch('/api/pukaskwa-conditions',{headers:{Accept:'application/json'},cache:'no-store'})
  .then(async response=>{
    const payload=await response.json();
    if(!payload || !Array.isArray(payload.dayHikes))throw new Error('No condition response');
    return payload;
  })
  .then(renderSource)
  .catch(()=>{
    refs.strip.dataset.mode='warning';
    refs.stripHead.textContent='Live source connection unavailable';
    refs.stripDetail.textContent='Static trail lengths remain available. Current access is not confirmed. Check Parks Canada directly.';
    refs.monitor.textContent='Unable to confirm a recent monitoring check.';
    data.trails=fallback;
    renderChoices();
  })
  .finally(()=>{document.body.dataset.pkReady='true';});
