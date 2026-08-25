(() => {
  const LAT = 47.44614;
  const LON = -87.86015;
  const NWS = 'https://api.weather.gov';
  const $ = (id) => document.getElementById(id);
  const fmtTime = (value) => {
    if (!value) return '—';
    try { return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
    catch { return '—'; }
  };
  const fmtHour = (value) => {
    if (!value) return '—';
    try { return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', hour: 'numeric' }).format(new Date(value)); }
    catch { return '—'; }
  };
  const cToF = (c) => Number.isFinite(Number(c)) ? Math.round((Number(c) * 9 / 5) + 32) : null;
  const msToMph = (ms) => Number.isFinite(Number(ms)) ? Math.round(Number(ms) * 2.23694) : null;
  const finite = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function parseWind(text) {
    const nums = String(text || '').match(/\d+(?:\.\d+)?/g);
    if (!nums) return 0;
    return Math.max(...nums.map(Number).filter(Number.isFinite));
  }
  function setCard(id, valueId, detailId, level, value, detail) {
    const card = $(id); if (card && level) card.dataset.level = level;
    if ($(valueId)) $(valueId).textContent = value;
    if ($(detailId)) $(detailId).textContent = detail;
  }
  async function getJson(url) {
    const res = await fetch(url, { headers: { accept: 'application/geo+json, application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  function alertIsSerious(a) {
    const p = a?.properties || {};
    return /Extreme|Severe/i.test(p.severity || '') || /Tornado|Severe Thunderstorm|Flash Flood|Flood Warning|High Wind|Winter Storm|Ice Storm|Blizzard|Snow Squall/i.test(p.event || '');
  }
  function chooseBestWindow(periods) {
    const candidates = periods.slice(0, 8).map((p) => {
      const precip = finite(p?.probabilityOfPrecipitation?.value) ?? 0;
      const wind = parseWind(p?.windSpeed);
      const storm = /thunder|storm/i.test(p?.shortForecast || '');
      const score = precip + wind * 1.5 + (p?.isDaytime ? 0 : 80) + (storm ? 100 : 0);
      return { p, score };
    }).filter(x => x.p?.isDaytime !== false);
    return candidates.sort((a,b) => a.score - b.score)[0]?.p || periods[0] || null;
  }
  function classifyHike(periods, alerts) {
    const serious = alerts.find(alertIsSerious);
    if (serious) return { level:'hold', value:'Hold / reassess', detail:`Active ${serious.properties?.event || 'weather alert'} near the sanctuary.` };
    const next = periods.slice(0, 6);
    const precipMax = Math.max(0, ...next.map(p => finite(p?.probabilityOfPrecipitation?.value) ?? 0));
    const windMax = Math.max(0, ...next.map(p => parseWind(p?.windSpeed)));
    const thunder = next.some(p => /thunder|storm/i.test(p?.shortForecast || ''));
    const best = chooseBestWindow(periods);
    const bestText = best ? ` Best weather window starts around ${fmtHour(best.startTime)}.` : '';
    if (thunder) return { level:'hold', value:'Storm risk', detail:`Thunderstorms appear in the next several hours.${bestText}` };
    if (precipMax >= 70) return { level:'watch', value:'Wet window', detail:`Rain chance reaches ${Math.round(precipMax)}%. Expect a wetter forest experience.${bestText}` };
    if (windMax >= 25) return { level:'watch', value:'Windy forest', detail:`Forecast wind reaches about ${Math.round(windMax)} mph. In old growth, stay alert for falling branches.${bestText}` };
    if (precipMax >= 40) return { level:'watch', value:'Mixed', detail:`Rain chance reaches ${Math.round(precipMax)}%, but a workable window may exist.${bestText}` };
    return { level:'good', value:'Good weather window', detail:`No major weather limiter shows in the next several hours.${bestText}` };
  }
  function bugRead(obs) {
    const month = Number(new Intl.DateTimeFormat('en-US', { timeZone:'America/Detroit', month:'numeric' }).format(new Date()));
    if ([11,12,1,2,3].includes(month)) return { level:'good', value:'Low season', detail:'Cold-season weather usually suppresses mosquitoes.' };
    if (!obs) return { level:'watch', value:'Unknown', detail:'Nearby observation is unavailable; bring repellent in warm months.' };
    const temp = cToF(obs.temperature?.value);
    const dew = cToF(obs.dewpoint?.value);
    const wind = msToMph(obs.windSpeed?.value);
    if (temp === null || dew === null || wind === null) return { level:'watch', value:'Unknown', detail:'Not enough nearby observation data for a weather proxy.' };
    if (temp >= 58 && dew >= 52 && wind <= 7) return { level:'watch', value:'High-favoring weather', detail:`${temp}°F, dew point ${dew}°F and light wind favor mosquito activity. This is not a measured bug count.` };
    if (temp >= 52 && dew >= 45 && wind <= 12) return { level:'watch', value:'Moderate-favoring', detail:`Warm, somewhat humid air with ${wind} mph wind can support bugs in the sheltered forest.` };
    return { level:'good', value:'Lower-favoring weather', detail:`Cooler, drier or breezier conditions are less favorable for mosquitoes right now.` };
  }
  function daylightRead(periods) {
    if (!periods.length) return { level:'watch', value:'Unknown', detail:'NWS daylight periods unavailable.' };
    const now = periods[0];
    if (now.isDaytime) {
      const night = periods.find((p, i) => i > 0 && p.isDaytime === false);
      return { level:'good', value:'Daylight now', detail: night ? `NWS hourly periods turn to night around ${fmtTime(night.startTime)}. Leave turnaround margin.` : 'Daylight continues through the available hourly window.' };
    }
    const day = periods.find((p, i) => i > 0 && p.isDaytime === true);
    return { level:'watch', value:'Dark now', detail: day ? `NWS hourly periods return to daylight around ${fmtTime(day.startTime)}.` : 'Nighttime continues through the available hourly window.' };
  }
  function renderHourly(periods) {
    const root = $('hourly'); if (!root) return;
    root.innerHTML = periods.slice(0,6).map(p => {
      const rain = finite(p?.probabilityOfPrecipitation?.value);
      return `<div class="hour"><span>${esc(fmtHour(p.startTime))}</span><strong>${esc(p.temperature)}°${esc(p.temperatureUnit || 'F')}</strong><span>${esc(p.shortForecast || 'Forecast')}</span><br><span>${rain === null ? 'rain —' : `${Math.round(rain)}% rain`}</span><br><span>${esc(p.windSpeed || '')} ${esc(p.windDirection || '')}</span></div>`;
    }).join('');
  }
  function renderAlerts(features) {
    const root = $('alerts'); if (!root) return;
    if (!features.length) { root.innerHTML = '<div class="quiet"><strong>No active NWS alerts at the sanctuary point.</strong> Forecast conditions can still change quickly in the Keweenaw.</div>'; return; }
    root.innerHTML = features.slice(0,4).map(a => {
      const p = a.properties || {};
      return `<div class="alert"><strong>${esc(p.event || 'Weather alert')}</strong><br>${esc(p.headline || p.description || 'Active National Weather Service alert.')}</div>`;
    }).join('');
  }
  function forestFeel(obs) {
    if (!obs) return 'Nearby NWS observation is unavailable. The live hiking read still uses the point forecast at Estivant Pines.';
    const temp = cToF(obs.temperature?.value), dew = cToF(obs.dewpoint?.value), rh = finite(obs.relativeHumidity?.value), wind = msToMph(obs.windSpeed?.value), gust = msToMph(obs.windGust?.value);
    const parts = [];
    if (temp !== null) parts.push(`${temp}°F`);
    if (rh !== null) parts.push(`${Math.round(rh)}% humidity`);
    if (dew !== null) parts.push(`${dew}°F dew point`);
    if (wind !== null) parts.push(`${wind} mph wind${gust !== null && gust > wind ? `, gusting ${gust}` : ''}`);
    return `${parts.length ? `Nearby observation: ${parts.join(', ')}. ` : ''}Inside the dense canopy it can feel cooler and more humid than exposed Copper Harbor. This is regional observation context, not a sensor inside the sanctuary.`;
  }
  function setSeasonAccess() {
    const month = Number(new Intl.DateTimeFormat('en-US', { timeZone:'America/Detroit', month:'numeric' }).format(new Date()));
    const el = $('seasonAccess'); if (!el) return;
    if ([11,12,1,2,3].includes(month)) el.innerHTML = '<strong>Seasonal access:</strong> winter mode. Do not assume summer drive-to-trailhead access; local roads and parking can be snow-covered or unplowed.';
    else if (month === 4) el.innerHTML = '<strong>Seasonal access:</strong> thaw mode. Snow and mud can make the approach road and trail more difficult even when Copper Harbor is mostly clear.';
    else el.innerHTML = '<strong>Seasonal access:</strong> summer/fall approach. Use MNA\'s Manganese Road → Clark Mine Road → Burma Road directions and expect a remote dirt-road finish.';
  }
  async function fallColor() {
    try {
      const data = await getJson('/api/fall-color?view=conditions');
      const regions = Array.isArray(data?.regions) ? data.regions : [];
      const region = regions.find(r => /keweenaw|western upper|western up|wup/i.test([r?.id,r?.slug,r?.name,r?.region].filter(Boolean).join(' ')));
      if (!region) throw new Error('Keweenaw region not found');
      const stage = region.stage || region.status || region.label || region.phase || null;
      const pct = finite(region.colorPct ?? region.color_pct ?? region.percent ?? region.progress);
      $('fallTitle').textContent = stage ? `Keweenaw: ${stage}` : 'Keweenaw live color context';
      $('fallDetail').textContent = pct !== null ? `The site's live regional model currently reads about ${Math.round(pct)}% color development. Open the Keweenaw tracker for the full source breakdown.` : `Live regional data updated ${data.updated ? new Date(data.updated).toLocaleString() : 'recently'}. Open the Keweenaw tracker for the full source breakdown.`;
    } catch {
      $('fallTitle').textContent = 'Keweenaw color tracker';
      $('fallDetail').textContent = 'Live regional color data is temporarily unavailable here. The dedicated Keweenaw page remains the source for fall timing and current model detail.';
    }
  }
  async function load() {
    setSeasonAccess();
    fallColor();
    try {
      const point = await getJson(`${NWS}/points/${LAT.toFixed(4)},${LON.toFixed(4)}`);
      const props = point?.properties || {};
      if (!props.forecastHourly) throw new Error('NWS point lookup did not return an hourly forecast');
      const requests = [
        getJson(props.forecastHourly),
        getJson(`${NWS}/alerts/active?point=${LAT.toFixed(4)},${LON.toFixed(4)}`).catch(() => ({features:[]})),
        props.observationStations ? getJson(props.observationStations).catch(() => null) : Promise.resolve(null)
      ];
      const [forecast, alertData, stationData] = await Promise.all(requests);
      const periods = forecast?.properties?.periods || [];
      const alerts = alertData?.features || [];
      let obs = null;
      const stationId = stationData?.features?.[0]?.id;
      if (stationId) obs = await getJson(`${stationId}/observations/latest`).then(x => x?.properties || null).catch(() => null);

      const hike = classifyHike(periods, alerts);
      setCard('hikeCard','hikeValue','hikeDetail',hike.level,hike.value,hike.detail);
      const now = periods[0];
      const rain = finite(now?.probabilityOfPrecipitation?.value);
      setCard('weatherCard','weatherValue','weatherDetail','good',now ? `${now.temperature}°${now.temperatureUnit || 'F'} · ${now.shortForecast || ''}` : 'Unavailable',now ? `${rain === null ? 'Rain chance unavailable' : `${Math.round(rain)}% rain`} · ${now.windSpeed || ''} ${now.windDirection || ''}` : 'NWS hourly forecast unavailable.');
      const bug = bugRead(obs); setCard('bugCard','bugValue','bugDetail',bug.level,bug.value,bug.detail);
      const day = daylightRead(periods); setCard('dayCard','dayValue','dayDetail',day.level,day.value,day.detail);
      renderHourly(periods); renderAlerts(alerts);
      if ($('forestFeel')) $('forestFeel').textContent = forestFeel(obs);
      if ($('asOf')) $('asOf').textContent = `Live NWS read updated ${new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date())} ET · Estivant Pines trailhead ${LAT.toFixed(4)}, ${LON.toFixed(4)}.`;
    } catch (err) {
      setCard('hikeCard','hikeValue','hikeDetail','watch','Live weather unavailable','Use the National Weather Service forecast for Copper Harbor before leaving. The route and access guidance below remains available.');
      setCard('weatherCard','weatherValue','weatherDetail','watch','Unavailable','NWS live data could not be loaded.');
      setCard('bugCard','bugValue','bugDetail','watch','Unknown','Bring repellent in warm months when live observation data is unavailable.');
      setCard('dayCard','dayValue','dayDetail','watch','Check daylight','Build turnaround margin into the hike.');
      if ($('hourly')) $('hourly').innerHTML = '<div class="quiet">NWS hourly forecast is temporarily unavailable.</div>';
      if ($('alerts')) $('alerts').innerHTML = '<div class="quiet">NWS alert check is temporarily unavailable. Check weather.gov before hiking.</div>';
      if ($('forestFeel')) $('forestFeel').textContent = 'Live nearby observation unavailable. This tool fails open to the source links rather than inventing conditions.';
      if ($('asOf')) $('asOf').textContent = 'Live NWS data is temporarily unavailable; source-backed route and access information remains below.';
      console.warn('[estivant-pines] live data unavailable', err);
    }
  }
  load();
})();
