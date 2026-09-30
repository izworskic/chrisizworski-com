/* Michigan Ice Report live decision engine.
   Observed regional ice, lake-wide trends, thermal history, and forecast forcing
   are deliberately kept separate. No state is ever a safety rating. */
(function () {
  'use strict';

  var REGIONS = [
    { slug: 'saginaw-bay', short: 'Saginaw Bay', nws: 'KMBS', lake: 'huron', lakeName: 'Lake Huron' },
    { slug: 'houghton-lake', short: 'Houghton Lake', nws: 'KHTL', lake: null, lakeName: null },
    { slug: 'lake-st-clair', short: 'Lake St. Clair', nws: 'KDET', lake: 'stclair', lakeName: 'Lake St. Clair' },
    { slug: 'little-bay-de-noc', short: 'Little Bay de Noc', nws: 'KESC', lake: 'michigan', lakeName: 'Lake Michigan' },
    { slug: 'grand-traverse-bay', short: 'Grand Traverse Bay', nws: 'KTVC', lake: 'michigan', lakeName: 'Lake Michigan' },
    { slug: 'burt-mullett', short: 'Burt and Mullett', nws: 'KAPN', lake: null, lakeName: null }
  ];

  function cToF(c) { return c * 9 / 5 + 32; }
  function msToMph(ms) { return ms * 2.23694; }
  function cardinal(deg) {
    if (deg === null || deg === undefined) return '';
    var p = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return p[Math.round(deg / 22.5) % 16];
  }
  function set(id, txt) {
    var el = document.getElementById(id);
    if (el) el.textContent = txt;
  }
  function fmt(n, dp) {
    if (n === null || n === undefined || isNaN(n)) return 'n/a';
    return Number(n).toFixed(dp === undefined ? 0 : dp);
  }
  function signed(n, dp) {
    if (n === null || n === undefined || isNaN(n)) return 'n/a';
    return (Number(n) >= 0 ? '+' : '') + Number(n).toFixed(dp === undefined ? 0 : dp);
  }
  function inIceSeason(d) {
    var m = d.getMonth() + 1;
    return m >= 11 || m <= 3;
  }
  function dateText(v) {
    if (!v) return 'time unavailable';
    var d = new Date(v);
    if (isNaN(d.getTime())) return 'time unavailable';
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function stageFor(afdd, d, tempF) {
    if (afdd === null || afdd === undefined) return { label: inIceSeason(d) ? 'No thermal data' : 'Off season', cls: '' };
    if (!inIceSeason(d)) return { label: 'Off season', cls: '' };
    if (tempF !== null && tempF !== undefined && tempF > 40 && afdd > 50) return { label: 'Thaw underway', cls: 'thaw' };
    if (afdd < 25) return { label: 'Open-water thermal stage', cls: '' };
    if (afdd < 150) return { label: 'Freeze-up thermal stage', cls: '' };
    if (afdd < 350) return { label: 'Cold accumulating', cls: 'cold' };
    if (afdd < 700) return { label: 'Sustained cold', cls: 'cold' };
    return { label: 'Deep cold', cls: 'cold' };
  }

  function fetchServer() {
    return fetch('/api/ice').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function fetchNow(region) {
    var u = '/api/ice-now' + (region ? '?region=' + encodeURIComponent(region) : '');
    return fetch(u).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function fetchObs(region) {
    return fetch('https://api.weather.gov/stations/' + region.nws + '/observations/latest',
      { headers: { Accept: 'application/geo+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.properties) return { region: region, ok: false };
        var o = j.properties;
        var t = o.temperature && o.temperature.value;
        var ws = o.windSpeed && o.windSpeed.value;
        var wd = o.windDirection && o.windDirection.value;
        return {
          region: region, ok: true,
          tempF: (t === null || t === undefined) ? null : cToF(t),
          windMph: (ws === null || ws === undefined) ? null : msToMph(ws),
          windDir: (wd === null || wd === undefined) ? null : wd,
          obsTime: o.timestamp ? new Date(o.timestamp) : null
        };
      })
      .catch(function () { return { region: region, ok: false }; });
  }

  function coldMap(server) {
    var out = {};
    if (server && Array.isArray(server.cold)) server.cold.forEach(function (c) { out[c.slug] = c; });
    return out;
  }
  function obsMap(obs) {
    var out = {};
    (obs || []).forEach(function (o) { if (o && o.region) out[o.region.slug] = o; });
    return out;
  }
  function regional(nowData, slug) {
    return nowData && nowData.observed && nowData.observed.regions ? nowData.observed.regions[slug] : null;
  }
  function usableRegional(r) {
    return !!(r && r.supported && r.available && !r.stale && r.rangeLabel);
  }
  function usableLakeWide(nowData) {
    var l = nowData && nowData.observed ? nowData.observed.lakeWide : null;
    return l && l.current && !l.stale ? l : null;
  }

  function paintTrack(container, afdd, normal) {
    if (!container) return;
    var fill = container.querySelector('.acc-fill');
    var mark = container.querySelector('.acc-normal');
    var nowEl = container.querySelector('[data-f="accnow"]');
    var normEl = container.querySelector('[data-f="accnorm"]');
    var a = (afdd === null || afdd === undefined) ? 0 : afdd;
    var n = (normal === null || normal === undefined) ? 0 : normal;
    var scale = Math.max(n * 2, a * 1.15, 100);
    if (fill) fill.style.width = Math.min(100, (a / scale) * 100) + '%';
    if (mark) mark.style.left = Math.min(100, (n / scale) * 100) + '%';
    if (nowEl) nowEl.textContent = (afdd === null || afdd === undefined) ? 'no data' : a + ' F days';
    if (normEl) normEl.textContent = (normal === null || normal === undefined) ? 'normal n/a' : 'normal ' + n;
  }

  function installNowStyles() {
    if (document.getElementById('ice-now-styles')) return;
    var style = document.createElement('style');
    style.id = 'ice-now-styles';
    style.textContent = [
      '.ice-now{margin:14px 0 0;border:1px solid #9fc3cc;border-left:5px solid #16606b;border-radius:13px;background:rgba(255,255,255,.82);padding:14px 16px}',
      '.ice-now__top{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}',
      '.ice-now__kicker{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:#5c7280}',
      '.ice-now__headline{font-family:"Fraunces",Georgia,serif;font-size:22px;line-height:1.18;margin:3px 0 2px}',
      '.ice-now__stamp{font-size:11px;color:#5c7280}',
      '.ice-now__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}',
      '.ice-now__cell{border:1px solid #d3e1e5;border-radius:9px;padding:9px 10px;background:rgba(247,251,252,.82)}',
      '.ice-now__label{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#5c7280}',
      '.ice-now__value{font-size:15px;font-weight:700;line-height:1.25;margin-top:2px}',
      '.ice-now__why{font-size:12px;color:#3f5764;line-height:1.4;margin-top:4px}',
      '.ice-now__limit{font-size:11.5px;color:#5c7280;margin:10px 0 0}',
      '.ice-now__stale{border-left-color:#b4472b}',
      '@media(max-width:620px){.ice-now__grid{grid-template-columns:1fr}.ice-now{padding:12px 13px}.ice-now__headline{font-size:20px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureNowPanel() {
    installNowStyles();
    var panel = document.getElementById('ice-now');
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = 'ice-now';
    panel.className = 'ice-now';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = '<div class="ice-now__top"><div><div class="ice-now__kicker">ICE NOW</div>' +
      '<div class="ice-now__headline" id="ice-now-headline">Loading the latest authoritative observations…</div></div>' +
      '<div class="ice-now__stamp" id="ice-now-stamp"></div></div>' +
      '<div class="ice-now__grid" id="ice-now-grid"></div>' +
      '<p class="ice-now__limit" id="ice-now-limit">Observed concentration, thermal history, and forecast weather are separate signals. None measures recreational ice thickness.</p>';
    var h1 = document.querySelector('h1.page-title, h1');
    if (h1 && h1.parentNode) h1.parentNode.insertBefore(panel, h1.nextSibling);
    return panel;
  }

  function addNowCell(grid, label, value, why) {
    var cell = document.createElement('div');
    cell.className = 'ice-now__cell';
    var l = document.createElement('div'); l.className = 'ice-now__label'; l.textContent = label;
    var v = document.createElement('div'); v.className = 'ice-now__value'; v.textContent = value;
    var w = document.createElement('div'); w.className = 'ice-now__why'; w.textContent = why;
    cell.appendChild(l); cell.appendChild(v); cell.appendChild(w); grid.appendChild(cell);
  }

  function fastestCold(coldBySlug) {
    var best = null;
    REGIONS.forEach(function (r) {
      var c = coldBySlug[r.slug];
      if (!c || c.change72h === null || c.change72h === undefined) return;
      if (!best || c.change72h > best.change72h) best = { name: r.short, change72h: c.change72h };
    });
    return best;
  }

  function renderNowIndex(server, nowData) {
    var panel = ensureNowPanel();
    var grid = document.getElementById('ice-now-grid');
    var headline = document.getElementById('ice-now-headline');
    var stamp = document.getElementById('ice-now-stamp');
    var limit = document.getElementById('ice-now-limit');
    if (!grid || !headline) return;
    grid.textContent = '';
    var now = new Date();
    var cold = coldMap(server);

    if (!inIceSeason(now)) {
      headline.textContent = 'Off season — no stale spring ice chart is being presented as current.';
      addNowCell(grid, 'Live ice season', 'November–March', 'Daily regional ice analysis becomes decision-useful once freeze-up begins.');
      addNowCell(grid, 'Current status', 'Off season', 'The monitor remains indexed and ready, but it does not imply September ice exists.');
      addNowCell(grid, 'Next signal', 'Cold accumulation', 'AFDD restarts with the winter season and is compared with a ten-year station normal.');
      stamp.textContent = 'Season state checked ' + dateText(new Date().toISOString());
      limit.textContent = 'This is an intentional stale-data state: old winter observations are withheld instead of being relabeled as live.';
      return;
    }

    var lake = usableLakeWide(nowData);
    var sag = regional(nowData, 'saginaw-bay');
    var fc = nowData && nowData.forecast && nowData.forecast.next72h ? nowData.forecast.next72h : null;
    var fastest = fastestCold(cold);

    if (lake) {
      headline.textContent = 'Great Lakes ice: ' + fmt(lake.current.total, 1) + '% today, ' + signed(lake.change72h.total, 1) + ' points over 72 hours.';
      addNowCell(grid, 'Observed · Great Lakes', fmt(lake.current.total, 1) + '% cover',
        'NOAA GLERL; ' + signed(lake.change24h.total, 1) + ' pt/24h · ' + signed(lake.change7d.total, 1) + ' pt/7d.');
    } else {
      headline.textContent = 'The lake-wide ice observation is unavailable or stale.';
      addNowCell(grid, 'Observed · Great Lakes', 'Unavailable', 'A stale upstream value is not promoted as current.');
      panel.classList.add('ice-now__stale');
    }

    if (usableRegional(sag)) {
      addNowCell(grid, 'Observed · Saginaw Bay', sag.rangeLabel,
        'USNIC daily analysis sampled across the bay · confidence ' + sag.confidence + '.');
    } else if (sag && sag.stale) {
      addNowCell(grid, 'Observed · Saginaw Bay', 'Stale / withheld', 'The regional chart is older than the live threshold.');
    } else {
      addNowCell(grid, 'Observed · Saginaw Bay', 'Unavailable', 'No usable regional concentration classification is available right now.');
    }

    if (fc) {
      addNowCell(grid, 'Forecast · next 72h', fc.forcing,
        fc.freezeHours + ' forecast hours at/below 32°F · max wind ' + fc.maxWindMph + ' mph.');
    } else {
      addNowCell(grid, 'Forecast · next 72h', 'Unavailable', 'Current NWS forecast forcing could not be retrieved.');
    }

    var prior = document.getElementById('ice-now-fastest');
    if (prior) prior.remove();
    if (fastest) {
      var extra = document.createElement('div');
      extra.id = 'ice-now-fastest';
      extra.className = 'ice-now__stamp';
      extra.style.marginTop = '9px';
      extra.textContent = 'Strongest 72-hour cold accumulation among tracked stations: ' + fastest.name +
        ' (' + signed(fastest.change72h) + ' F-degree-days). This is a thermal signal, not observed ice growth.';
      grid.parentNode.insertBefore(extra, limit);
    }
    stamp.textContent = lake ? 'Lake-wide observation valid ' + dateText(lake.observedAt) : 'Observation time unavailable';
    limit.textContent = 'Observed concentration is not thickness. Forecast weather describes forcing, not cracks, sheet movement, local thickness, or safety.';
  }

  function relabelIndexStats() {
    var row = document.querySelector('.stat-row');
    if (!row) return;
    var stats = row.querySelectorAll('.stat');
    if (stats[1]) {
      var l1 = stats[1].querySelector('.lbl'), s1 = stats[1].querySelector('.sub');
      if (l1) l1.textContent = 'Cold vs normal';
      if (s1) s1.textContent = 'tracked stations above 10y normal';
    }
    if (stats[2]) {
      var l2 = stats[2].querySelector('.lbl'), s2 = stats[2].querySelector('.sub');
      if (l2) l2.textContent = 'Great Lakes ice';
      if (s2) s2.textContent = 'all lakes combined';
    }
    if (stats[3]) {
      var l3 = stats[3].querySelector('.lbl');
      if (l3) l3.textContent = 'Huron vs 54 year avg';
    }
  }

  function renderIndex(server, nowData, obs) {
    renderNowIndex(server, nowData);
    relabelIndexStats();
    var now = new Date();
    var cold = coldMap(server);
    var om = obsMap(obs);

    set('s-stage', inIceSeason(now) ? 'Ice season' : 'Off season');
    set('season-stage', inIceSeason(now) ? 'Ice season' : 'Off season');

    var comparable = 0, above = 0;
    REGIONS.forEach(function (r) {
      var c = cold[r.slug];
      if (c && c.afdd !== null && c.afdd !== undefined && c.normal !== null && c.normal !== undefined) {
        comparable += 1;
        if (c.afdd > c.normal) above += 1;
      }
    });
    set('s-afdd', inIceSeason(now) && comparable ? above + '/' + comparable : '—');

    var lake = usableLakeWide(nowData);
    set('s-cover', inIceSeason(now) && lake ? fmt(lake.current.total, 1) + '%' : (inIceSeason(now) ? 'n/a' : '—'));
    set('s-cover-sub', inIceSeason(now) ? 'all Great Lakes combined' : 'off season');

    var hur = server && server.climatology ? server.climatology.huron : null;
    if (inIceSeason(now) && hur && lake && lake.current.huron !== null && lake.current.huron !== undefined) {
      set('s-vsnorm', signed(lake.current.huron - hur.mean, 1) + ' pts');
    } else set('s-vsnorm', '—');

    REGIONS.forEach(function (r) {
      var c = cold[r.slug] || {};
      paintTrack(document.getElementById('acc-' + r.slug), c.afdd, c.normal);
    });
    var accStamp = document.getElementById('acc-stamp');
    if (accStamp) {
      accStamp.textContent = !inIceSeason(now)
        ? 'Off season. Accumulated cold begins rebuilding with the winter season; old winter totals are not carried forward as a live condition.'
        : 'Accumulated freezing degree days come from daily ACIS station records. The marker is the ten-year station normal for this date; the 72-hour change is used only as a thermal-growth signal.';
    }

    var table = document.getElementById('board');
    if (table) {
      var th = table.closest('table') && table.closest('table').querySelectorAll('th');
      if (th && th[4]) th[4].textContent = 'Observed regional ice';
    }

    REGIONS.forEach(function (r) {
      var row = document.getElementById('row-' + r.slug);
      if (!row) return;
      var c = cold[r.slug] || {};
      var o = om[r.slug] || { ok: false };
      var s = stageFor(c.afdd, now, o.ok ? o.tempF : null);
      var ro = regional(nowData, r.slug);
      var observedText = r.lake ? 'unavailable' : 'no remote obs';
      if (usableRegional(ro)) observedText = ro.rangeLabel;
      else if (ro && ro.stale) observedText = 'stale';
      var vals = {
        afdd: (c.afdd === null || c.afdd === undefined) ? 'n/a' : c.afdd + (c.change72h === null || c.change72h === undefined ? '' : ' (' + signed(c.change72h) + '/72h)'),
        temp: o.ok && o.tempF !== null ? fmt(o.tempF) : 'n/a',
        wind: o.ok && o.windMph !== null ? fmt(o.windMph) + ' ' + cardinal(o.windDir) : 'n/a',
        cover: observedText,
        stage: s.label
      };
      var cells = row.querySelectorAll('[data-f]');
      for (var i = 0; i < cells.length; i++) {
        var f = cells[i].getAttribute('data-f');
        if (f === 'stage') cells[i].innerHTML = '<span class="badge ' + s.cls + '">' + s.label + '</span>';
        else if (vals[f] !== undefined) cells[i].textContent = vals[f];
      }
    });

    var bs = document.getElementById('board-stamp');
    if (bs) {
      bs.textContent = 'Regional Great Lakes values are sampled from the daily NOAA/NWS USNIC concentration analysis and expose source freshness. Inland waters have no comparable remote ice observation. Season cold is AFDD; current air and wind are nearby NWS station observations. None is a safety rating.';
    }

    var readEl = document.getElementById('the-read');
    if (readEl) {
      var parts = [];
      if (!inIceSeason(now)) {
        parts.push('Off season. The live ice monitor intentionally withholds old winter observations rather than presenting them as current.');
      } else {
        if (lake) parts.push('Combined Great Lakes ice cover is ' + fmt(lake.current.total, 1) + '%, changing ' + signed(lake.change72h.total, 1) + ' points over 72 hours.');
        var fastest = fastestCold(cold);
        if (fastest) parts.push('The strongest 72-hour cold accumulation among the six tracked stations is ' + fastest.name + ' at ' + signed(fastest.change72h) + ' F-degree-days; that describes thermal forcing, not measured ice growth.');
        var sag = regional(nowData, 'saginaw-bay');
        if (usableRegional(sag)) parts.push('The current USNIC Saginaw Bay analysis spans ' + sag.rangeLabel + '.');
        var fc = nowData && nowData.forecast && nowData.forecast.next72h;
        if (fc) parts.push('For Saginaw Bay, the next 72 hours show ' + fc.forcing + ' with ' + fc.freezeHours + ' forecast hours at or below 32°F and a maximum forecast wind near ' + fc.maxWindMph + ' mph.');
      }
      parts.push('Observed concentration, accumulated cold, and forecast weather are different signals; none measures the ice where a person plans to stand.');
      readEl.textContent = parts.join(' ');
    }
    var rst = document.getElementById('read-stamp');
    if (rst) {
      rst.textContent = 'Lake-wide ice: NOAA GLERL (valid ' + (lake ? dateText(lake.observedAt) : 'unavailable') + '). Regional ice: NOAA/NWS USNIC. Thermal history: ACIS. Forecast: NWS. Stale values are withheld from the live read.';
    }
  }

  function relabelRegionCover(region) {
    var el = document.getElementById('r-cover');
    if (!el) return;
    var stat = el.closest('.stat');
    if (!stat) return;
    var lbl = stat.querySelector('.lbl');
    var sub = stat.querySelector('.sub');
    if (lbl) lbl.textContent = 'Regional ice observation';
    if (sub) sub.textContent = region.lake ? 'USNIC chart; not thickness' : 'not remotely observed';
  }

  function renderNowRegion(region, server, nowData, c) {
    var panel = ensureNowPanel();
    var grid = document.getElementById('ice-now-grid');
    var headline = document.getElementById('ice-now-headline');
    var stamp = document.getElementById('ice-now-stamp');
    var limit = document.getElementById('ice-now-limit');
    if (!grid || !headline) return;
    grid.textContent = '';
    var now = new Date();

    if (!inIceSeason(now)) {
      headline.textContent = region.short + ': off season — old winter observations are withheld.';
      addNowCell(grid, 'Observed ice', 'Off season', region.lake ? 'Regional USNIC ice concentration will appear during the live winter window.' : 'No comparable remote ice-analysis product exists for this inland lake.');
      addNowCell(grid, 'Thermal history', 'Resumes in winter', 'AFDD is rebuilt from daily station temperatures and compared with a ten-year normal.');
      addNowCell(grid, 'Forecast forcing', 'Not interpreted for ice', 'Warm-season weather is not converted into a winter ice signal.');
      stamp.textContent = 'Season state checked ' + dateText(new Date().toISOString());
      limit.textContent = 'No stale spring value is being relabeled as current.';
      return;
    }

    var ro = regional(nowData, region.slug);
    var fc = nowData && nowData.forecast && nowData.forecast.next72h ? nowData.forecast.next72h : null;
    if (usableRegional(ro)) {
      headline.textContent = region.short + ': observed regional concentration ' + ro.rangeLabel + '.';
      addNowCell(grid, 'Observed ice', ro.rangeLabel, 'USNIC daily analysis · ' + ro.samplesMatched + '/' + ro.samplesExpected + ' water samples matched · confidence ' + ro.confidence + '.');
      stamp.textContent = 'Regional analysis valid ' + dateText(ro.validAt);
    } else if (region.lake && ro && ro.stale) {
      headline.textContent = region.short + ': the regional ice analysis is stale, so it is withheld.';
      addNowCell(grid, 'Observed ice', 'Stale / withheld', 'A fresh fetch time does not make an old source observation current.');
      panel.classList.add('ice-now__stale');
    } else if (region.lake) {
      headline.textContent = region.short + ': no usable regional ice observation is available right now.';
      addNowCell(grid, 'Observed ice', 'Unavailable', 'This is not interpreted as ice-free water.');
    } else {
      headline.textContent = region.short + ': no comparable remote ice observation exists for this inland water.';
      addNowCell(grid, 'Observed ice', 'Not remotely observed', 'The product does not substitute a Great Lakes number for an inland lake.');
    }

    if (c && c.afdd !== null && c.afdd !== undefined) {
      addNowCell(grid, 'Thermal history', c.afdd + ' F-degree-days',
        (c.change72h === null || c.change72h === undefined ? '72-hour change unavailable.' : signed(c.change72h) + ' F-degree-days over 72h') +
        (c.normal === null || c.normal === undefined ? '.' : ' · 10y normal ' + c.normal + '.'));
    } else addNowCell(grid, 'Thermal history', 'Unavailable', 'The nearby ACIS station record could not be retrieved.');

    if (fc) {
      addNowCell(grid, 'Forecast · next 72h', fc.forcing,
        fc.freezeHours + 'h at/below 32°F · ' + fc.minTempF + '–' + fc.maxTempF + '°F · max wind ' + fc.maxWindMph + ' mph.');
    } else addNowCell(grid, 'Forecast · next 72h', 'Unavailable', 'The NWS forecast signal could not be retrieved.');

    limit.textContent = 'Observed regional concentration is not thickness. Thermal history and forecast weather can explain direction of pressure on the ice system, but they cannot establish local cracks, quality, current, thickness, or safety.';
  }

  function renderRegion(slug, server, nowData, o) {
    var now = new Date();
    var region = REGIONS.filter(function (r) { return r.slug === slug; })[0];
    if (!region) return;
    var cold = coldMap(server);
    var c = cold[slug] || null;
    var afdd = c ? c.afdd : null;
    var normal = c ? c.normal : null;
    var s = stageFor(afdd, now, o && o.ok ? o.tempF : null);
    var ro = regional(nowData, slug);

    renderNowRegion(region, server, nowData, c);
    relabelRegionCover(region);

    set('s-stage', s.label);
    set('season-stage', s.label);
    set('r-afdd', afdd === null || afdd === undefined ? 'n/a' : afdd);
    if (normal === null || normal === undefined || afdd === null || afdd === undefined) set('r-vsnorm', 'n/a');
    else set('r-vsnorm', signed(afdd - normal));
    if (o && o.ok) {
      set('r-temp', o.tempF !== null ? fmt(o.tempF) : 'n/a');
      set('r-wind', o.windMph !== null ? fmt(o.windMph) : 'n/a');
      set('r-wind-sub', o.windDir !== null ? 'out of the ' + cardinal(o.windDir) : 'mph');
    } else {
      set('r-temp', 'n/a'); set('r-wind', 'n/a');
    }

    if (!inIceSeason(now)) set('r-cover', 'off season');
    else if (usableRegional(ro)) set('r-cover', ro.rangeLabel);
    else if (!region.lake) set('r-cover', 'no remote obs');
    else if (ro && ro.stale) set('r-cover', 'stale');
    else set('r-cover', 'unavailable');

    paintTrack(document.getElementById('acc-region'), afdd, normal);

    var parts = [];
    if (!inIceSeason(now)) {
      parts.push('Off season. Old winter observations are withheld rather than presented as current.');
    } else {
      if (usableRegional(ro)) parts.push('Observed: the daily USNIC regional concentration analysis spans ' + ro.rangeLabel + ', valid ' + dateText(ro.validAt) + '.');
      else if (!region.lake) parts.push('Observed: no comparable remote ice-analysis product exists for this inland water, so no lake-wide proxy is substituted.');
      else if (ro && ro.stale) parts.push('Observed: the latest regional chart is stale and has been withheld from the live read.');
      else parts.push('Observed: a usable regional ice concentration is unavailable right now; that is not evidence of ice-free water.');

      if (afdd !== null && afdd !== undefined) {
        var thermal = 'Thermal history: ' + afdd + ' accumulated freezing degree days';
        if (normal !== null && normal !== undefined) thermal += ' versus a ten-year station normal of ' + normal;
        if (c.change72h !== null && c.change72h !== undefined) thermal += ', changing ' + signed(c.change72h) + ' F-degree-days over 72 hours';
        parts.push(thermal + '.');
      }

      var fc = nowData && nowData.forecast && nowData.forecast.next72h;
      if (fc) parts.push('Forecast: over the next 72 hours, ' + fc.forcing + '; ' + fc.freezeHours + ' hours are forecast at or below 32°F, with maximum wind near ' + fc.maxWindMph + ' mph.');
      if (o && o.ok && o.windMph !== null) parts.push('Current nearby station wind is ' + fmt(o.windMph) + ' mph ' + cardinal(o.windDir) + '.');
    }
    parts.push('Interpretation: these signals can screen whether the trip deserves more local verification; they do not measure local ice thickness, quality, cracks, current, sheet movement, or safety.');
    set('r-read', parts.join(' '));

    var stamp = 'Thermal history from ' + (c ? c.station : 'the nearby station') + ' daily ACIS records.';
    if (usableRegional(ro)) stamp += ' Regional ice chart valid ' + dateText(ro.validAt) + '.';
    if (o && o.ok && o.obsTime) stamp += ' Weather observed ' + dateText(o.obsTime.toISOString()) + '.';
    set('r-stamp', stamp);
  }

  function renderHistory(server) {
    var hur = server && server.climatology ? server.climatology.huron : null;
    var mic = server && server.climatology ? server.climatology.michigan : null;
    var el = document.getElementById('hist-detail');
    if (!el) return;
    if (!hur && !mic) { el.textContent = 'The climatology record is not reachable right now.'; return; }
    var lines = [];
    if (hur) lines.push('On this date the ' + hur.yearsOfRecord + ' year record for Lake Huron averages ' + fmt(hur.mean, 1) + '% ice cover, with a median of ' + fmt(hur.median, 1) + '% and a range from ' + fmt(hur.min, 1) + '% to ' + fmt(hur.max, 1) + '%.');
    if (mic) lines.push('Lake Michigan averages ' + fmt(mic.mean, 1) + '% for the same date, ranging from ' + fmt(mic.min, 1) + '% to ' + fmt(mic.max, 1) + '%.');
    if (hur && hur.current !== null && hur.current !== undefined) {
      var d = hur.current - hur.mean;
      lines.push('This ice year Lake Huron sits at ' + fmt(hur.current, 1) + '%, ' + (d >= 0 ? fmt(d, 1) + ' points above' : fmt(Math.abs(d), 1) + ' points below') + ' the long-term average.');
    }
    el.textContent = lines.join(' ');
    var st = document.getElementById('hist-stamp');
    if (st && hur) st.textContent = 'NOAA GLERL daily ice climatology, ice years ' + hur.firstYear + ' through ' + hur.lastYear + '. Recorded zero and missing observation are kept distinct.';
  }

  function boot() {
    var regionEl = document.getElementById('region-live');
    var isIndex = !!document.getElementById('board');
    var isHistory = !!document.getElementById('hist-detail');

    if (regionEl) {
      var slug = regionEl.getAttribute('data-region');
      var reg = REGIONS.filter(function (r) { return r.slug === slug; })[0];
      Promise.all([fetchServer(), fetchNow(slug), reg ? fetchObs(reg) : Promise.resolve(null)])
        .then(function (res) { renderRegion(slug, res[0], res[1], res[2]); });
      return;
    }

    if (isIndex) {
      Promise.all([fetchServer(), fetchNow(), Promise.all(REGIONS.map(fetchObs))])
        .then(function (res) { renderIndex(res[0], res[1], res[2]); });
      return;
    }

    if (isHistory) { fetchServer().then(renderHistory); return; }

    fetchServer().then(function (server) {
      var now = new Date();
      var c = coldMap(server)['saginaw-bay'];
      var s = stageFor(c ? c.afdd : null, now, null);
      set('season-stage', s.label);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
