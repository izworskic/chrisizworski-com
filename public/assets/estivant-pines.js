(() => {
  const LAT = 47.4456;
  const LON = -87.8776;
  const NWS = 'https://api.weather.gov';
  const USNO = 'https://aa.usno.navy.mil/api/rstt/oneday';
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

  function detroitParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone:'America/Detroit', year:'numeric', month:'numeric', day:'numeric', hour:'numeric', minute:'2-digit', hourCycle:'h23' }).formatToParts(date);
    const get = (type) => Number(parts.find(p => p.type === type)?.value);
    return { year:get('year'), month:get('month'), day:get('day'), hour:get('hour'), minute:get('minute') };
  }
  function detroitOffsetHours(date = new Date()) {
    try {
      const label = new Intl.DateTimeFormat('en-US', { timeZone:'America/Detroit', timeZoneName:'shortOffset' }).formatToParts(date).find(p => p.type === 'timeZoneName')?.value || '';
      const match = label.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/i);
      if (!match) return -5;
      const sign = match[1].startsWith('-') ? -1 : 1;
      return Number(match[1]) + sign * (Number(match[2] || 0) / 60);
    } catch { return -5; }
  }
  function clockMinutes(text) {
    const match = String(text || '').match(/^(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }
  function fmtClock(minutes) {
    if (!Number.isFinite(minutes)) return '—';
    let m = Math.round(minutes) % 1440; if (m < 0) m += 1440;
    const h24 = Math.floor(m / 60), mins = m % 60, suffix = h24 >= 12 ? 'PM' : 'AM', h = h24 % 12 || 12;
    return `${h}:${String(mins).padStart(2,'0')} ${suffix}`;
  }
  function durationText(minutes) {
    if (!Number.isFinite(minutes)) return '—';
    const total = Math.max(0, Math.round(minutes));
    const h = Math.floor(total / 60), m = total % 60;
    return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
  }
  function sunPhenomena(payload) {
    const data = payload?.properties?.data || payload?.data || {};
    const rows = Array.isArray(data?.sundata) ? data.sundata : [];
    const find = (re) => rows.find(r => re.test(String(r?.phen || '')))?.time || null;
    return {
      sunrise: find(/^Rise$/i) || find(/sunrise/i),
      sunset: find(/^Set$/i) || find(/sunset/i),
      civilBegin: find(/Begin Civil Twilight/i),
      civilEnd: find(/End Civil Twilight/i)
    };
  }
  async function loadSun() {
    try {
      const p = detroitParts();
      const dst = detroitOffsetHours() > -5;
      const url = `${USNO}?date=${p.year}-${p.month}-${p.day}&coords=${LAT},${LON}&tz=-5&dst=${dst}`;
      const data = await getJson(url);
      const sun = sunPhenomena(data);
      const rise = clockMinutes(sun.sunrise), set = clockMinutes(sun.sunset);
      if (rise === null || set === null) throw new Error('USNO sunrise/sunset missing');
      const now = p.hour * 60 + p.minute;
      const remaining = set - now;
      const level = remaining <= 0 ? 'hold' : remaining < 180 ? 'watch' : 'good';
      const value = `${fmtClock(rise)} → ${fmtClock(set)}`;
      const detail = now < rise ? `Sunrise is in ${durationText(rise-now)}.` : remaining > 0 ? `${durationText(remaining)} of daylight remain.` : `Sunset was ${durationText(now-set)} ago.`;
      setCard('sunCard','sunValue','sunDetail',level,value,detail);
      if ($('sunTimes')) $('sunTimes').innerHTML = `<strong>Today at the trailhead:</strong> sunrise ${esc(fmtClock(rise))} · sunset ${esc(fmtClock(set))}${sun.civilEnd ? ` · civil twilight ends ${esc(fmtClock(clockMinutes(sun.civilEnd)))}` : ''}. The route clock keeps a 30-minute margin before sunset.`;
      const routes = [
        {name:'Cathedral Grove', allowance:75, note:'75-minute planning allowance'},
        {name:'Bertha Daubendiek', allowance:90, note:'90-minute planning allowance'},
        {name:'Both loops', allowance:150, note:'150-minute planning allowance'}
      ];
      if ($('routeTiming')) $('routeTiming').innerHTML = routes.map(r => {
        const latest = set - r.allowance - 30;
        const status = now > latest ? 'Past daylight-buffer start' : `Start by ${fmtClock(latest)}`;
        const finishNow = now + r.allowance;
        const nowLine = now < set ? (finishNow <= set-30 ? `Starting now leaves about ${durationText(set-30-finishNow)} spare before the buffer.` : finishNow <= set ? 'Starting now may finish before sunset, but not with the 30-minute margin.' : 'Starting now projects past sunset.') : 'It is already after sunset.';
        return `<div class="timing"><span>${esc(r.name)}</span><strong>${esc(status)}</strong><span>${esc(r.note)} + 30-minute buffer. ${esc(nowLine)}</span></div>`;
      }).join('');
    } catch (err) {
      setCard('sunCard','sunValue','sunDetail','watch','Sun times unavailable','Use the NWS daylight periods and leave a generous turnaround margin.');
      if ($('sunTimes')) $('sunTimes').textContent = 'Exact USNO sunrise/sunset data is temporarily unavailable. Use the hourly day/night forecast and leave extra margin.';
      if ($('routeTiming')) $('routeTiming').innerHTML = '<div class="quiet">Start-by calculations are unavailable until sunrise/sunset data returns.</div>';
      console.warn('[estivant-pines] sun data unavailable', err);
    }
  }

  function durationMs(iso) {
    const m = String(iso || '').match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?)?$/i);
    if (!m) return 0;
    return ((Number(m[1] || 0) * 24 + Number(m[2] || 0)) * 60 + Number(m[3] || 0)) * 60000;
  }
  function toSnowInches(value, unitCode) {
    const n = finite(value); if (n === null) return null;
    const unit = String(unitCode || '').toLowerCase();
    if (unit.includes('mm')) return n / 25.4;
    if (unit.includes('cm')) return n / 2.54;
    if (unit.includes('[in') || unit.endsWith(':in') || unit.includes('inch')) return n;
    if (unit.includes(':m') || unit.endsWith('unit:m')) return n * 39.3701;
    return n / 25.4;
  }
  function sumGridSnow(grid, hours) {
    const prop = grid?.properties?.snowfallAmount;
    const values = Array.isArray(prop?.values) ? prop.values : [];
    if (!values.length) return null;
    const now = Date.now(), cutoff = now + hours * 3600000;
    let total = 0, found = false;
    for (const row of values) {
      const [startText, durText] = String(row?.validTime || '').split('/');
      const start = Date.parse(startText), dur = durationMs(durText), amount = toSnowInches(row?.value, prop?.uom);
      if (!Number.isFinite(start) || !dur || amount === null) continue;
      const end = start + dur;
      const overlap = Math.max(0, Math.min(end, cutoff) - Math.max(start, now));
      if (!overlap) continue;
      found = true;
      total += amount * (overlap / dur);
    }
    return found ? total : 0;
  }
  function observedSnowDepth(obs) {
    const prop = obs?.snowDepth;
    if (!prop || finite(prop.value) === null) return null;
    return toSnowInches(prop.value, prop.unitCode || prop.uom);
  }
  function snowRead(grid, periods, obs) {
    const snow24 = sumGridSnow(grid, 24), snow48 = sumGridSnow(grid, 48), depth = observedSnowDepth(obs);
    const snowWords = periods.slice(0,24).some(p => /snow|flurr|blizzard|wintry/i.test(p?.shortForecast || ''));
    let level = 'good', value = 'No new snow signal';
    if (snow24 === null) { level = snowWords || (depth !== null && depth >= 1) ? 'watch' : 'good'; value = snowWords ? 'Snow possible' : 'Snow grid unavailable'; }
    else if (snow24 >= 3) { level = 'watch'; value = `${snow24.toFixed(1)} in / 24h`; }
    else if (snow24 >= 0.5) { level = 'watch'; value = `${snow24.toFixed(1)} in / 24h`; }
    else if (depth !== null && depth >= 1) { level = 'watch'; value = 'Snow nearby'; }
    const forecastBits = [];
    if (snow24 !== null) forecastBits.push(`${snow24.toFixed(1)} in forecast next 24h`);
    if (snow48 !== null) forecastBits.push(`${snow48.toFixed(1)} in through 48h`);
    if (depth !== null) forecastBits.push(`nearby station snow depth ${depth.toFixed(1)} in`);
    if (!forecastBits.length) forecastBits.push(snowWords ? 'hourly forecast mentions snow' : 'no quantitative snow amount available');
    const detail = `${forecastBits.join(' · ')}. Not a trail measurement.`;
    return { level, value, detail, snow24, snow48, depth, snowWords };
  }
  function renderSnowLong(read) {
    const el = $('snowLong'); if (!el) return;
    const parts = [];
    if (read.snow24 !== null) parts.push(`<strong>Next 24 hours:</strong> ${esc(read.snow24.toFixed(1))} in forecast snowfall.`);
    if (read.snow48 !== null) parts.push(`<strong>Through 48 hours:</strong> ${esc(read.snow48.toFixed(1))} in.`);
    if (read.depth !== null) parts.push(`<strong>Nearby observed snow depth:</strong> ${esc(read.depth.toFixed(1))} in, when the reporting station provides that field.`);
    if (!parts.length) parts.push('<strong>Quantitative snow amount is unavailable right now.</strong>');
    parts.push('Snow can be deeper or drifted under the Estivant canopy and on the unplowed approach. This is NWS grid and nearby-station context, not an on-trail sensor.');
    el.innerHTML = parts.join(' ');
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
    loadSun();
    try {
      const point = await getJson(`${NWS}/points/${LAT.toFixed(4)},${LON.toFixed(4)}`);
      const props = point?.properties || {};
      if (!props.forecastHourly) throw new Error('NWS point lookup did not return an hourly forecast');
      const requests = [
        getJson(props.forecastHourly),
        getJson(`${NWS}/alerts/active?point=${LAT.toFixed(4)},${LON.toFixed(4)}`).catch(() => ({features:[]})),
        props.observationStations ? getJson(props.observationStations).catch(() => null) : Promise.resolve(null),
        props.forecastGridData ? getJson(props.forecastGridData).catch(() => null) : Promise.resolve(null)
      ];
      const [forecast, alertData, stationData, gridData] = await Promise.all(requests);
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
      const snow = snowRead(gridData, periods, obs); setCard('snowCard','snowValue','snowDetail',snow.level,snow.value,snow.detail); renderSnowLong(snow);
      renderHourly(periods); renderAlerts(alerts);
      if ($('forestFeel')) $('forestFeel').textContent = forestFeel(obs);
      if ($('asOf')) $('asOf').textContent = `Live NWS read updated ${new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date())} ET · Estivant Pines trailhead ${LAT.toFixed(4)}, ${LON.toFixed(4)}.`;
    } catch (err) {
      setCard('hikeCard','hikeValue','hikeDetail','watch','Live weather unavailable','Use the National Weather Service forecast for Copper Harbor before leaving. The route and access guidance below remains available.');
      setCard('weatherCard','weatherValue','weatherDetail','watch','Unavailable','NWS live data could not be loaded.');
      setCard('snowCard','snowValue','snowDetail','watch','Unknown','NWS snowfall guidance could not be loaded.');
      setCard('bugCard','bugValue','bugDetail','watch','Unknown','Bring repellent in warm months when live observation data is unavailable.');
      if ($('hourly')) $('hourly').innerHTML = '<div class="quiet">NWS hourly forecast is temporarily unavailable.</div>';
      if ($('alerts')) $('alerts').innerHTML = '<div class="quiet">NWS alert check is temporarily unavailable. Check weather.gov before hiking.</div>';
      if ($('snowLong')) $('snowLong').textContent = 'NWS quantitative snowfall guidance is temporarily unavailable. In winter, assume the remote approach and forest can hold more snow than exposed Copper Harbor.';
      if ($('forestFeel')) $('forestFeel').textContent = 'Live nearby observation unavailable. This tool fails open to the source links rather than inventing conditions.';
      if ($('asOf')) $('asOf').textContent = 'Live NWS data is temporarily unavailable; source-backed route and access information remains below.';
      console.warn('[estivant-pines] live data unavailable', err);
    }
  }
  load();
})();
