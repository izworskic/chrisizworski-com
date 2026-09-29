import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const URL='https://chrisizworski.com/national-tools/kilauea-live/';
const IMAGE='https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/s3fs-public/media/images/Image_-_2026-08-25T123538.343.jpg';
const SOCIAL_TITLE='Kīlauea Eruption Today: Live Lava Viewing & Webcam';
const DESCRIPTION='Is Kīlauea erupting today? Check USGS HVO status, live webcam, NPS access, wind/vog, cloud and rain, daylight and parking before lava viewing.';
const SOCIAL_DESCRIPTION='Kīlauea eruption status, live USGS webcam, NPS access, summit weather, vog/SO₂, daylight and parking context translated into a practical viewing decision.';
const SEARCH_TERMS='Kīlauea eruption today, is Kīlauea erupting, Kīlauea live, lava viewing, Kīlauea webcam';
const STYLE=`<style id="kilauea-answer-agent-style">
.trip-fit{margin-top:10px;padding:10px 11px;border:1px solid var(--line);background:#1a1c19;font:12px/1.45 system-ui,-apple-system,sans-serif;color:var(--ash2)}.trip-fit strong{color:var(--ink)}
.signal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;margin-top:11px;background:var(--line);border:1px solid var(--line)}.signal{background:#1a1c19;padding:9px 10px;min-width:0}.signal-label{font:800 9px/1.2 system-ui,-apple-system,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}.signal-value{font:11px/1.35 system-ui,-apple-system,sans-serif;color:var(--ash2);overflow-wrap:anywhere}.signal-value a{color:var(--ink)}
@media(min-width:720px){.signal-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
</style>`;
const TRIP='<div id="tripFit" class="trip-fit" aria-live="polite"><strong>Your trip:</strong> Applying your drive, walking, visit and timing choices...</div>';
const SIGNALS='<div id="signalGrid" class="signal-grid" aria-label="Live decision inputs"><div class="signal"><div class="signal-label">Signals</div><div class="signal-value">Loading official inputs...</div></div></div>';

const HELPERS=String.raw`
  function episodeSignal(d){
    const raw=String(d.eruption?.text||'');
    const possible=raw.match(/episode\s+(\d+)\s+remains\s+(?:a\s+)?possibility/i);
    if(possible) return 'Episode '+possible[1]+' remains possible; HVO has not given a reliable start time.';
    const f=d.decision?.forecastability;
    if(f?.state==='OFFICIAL_WINDOW') return 'HVO has published an official episode window; open the HVO update for the exact timing.';
    if(f?.state==='UNPREDICTABLE') return 'HVO says there is no reliable episode start window.';
    return 'No official episode start window is stated in the latest HVO update.';
  }
  function accessSignal(d){
    if(d.access?.parkClosed) return 'Park-wide closure reported by NPS.';
    if(d.access?.closureUnknown) return 'NPS access could not be fully verified.';
    const closed=(d.access?.closedViewpoints||[]).length;
    return closed?'Park open; '+closed+' listed viewpoint closure'+(closed===1?'':'s')+' detected.':'Park access verified; no park-wide closure detected.';
  }
  function airSignal(d){
    if(d.sources?.air?.status!=='ok') return 'Vog/SO₂ feed is degraded; do not assume clean air.';
    if(d.air?.advisoryDetected) return 'Hawaiʻi DOH shows an unhealthy short-term SO₂ signal.';
    if(d.air?.elevatedDetected) return 'Hawaiʻi DOH shows elevated regional SO₂ context.';
    return 'Regional Hawaiʻi DOH SO₂ stations show no current unhealthy advisory signal.';
  }
  function parkingSignal(d){
    const p=d.decision?.profile||state,v=d.decision?.viewpoint;
    if(!v) return 'Choose parking only after NPS access is verified.';
    let out=v.name+': '+(v.parkingSpaces||'NPS-listed')+' parking spaces listed; not a live vacancy count.';
    if(v.crowdNote) out+=' '+v.crowdNote;
    if(p.travel==='three') out+=' Current parking conditions are not treated as a three-hour forecast.';
    return out;
  }
  function lightSignal(d){
    const wx=d.decision?.wxNow;
    if(wx?.isDaytime===true) return 'Daylight now'+(state.experience==='photo'?'; photo mode also weighs cloud and rain.':'.');
    if(wx?.isDaytime===false) return 'After dark now; glow can stand out more if activity persists and cloud stays out.';
    return 'Daylight state unavailable from the current NWS period.';
  }
  function cloudSignal(d){
    const wx=d.decision?.wxNow;if(!wx)return 'Current cloud/rain period unavailable.';
    const pop=wx.precipProbability??wx.probabilityOfPrecipitation?.value;
    return (wx.shortForecast||'Forecast available')+(pop!=null?' · '+pop+'% precip':'');
  }
  function windSignal(d){
    const wx=d.decision?.wxNow;if(!wx?.windSpeed)return 'Current summit wind unavailable.';
    return [wx.windDirection,wx.windSpeed].filter(Boolean).join(' ');
  }
  function tripSummary(d){
    const p=d.decision?.profile||state,v=d.decision?.viewpoint;
    const travel=p.travel==='here'?'here now':p.travel==='three'?'3 hours away':'1 hour away';
    const walk=p.mobility==='short'?'short walk':'walking is fine';
    const visit=p.experience==='photo'?'photography':'see it';
    const timing=p.plan==='tomorrow'?'tomorrow':p.plan==='today'?'later today':'now';
    let implication=p.plan==='tomorrow'?'Tomorrow needs a fresh HVO + webcam check; today’s eruption state is not carried forward.':p.travel==='three'?'A three-hour drive needs fresh HVO + webcam confirmation, not a possible-episode headline.':p.travel==='one'?'Recheck HVO, the webcam and access immediately before the one-hour drive.':'Because you are already here, use the webcam and access as a right-now confirmation gate.';
    if(v) implication+=' Best-fit viewpoint: '+v.name+'.';
    implication+=p.experience==='photo'?' Photo mode weighs light and cloud; darkness can improve glow contrast only if activity persists.':' Casual-view mode favors a clear, accessible view over chasing the closest vent.';
    implication+=p.mobility==='short'?' Short-walk mode avoids making the longer Keanakākoʻi approach the default.':' Since walking is fine, a longer approach can win when it offers the better fit and remains open.';
    return '<strong>Your trip:</strong> '+travel+' · '+walk+' · '+visit+' · '+timing+'. '+implication;
  }
  function actionTail(d){
    const p=d.decision?.profile||state,v=d.decision?.viewpoint,parts=[];
    if(p.travel==='three')parts.push('For your three-hour drive, require a fresh HVO update and a confirming webcam view before committing.');
    else if(p.travel==='one')parts.push('For your one-hour drive, recheck HVO, the webcam and NPS access immediately before leaving.');
    else parts.push('Since you are here now, let the live camera and current access settle the immediate choice.');
    if(v) parts.push(v.name+(p.mobility==='short'?' fits your short-walk choice.':' is favored because you said the walk is acceptable.'));
    if(p.experience==='photo')parts.push('For photos, compare cloud/rain with daylight; after dark can strengthen glow contrast only while activity continues.');
    return parts.join(' ');
  }
  function renderAnswerAgent(d){
    const trip=$('tripFit');if(trip)trip.innerHTML=tripSummary(d);
    const grid=$('signalGrid');
    if(grid){
      const activity=[d.eruption?.alertLevel,d.decision?.activity?.label].filter(Boolean).join(' · ')||'Activity unavailable';
      const signals=[['Eruption',activity],['Episode',episodeSignal(d)],['Webcam','USGS summit livestream · confirm lava and cloud before moving',d.camera?.url],['NPS access',accessSignal(d)],['Wind',windSignal(d)],['Vog / SO₂',airSignal(d)],['Cloud / rain',cloudSignal(d)],['Daylight',lightSignal(d)],['Parking',parkingSignal(d)]];
      grid.innerHTML=signals.map(function(s){const value=s[2]?'<a href="'+esc(s[2])+'" rel="noopener">'+esc(s[1])+'</a>':esc(s[1]);return '<div class="signal"><div class="signal-label">'+esc(s[0])+'</div><div class="signal-value">'+value+'</div></div>';}).join('');
    }
    if($('quickAction')) $('quickAction').textContent=(d.decision?.action||'Check official sources.')+' '+actionTail(d);
  }
`;

function setMeta(html,kind,key,value,anchor){
  const attr=kind==='name'?'name':'property';
  const tag=`<meta ${attr}="${key}" content="${value}">`;
  const safe=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(`<meta\\s+${attr}="${safe}"\\s+content="[^"]*"\\s*\\/?>`,'i');
  return re.test(html)?html.replace(re,tag):html.replace(anchor,anchor+'\n'+tag);
}

function enhancePage(file){
  let html=fs.readFileSync(file,'utf8');
  const canonical='<link rel="canonical" href="'+URL+'">';
  if(!html.includes(canonical)) throw new Error('Kilauea answer agent: canonical missing');
  html=setMeta(html,'name','description',DESCRIPTION,canonical);
  html=setMeta(html,'name','twitter:title',SOCIAL_TITLE,canonical);
  html=setMeta(html,'name','twitter:description',SOCIAL_DESCRIPTION,canonical);
  html=setMeta(html,'name','twitter:card','summary_large_image',canonical);
  html=setMeta(html,'name','twitter:image',IMAGE,canonical);
  html=setMeta(html,'property','og:title',SOCIAL_TITLE,canonical);
  html=setMeta(html,'property','og:description',SOCIAL_DESCRIPTION,canonical);
  html=setMeta(html,'property','og:image',IMAGE,canonical);
  html=html.replace(/<p class="sub">[\s\S]*?<\/p>/,'<p class="sub">Live USGS HVO eruption state and episode guidance + webcam + NPS access + summit wind, vog/SO₂, cloud/rain, daylight and parking context, turned into a practical go / wait / where decision.</p>');
  if(!html.includes('id="kilauea-answer-agent-style"'))html=html.replace('</head>',STYLE+'\n</head>');
  if(!html.includes('id="tripFit"'))html=html.replace('<div class="controls"',TRIP+'\n<div class="controls"');
  if(!html.includes('id="signalGrid"'))html=html.replace('<p class="disclaimer">',SIGNALS+'\n<p class="disclaimer">');
  if(!html.includes('function renderAnswerAgent(d)'))html=html.replace(/(\s*)function\s+render\(d,persistVisit\)\s*\{/,(_,indent)=>'\n'+HELPERS+'\n'+indent+'function render(d,persistVisit){');
  if(html.includes('function renderAnswerAgent(d)')&&!/\n\s*renderAnswerAgent\(d\);/.test(html)){
    const re=/(\$\('quickAction'\)\.textContent=d\.decision\?\.action\s*\|\|\s*'Check official sources\.';)/;
    if(re.test(html))html=html.replace(re,'$1\n    renderAnswerAgent(d);');
  }
  const jsonMatch=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if(jsonMatch){
    const schema=JSON.parse(jsonMatch[1]),graph=Array.isArray(schema?.['@graph'])?schema['@graph']:[];
    const page=graph.find(x=>x?.['@id']===URL);if(page){page.description=DESCRIPTION;page.headline='Is Kīlauea erupting today, and is lava viewing worth the trip?';page.keywords=SEARCH_TERMS;page.dateModified='2026-09-29';}
    const app=graph.find(x=>x?.['@id']===URL+'#app');if(app){app.name='Kīlauea Live / Lava Viewing';app.description='A live Kīlauea lava-viewing decision tool combining official eruption state and episode guidance with webcams, park access, summit weather, vog/SO₂, daylight and parking context.';app.keywords=SEARCH_TERMS;app.featureList=['USGS HVO eruption state','Official HVO episode guidance','USGS Kīlauea webcams','NPS access and viewpoint closures','NWS wind, cloud and precipitation','Hawaiʻi DOH SO₂/vog context','Daylight versus after-dark viewing context','NPS parking and viewpoint capacity context'];}
    html=html.replace(jsonMatch[0],`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
  }
  for(const needle of ['id="tripFit"','id="signalGrid"','function renderAnswerAgent(d)','renderAnswerAgent(d);','twitter:card" content="summary_large_image"'])if(!html.includes(needle))throw new Error('Kilauea answer agent: missing '+needle);
  if(/eruption countdown/i.test(html))throw new Error('Kilauea answer agent: forbidden countdown phrasing');
  if(html.includes('—'))throw new Error('Kilauea answer agent: em dash introduced');
  fs.writeFileSync(file,html,'utf8');
}

function enhanceDirectory(file){
  let html=fs.readFileSync(file,'utf8');
  const cardRe=/<article class="directory-card"[^>]*data-tool-id="kilauea-live"[\s\S]*?<\/article>/;
  const card=html.match(cardRe)?.[0];if(!card)throw new Error('Kilauea answer agent: directory card missing');
  let next=card.replace(/data-tags="([^"]*)"/,(_,tags)=>`data-tags="${tags} eruption today is kilauea erupting webcam wind vog so2 cloud rain daylight parking"`);
  next=next.replace(/<p class="description">[\s\S]*?<\/p>/,'<p class="description">Is Kīlauea erupting today? Combine HVO activity and episode guidance with webcams, NPS access, summit weather, vog/SO₂, daylight and parking context before you go.</p>');
  next=next.replace(/<p class="signals">[\s\S]*?<\/p>/,'<p class="signals"><strong>Signals:</strong> USGS HVO + USGS webcams + NPS + NWS + Hawaiʻi DOH</p>');
  html=html.replace(cardRe,next);fs.writeFileSync(file,html,'utf8');
}

export function enhanceKilauea(root=process.cwd()){
  enhancePage(path.join(root,'public','synced-national-tools','kilauea-live','index.html'));
  enhanceDirectory(path.join(root,'public','synced-national-tools','index.html'));
}

if(fileURLToPath(import.meta.url)===path.resolve(process.argv[1]||'')){
  enhanceKilauea(path.resolve(process.argv[2]||process.cwd()));
  console.log('Kilauea answer agent enhanced: personalization + eruption/episode/webcam/access/wind/vog/cloud/daylight/parking + social metadata');
}
