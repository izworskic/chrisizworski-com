(() => {
  const $ = (id) => document.getElementById(id);
  const els = {
    liveDot: $('liveDot'), freshness: $('freshness'), refreshButton: $('refreshButton'), todayScore: $('todayScore'),
    opportunityEyebrow: $('opportunityEyebrow'), forecastTitle: $('forecastTitle'), recommendation: $('recommendation'), bestWindow: $('bestWindow'), bestViewpoint: $('bestViewpoint'),
    confidence: $('confidence'), componentMeters: $('componentMeters'), whyExplain: $('whyExplain'), errorCard: $('errorCard'),
    errorText: $('errorText'), retryButton: $('retryButton'), timeline: $('timeline'), viewpointGrid: $('viewpointGrid'),
    outlookGrid: $('outlookGrid'), sourceDetail: $('sourceDetail')
  };
  const TZ = 'America/New_York';
  const LAT = 43.0810;
  const LON = -79.0740;
  const SUNRISE_SUNSET_ALTITUDE = -0.833;
  let controller;

  const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  const shortTimeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric' });
  const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' });
  const fullDateFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' });

  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  const rad = (d) => d * Math.PI / 180;
  const deg = (r) => r * 180 / Math.PI;

  function localDateKey(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const out = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${out.year}-${out.month}-${out.day}`;
  }

  function solarPosition(date) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const t = (jd - 2451545.0) / 36525;
    const geomMeanLong = ((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360 + 360) % 360;
    const geomMeanAnom = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    const ecc = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
    const sunEq = Math.sin(rad(geomMeanAnom)) * (1.914602 - t * (0.004817 + 0.000014 * t))
      + Math.sin(rad(2 * geomMeanAnom)) * (0.019993 - 0.000101 * t)
      + Math.sin(rad(3 * geomMeanAnom)) * 0.000289;
    const trueLong = geomMeanLong + sunEq;
    const omega = 125.04 - 1934.136 * t;
    const appLong = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega));
    const meanObliq = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
    const obliq = meanObliq + 0.00256 * Math.cos(rad(omega));
    const decl = deg(Math.asin(Math.sin(rad(obliq)) * Math.sin(rad(appLong))));
    const y = Math.tan(rad(obliq / 2)) ** 2;
    const eqTime = 4 * deg(y * Math.sin(2 * rad(geomMeanLong)) - 2 * ecc * Math.sin(rad(geomMeanAnom))
      + 4 * ecc * y * Math.sin(rad(geomMeanAnom)) * Math.cos(2 * rad(geomMeanLong))
      - 0.5 * y * y * Math.sin(4 * rad(geomMeanLong))
      - 1.25 * ecc * ecc * Math.sin(2 * rad(geomMeanAnom)));
    const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
    let trueSolar = (utcMinutes + eqTime + 4 * LON) % 1440;
    if (trueSolar < 0) trueSolar += 1440;
    let hourAngle = trueSolar / 4 - 180;
    if (hourAngle < -180) hourAngle += 360;
    const cosZenith = clamp(
      Math.sin(rad(LAT)) * Math.sin(rad(decl)) + Math.cos(rad(LAT)) * Math.cos(rad(decl)) * Math.cos(rad(hourAngle)),
      -1, 1
    );
    return { elevation: 90 - deg(Math.acos(cosZenith)) };
  }

  function findNextHorizonCrossing(start, rising) {
    let previous = solarPosition(start).elevation;
    for (let i = 1; i <= 432; i += 1) {
      const at = new Date(start.getTime() + i * 5 * 60000);
      const current = solarPosition(at).elevation;
      if (rising && previous <= SUNRISE_SUNSET_ALTITUDE && current > SUNRISE_SUNSET_ALTITUDE) return at;
      if (!rising && previous > SUNRISE_SUNSET_ALTITUDE && current <= SUNRISE_SUNSET_ALTITUDE) return at;
      previous = current;
    }
    return null;
  }

  function daylightState(now = new Date()) {
    const elevation = solarPosition(now).elevation;
    const isDaylight = elevation > SUNRISE_SUNSET_ALTITUDE;
    return {
      isDaylight,
      elevation,
      nextSunrise: isDaylight ? null : findNextHorizonCrossing(now, true),
      nextSunset: isDaylight ? findNextHorizonCrossing(now, false) : null
    };
  }

  function scoreClass(score) {
    return score >= 75 ? 'score-high' : score >= 50 ? 'score-mid' : 'score-low';
  }

  function opportunityLabel(score) {
    if (score >= 85) return 'Excellent rainbow opportunity';
    if (score >= 70) return 'Good rainbow opportunity';
    if (score >= 50) return 'Marginal rainbow opportunity';
    return 'Poor rainbow opportunity';
  }

  function formatWindow(window) {
    if (!window) return 'No sustained strong window';
    return `${timeFmt.format(new Date(window.start))}–${timeFmt.format(new Date(window.end))}`;
  }

  function formatPeak(iso) {
    return iso ? timeFmt.format(new Date(iso)) : '—';
  }

  function setLoading(isLoading) {
    els.refreshButton.disabled = isLoading;
    els.retryButton.disabled = isLoading;
    els.refreshButton.textContent = isLoading ? 'Refreshing…' : 'Refresh';
    if (isLoading) {
      els.liveDot.className = 'live-dot is-loading';
      els.freshness.textContent = 'Loading live NWS forecast…';
    }
  }

  function renderComponents(components) {
    const defs = [
      ['Optical geometry', components?.geometry],
      ['Direct sunlight', components?.sunlight],
      ['Mist + wind', components?.mist],
      ['Visibility', components?.visibility]
    ];
    els.componentMeters.innerHTML = defs.map(([label, value]) => {
      const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
      const text = Number.isFinite(value) ? `${Math.round(value)}%` : '—';
      return `<div class="meter-row"><div><span>${label}</span><strong>${text}</strong></div><div class="meter" aria-label="${label}: ${text}"><i style="width:${safe}%"></i></div></div>`;
    }).join('');
  }

  function renderNightState(days, state) {
    const nextRise = state.nextSunrise;
    const nextDayKey = nextRise ? localDateKey(nextRise) : null;
    const nextDay = days?.find((d) => d.date === nextDayKey) || days?.[1] || days?.[0];
    const nextBest = nextDay?.windows?.[0] || null;
    const scoreRow = els.todayScore?.closest('.score-row');
    const whyCard = els.componentMeters?.closest('.why-card');
    if (scoreRow) scoreRow.hidden = true;
    if (whyCard) whyCard.hidden = true;
    if (els.opportunityEyebrow) els.opportunityEyebrow.textContent = 'Next rainbow opportunity';
    els.forecastTitle.textContent = 'Next forecast window';
    const riseText = nextRise ? timeFmt.format(nextRise) : null;
    if (nextBest) {
      els.recommendation.textContent = `The next modeled window is ${formatWindow(nextBest)}${nextDay?.bestViewpoint ? ` from ${nextDay.bestViewpoint}` : ''}.`;
      els.bestWindow.textContent = formatWindow(nextBest);
    } else {
      els.recommendation.textContent = riseText ? `The next forecast window will be evaluated after about ${riseText}.` : 'The next forecast window will appear here when available.';
      els.bestWindow.textContent = riseText ? `Around ${riseText}` : '—';
    }
    els.bestViewpoint.textContent = nextDay?.bestViewpoint ? `${nextDay.bestViewpoint}${nextDay.bestFall ? ` · ${nextDay.bestFall}` : ''}` : '—';
    els.confidence.textContent = nextDay?.confidence || '—';
  }

  function renderToday(day, days) {
    const state = daylightState();
    if (!state.isDaylight) {
      renderNightState(days, state);
      return;
    }
    const scoreRow = els.todayScore?.closest('.score-row');
    const whyCard = els.componentMeters?.closest('.why-card');
    if (scoreRow) scoreRow.hidden = false;
    if (whyCard) whyCard.hidden = false;
    if (els.opportunityEyebrow) els.opportunityEyebrow.textContent = 'Today’s rainbow opportunity';
    const best = day?.windows?.[0] || null;
    const score = day?.peak ?? 0;
    els.todayScore.textContent = String(score);
    els.todayScore.className = `score ${scoreClass(score)}`;
    els.forecastTitle.textContent = opportunityLabel(score);
    els.recommendation.textContent = day?.recommendation || 'The model could not form a recommendation for today.';
    els.bestWindow.textContent = best ? formatWindow(best) : (day?.peakAt ? `Peak near ${formatPeak(day.peakAt)}` : 'No window available');
    els.bestViewpoint.textContent = day?.bestViewpoint ? `${day.bestViewpoint}${day.bestFall ? ` · ${day.bestFall}` : ''}` : '—';
    els.confidence.textContent = day?.confidence || '—';
    renderComponents(day?.components);
    if (day?.weatherAtPeak) {
      const w = day.weatherAtPeak;
      const sky = Number.isFinite(w.skyCover) ? `${Math.round(w.skyCover)}% cloud cover` : 'cloud coverage unavailable';
      const wind = Number.isFinite(w.windSpeedKmh) ? `${Math.round(w.windSpeedKmh)} km/h wind` : 'wind speed unavailable';
      els.whyExplain.textContent = `At the modeled peak: ${sky}, ${wind}. Geometry is evaluated against the ~42° primary-rainbow cone.`;
    }
  }

  function renderTimeline(day) {
    const rows = day?.hourly || [];
    if (!rows.length) {
      els.timeline.innerHTML = '<p class="loading-copy">No timeline is available from the current model.</p>';
      return;
    }
    els.timeline.innerHTML = rows.map((row) => {
      const height = Math.max(3, Math.min(100, row.score || 0));
      return `<div class="timeline-item" title="${row.viewpoint || 'Best available viewpoint'}">
        <div class="timeline-bar-wrap"><div class="timeline-bar" style="height:${height}%"></div></div>
        <strong class="${scoreClass(row.score)}">${row.score}</strong>
        <span>${shortTimeFmt.format(new Date(row.at))}</span>
      </div>`;
    }).join('');
  }

  function renderViewpoints(viewpoints) {
    if (!Array.isArray(viewpoints) || !viewpoints.length) {
      els.viewpointGrid.innerHTML = '<p class="loading-copy">No viewpoint ranking is available.</p>';
      return;
    }
    els.viewpointGrid.innerHTML = viewpoints.map((v, index) => `<article class="viewpoint-card ${index === 0 ? 'is-best' : ''}">
      <div class="rank">${index + 1}</div>
      <h3>${v.name}</h3>
      <p>${v.side} side · ${v.fall || 'Best mist source varies'}</p>
      <div class="mini-score ${scoreClass(v.peak)}">${v.peak}<small>/100</small></div>
      <p>Best near <strong>${formatPeak(v.peakAt)}</strong></p>
      <p>${v.note || ''}</p>
    </article>`).join('');
  }

  function renderOutlook(days) {
    if (!Array.isArray(days) || !days.length) {
      els.outlookGrid.innerHTML = '<p class="loading-copy">The forecast outlook is unavailable.</p>';
      return;
    }
    els.outlookGrid.innerHTML = days.map((day, index) => {
      const best = day.windows?.[0];
      return `<article class="outlook-card">
        <p class="eyebrow">${index === 0 ? 'Today' : dayFmt.format(new Date(`${day.date}T16:00:00Z`))}</p>
        <div class="mini-score ${scoreClass(day.peak)}">${day.peak}<small>/100</small></div>
        <h3>${opportunityLabel(day.peak)}</h3>
        <p>${best ? `${formatWindow(best)} · ${best.viewpoint}` : `Peak ${formatPeak(day.peakAt)} · ${day.bestViewpoint || 'viewpoint uncertain'}`}</p>
        <p>Confidence: ${day.confidence || '—'}</p>
      </article>`;
    }).join('');
  }

  function renderSource(data) {
    const fetched = data?.source?.fetchedAt ? new Date(data.source.fetchedAt) : null;
    const label = fetched && !Number.isNaN(fetched.getTime()) ? `${fullDateFmt.format(fetched)} at ${timeFmt.format(fetched)}` : 'just now';
    els.liveDot.className = 'live-dot is-live';
    els.freshness.textContent = `Live NWS grid fetched ${label}`;
    els.sourceDetail.textContent = `Weather: ${data?.source?.name || 'National Weather Service'}. Model version ${data?.model?.version || '1.0.0'} evaluates the sun and mist geometry every ${data?.model?.intervalMinutes || 10} minutes. Last live fetch: ${label}.`;
  }

  function showError(error) {
    els.errorCard.hidden = false;
    els.errorText.textContent = `${error?.message || 'The live source did not return usable data.'} No synthetic forecast is being shown.`;
    els.liveDot.className = 'live-dot is-error';
    els.freshness.textContent = 'Live NWS refresh failed';
    els.forecastTitle.textContent = 'Live forecast unavailable';
    els.recommendation.textContent = 'The tool is withholding a score rather than substituting stale or made-up weather.';
    els.todayScore.textContent = '—';
    els.bestWindow.textContent = '—';
    els.bestViewpoint.textContent = '—';
    els.confidence.textContent = '—';
  }

  async function loadForecast() {
    setLoading(true);
    els.errorCard.hidden = true;
    if (controller) controller.abort();
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/niagara-rainbow', { cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `Live source returned HTTP ${response.status}`);
      renderToday(data.days?.[0], data.days);
      renderTimeline(data.days?.[0]);
      renderViewpoints(data.viewpoints);
      renderOutlook(data.days);
      renderSource(data);
    } catch (error) {
      if (error?.name === 'AbortError') showError(new Error('The live weather request timed out.'));
      else showError(error);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  els.refreshButton?.addEventListener('click', loadForecast);
  els.retryButton?.addEventListener('click', loadForecast);
  loadForecast();
})();