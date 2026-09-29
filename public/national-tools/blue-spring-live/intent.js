const $=s=>document.querySelector(s);const fmt=(v,d=1)=>Number.isFinite(v)?Number(v).toFixed(d):'—';
async function get(url){const r=await fetch(url);if(!r.ok)throw new Error(String(r.status));return r.json()}
function set(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
function dateLabel(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||'')))return null;return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}
async function boot(){
  const mode=document.body.dataset.mode;
  try{
    const [liveResult,manateeResult]=await Promise.allSettled([get('/api/blue-spring-live'),get('/api/blue-spring-manatee')]);
    const live=liveResult.status==='fulfilled'?liveResult.value:null;const man=manateeResult.status==='fulfilled'?manateeResult.value:null;
    const spring=live?.water?.spring?.temperatureF,river=live?.water?.river?.temperatureF,delta=live?.water?.refugeDeltaF;
    const offSeason=man?.freshness==='off-season'||live?.season==='water-activity';
    const rollDate=dateLabel(man?.observedDate);
    set('springTemp',Number.isFinite(spring)?`${fmt(spring)}°F`:'—');set('riverTemp',Number.isFinite(river)?`${fmt(river)}°F`:'—');set('delta',Number.isFinite(delta)?`${delta>=0?'+':''}${fmt(delta)}°F`:'—');
    set('riverTrend',Number.isFinite(live?.water?.riverTrend24hF)?`${live.water.riverTrend24hF>=0?'+':''}${fmt(live.water.riverTrend24hF)}°F / 24h`:'—');
    set('manateeCount',Number.isFinite(man?.count)?String(man.count):'—');
    set('manateeFresh',offSeason?'Off season · winter refuge season begins Nov. 15. Prior-season counts are not shown as current.':rollDate?`${rollDate} · Save the Manatee Club morning roll call`:man?.freshness==='published-undated-fallback'?'Fallback published count · observation date unavailable':man?.note||'Published count unavailable.');
    const next=live?.weather?.daily?.[0];set('weather',next?`${next.temperature}°${next.temperatureUnit||'F'} · ${next.shortForecast}`:'—');
    let decision='Live conditions are partially unavailable. Use the official park page before making a special trip.';
    if(mode==='water'&&Number.isFinite(spring)) decision=`Blue Spring is ${fmt(spring)}°F${Number.isFinite(river)?`, compared with ${fmt(river)}°F in the St. Johns River`:''}${Number.isFinite(delta)?` — a ${fmt(Math.abs(delta))}°F ${delta>=0?'warmer':'cooler'} refuge difference`:''}.`;
    if(mode==='manatee'){
      if(offSeason) decision=`Manatee refuge season returns Nov. 15. Prior-season roll calls are not shown as current. Use the live water and weather readings for general park planning until winter monitoring resumes.`;
      else if(Number.isFinite(man?.count)&&rollDate) decision=`Save the Manatee Club's latest dated morning roll call was ${man.count} manatees on ${rollDate}. Pair that observation with the live river temperature and trend because the animals can move between survey mornings.`;
      else if(Number.isFinite(man?.count)) decision=`A fallback source currently reports ${man.count} manatees, but no reliable observation date is available. Treat it as secondary context, not a same-day census.`;
      else decision=`The published manatee count is unavailable right now. ${Number.isFinite(delta)?`The spring is currently ${fmt(delta)}°F warmer than the river, which is useful refuge context.`:''}`;
    }
    if(mode==='visit'){
      const season=live?.season==='manatee'; const cold=Number.isFinite(river)&&river<68; const dry=next?.precipitationProbability==null||next.precipitationProbability<40;
      decision=season?(cold?`Manatee-season conditions favor refuge use: the St. Johns River is ${fmt(river)}°F. ${dry?'Weather does not show a strong precipitation signal in the next forecast period.':'Check rain timing before arrival.'}`:`It is manatee season, but the river is ${Number.isFinite(river)?`${fmt(river)}°F`:'not reporting'}; colder mornings generally strengthen the refuge signal.`):`Outside manatee season, use the water and weather panels to plan a general Blue Spring visit. Current spring temperature: ${Number.isFinite(spring)?`${fmt(spring)}°F`:'unavailable'}.`;
    }
    set('decisionText',decision);set('updated',live?.retrievedAt?`Live sources retrieved ${new Date(live.retrievedAt).toLocaleString()}`:'One or more live sources degraded');
  }catch(e){set('decisionText','Live conditions could not be loaded. The planning guidance below remains valid; verify conditions with the official park before departure.');set('updated','Live source unavailable');}
}
boot();