/* Michigan Ice Report live engine.
   Server aggregation from /api/ice (GLERL cover, GLERL climatology, ACIS cold).
   Current observations direct from the National Weather Service API.

   Vocabulary rule for this file: no state is ever labeled safe, good, or ready.
   Stages describe the freeze progression only. Safety is not a data product. */
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

  /* ------------------------------------------------ season and stage */
  function inIceSeason(d) {
    var m = d.getMonth() + 1;
    return m >= 11 || m <= 3;
  }

  // Freeze progression. This is a real ordered sequence, which is why it is
  // presented as stages. None of these labels describe safety.
  function stageFor(afdd, d, tempF) {
    if (afdd === null || afdd === undefined) {
      return { label: inIceSeason(d) ? 'No data' : 'Off season', cls: '' };
    }
    if (!inIceSeason(d)) return { label: 'Off season', cls: '' };
    if (tempF !== null && tempF !== undefined && tempF > 40 && afdd > 50) {
      return { label: 'Thaw underway', cls: 'thaw' };
    }
    if (afdd < 25) return { label: 'Open water', cls: '' };
    if (afdd < 150) return { label: 'Ice forming', cls: '' };
    if (afdd < 350) return { label: 'Ice building', cls: 'cold' };
    if (afdd < 700) return { label: 'Sustained cold', cls: 'cold' };
    return { label: 'Deep cold', cls: 'cold' };
  }

  /* ------------------------------------------------ Stefan range */
  // Modified Stefan equation, USACE form: thickness (in) = C * sqrt(AFDD).
  // C spans roughly 0.5 for a snow covered sheltered sheet to 0.8 for a windy
  // lake with little snow. Reported as a range because a single value would be
  // false precision. Known to overpredict thin early season ice.
  function stefanRange(afdd) {
    if (!afdd || afdd <= 0) return null;
    return { lo: 0.5 * Math.sqrt(afdd), hi: 0.8 * Math.sqrt(afdd) };
  }

  /* ------------------------------------------------ fetches */
  function fetchServer() {
    return fetch('/api/ice')
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
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
          region: region,
          ok: true,
          tempF: (t === null || t === undefined) ? null : cToF(t),
          windMph: (ws === null || ws === undefined) ? null : msToMph(ws),
          windDir: (wd === null || wd === undefined) ? null : wd,
          obsTime: o.timestamp ? new Date(o.timestamp) : null
        };
      })
      .catch(function () { return { region: region, ok: false }; });
    }

  /* ------------------------------------------------ accumulation track */
  function paintTrack(container, afdd, normal) {
    if (!container) return;
    var fill = container.querySelector('.acc-fill');
    var mark = container.querySelector('.acc-normal');
    var nowEl = container.querySelector('[data-f="accnow"]');
    var normEl = container.querySelector('[data-f="accnorm"]');

    var a = (afdd === null || afdd === undefined) ? 0 : afdd;
    var n = (normal === null || normal === undefined) ? 0 : normal;
    // Scale so a normal season sits at the midline. Past the midline reads as
    // ahead of normal at a glance, which is the whole point of the display.
    var scale = Math.max(n * 2, a * 1.15, 100);
    if (fill) fill.style.width = Math.min(100, (a / scale) * 100) + '%';
    if (mark) mark.style.left = Math.min(100, (n / scale) * 100) + '%';
    if (nowEl) nowEl.textContent = (afdd === null ? 'no data' : a + ' F days');
    if (normEl) normEl.textContent = (normal === null ? 'normal n/a' : 'normal ' + n);
  }

  /* ------------------------------------------------ index render */
  function renderIndex(server, obs) {
    var now = new Date();
    var coldBySlug = {};
    if (server && server.cold) {
      server.cold.forEach(function (c) { coldBySlug[c.slug] = c; });
    }
    var obsBySlug = {};
    obs.forEach(function (o) { obsBySlug[o.region.slug] = o; });

    // top stats
    var afdds = [], norms = [];
    REGIONS.forEach(function (r) {
      var c = coldBySlug[r.slug];
      if (c && c.afdd !== null && c.afdd !== undefined) afdds.push(c.afdd);
      if (c && c.normal !== null && c.normal !== undefined) norms.push(c.normal);
    });
    var meanAfdd = afdds.length ? Math.round(afdds.reduce(function (a, b) { return a + b; }, 0) / afdds.length) : null;
    var meanNorm = norms.length ? Math.round(norms.reduce(function (a, b) { return a + b; }, 0) / norms.length) : null;

    var sagObs = obsBySlug['saginaw-bay'];
    var st = stageFor(coldBySlug['saginaw-bay'] ? coldBySlug['saginaw-bay'].afdd : null,
      now, sagObs && sagObs.ok ? sagObs.tempF : null);
    set('s-stage', st.label);
    set('season-stage', st.label);
    set('s-afdd', meanAfdd === null ? 'n/a' : meanAfdd);

    var hur = server && server.climatology ? server.climatology.huron : null;
    var cov = server && server.cover ? server.cover : null;
    if (cov && cov.huron !== null && cov.huron !== undefined) {
      set('s-cover', fmt(cov.huron, 1) + '%');
      set('s-cover-sub', 'Lake Huron');
    } else {
      set('s-cover', 'n/a');
      set('s-cover-sub', 'not published');
    }
    if (hur && hur.mean !== null) {
      var cur = (cov && cov.huron !== null && cov.huron !== undefined) ? cov.huron : hur.current;
      if (cur !== null && cur !== undefined) {
        var diff = cur - hur.mean;
        set('s-vsnorm', (diff >= 0 ? '+' : '') + fmt(diff, 1) + ' pts');
      } else {
        set('s-vsnorm', fmt(hur.mean, 1) + '% norm');
      }
    } else {
      set('s-vsnorm', 'n/a');
    }

    // accumulation tracks
    REGIONS.forEach(function (r) {
      var c = coldBySlug[r.slug] || {};
      paintTrack(document.getElementById('acc-' + r.slug), c.afdd, c.normal);
    });
    var accStamp = document.getElementById('acc-stamp');
    if (accStamp) {
      if (!inIceSeason(now)) {
        accStamp.textContent = 'Tracks read zero because it is the off season. Accumulated cold is a running total ' +
          'that resets after a sustained thaw, so it sits at zero from spring through fall and begins climbing again ' +
          'once nights drop below freezing in November.';
      } else if (meanNorm === null) {
        accStamp.textContent = 'Accumulated cold is computed from daily temperature records for each station. The ' +
          'normal comparison is unavailable right now.';
      } else {
        accStamp.textContent = 'Accumulated freezing degree days since November 1, computed from daily temperature ' +
          'records. The marker is the ten year average for this calendar date at each station, so a bar past the ' +
          'marker means this winter is running colder than normal.';
      }
    }

    // board
    REGIONS.forEach(function (r) {
      var row = document.getElementById('row-' + r.slug);
      if (!row) return;
      var c = coldBySlug[r.slug] || {};
      var o = obsBySlug[r.slug] || { ok: false };
      var s = stageFor(c.afdd, now, o.ok ? o.tempF : null);
      var coverTxt = 'n/a';
      if (r.lake && server && server.cover && server.cover[r.lake] !== null && server.cover[r.lake] !== undefined) {
        coverTxt = fmt(server.cover[r.lake], 1) + '%';
      } else if (!r.lake) {
        coverTxt = 'inland';
      }
      var vals = {
        afdd: (c.afdd === null || c.afdd === undefined) ? 'n/a' : c.afdd,
        temp: o.ok && o.tempF !== null ? fmt(o.tempF) : 'n/a',
        wind: o.ok && o.windMph !== null ? fmt(o.windMph) + ' ' + cardinal(o.windDir) : 'n/a',
        cover: coverTxt,
        stage: s.label
      };
      var cells = row.querySelectorAll('[data-f]');
      for (var i = 0; i < cells.length; i++) {
        var f = cells[i].getAttribute('data-f');
        if (f === 'stage') {
          cells[i].innerHTML = '<span class="badge ' + s.cls + '">' + s.label + '</span>';
        } else if (vals[f] !== undefined) {
          cells[i].textContent = vals[f];
        }
      }
    });

    var bs = document.getElementById('board-stamp');
    if (bs) {
      var live = obs.filter(function (o) { return o.ok; }).length;
      bs.textContent = live + ' of ' + REGIONS.length + ' weather stations reporting. Season cold is accumulated ' +
        'freezing degree days. Lake ice is satellite cover for the parent Great Lake, not for the individual water. ' +
        'Inland lakes have no satellite ice product. Stage describes freeze progression only and is not a safety rating.';
    }

    // narrative
    var readEl = document.getElementById('the-read');
    if (readEl) {
      var parts = [];
      if (!inIceSeason(now)) {
        parts.push('Off season. Michigan ice fishing runs roughly December through March depending on the winter, and ' +
          'this page tracks accumulated cold from November 1 onward.');
      } else if (meanAfdd !== null && meanNorm !== null) {
        var rel = meanAfdd > meanNorm * 1.15 ? 'ahead of'
          : (meanAfdd < meanNorm * 0.85 ? 'behind' : 'close to');
        parts.push('Accumulated cold across the tracked waters averages ' + meanAfdd +
          ' freezing degree days, which is ' + rel + ' the ten year normal of ' + meanNorm + ' for this date.');
      } else if (meanAfdd !== null) {
        parts.push('Accumulated cold across the tracked waters averages ' + meanAfdd + ' freezing degree days.');
      }
      if (cov && cov.huron !== null && cov.huron !== undefined && hur) {
        parts.push('Lake Huron satellite ice cover is ' + fmt(cov.huron, 1) +
          ' percent against a ' + hur.yearsOfRecord + ' year average of ' + fmt(hur.mean, 1) +
          ' percent for this date, in a record that ranges from ' + fmt(hur.min, 1) + ' to ' + fmt(hur.max, 1) +
          ' percent.');
      }
      var sr = stefanRange(coldBySlug['saginaw-bay'] ? coldBySlug['saginaw-bay'].afdd : null);
      if (sr && inIceSeason(now)) {
        parts.push('For Saginaw Bay the accumulated cold implies a modeled sheet somewhere between ' +
          sr.lo.toFixed(1) + ' and ' + sr.hi.toFixed(1) +
          ' inches on undisturbed water, which is a physics estimate rather than a measurement and runs optimistic ' +
          'on thin ice.');
      }
      parts.push('None of this describes the ice where you intend to stand.');
      readEl.textContent = parts.join(' ');
    }
    var rst = document.getElementById('read-stamp');
    if (rst && server) {
      rst.textContent = 'Ice cover and climatology from NOAA GLERL. Daily temperatures from ACIS. Current ' +
        'observations from the National Weather Service. Server data generated ' +
        (server.generatedAt ? new Date(server.generatedAt).toLocaleString('en-US',
          { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'recently') + '.';
    }
  }

  /* ------------------------------------------------ region render */
  function renderRegion(slug, server, o) {
    var now = new Date();
    var region = REGIONS.filter(function (r) { return r.slug === slug; })[0];
    if (!region) return;
    var c = null;
    if (server && server.cold) {
      c = server.cold.filter(function (x) { return x.slug === slug; })[0] || null;
    }
    var afdd = c ? c.afdd : null;
    var normal = c ? c.normal : null;
    var s = stageFor(afdd, now, o && o.ok ? o.tempF : null);

    set('s-stage', s.label);
    set('season-stage', s.label);
    set('r-afdd', afdd === null || afdd === undefined ? 'n/a' : afdd);
    if (normal === null || normal === undefined || afdd === null || afdd === undefined) {
      set('r-vsnorm', 'n/a');
    } else {
      var d = afdd - normal;
      set('r-vsnorm', (d >= 0 ? '+' : '') + d);
    }
    if (o && o.ok) {
      set('r-temp', o.tempF !== null ? fmt(o.tempF) : 'n/a');
      set('r-wind', o.windMph !== null ? fmt(o.windMph) : 'n/a');
      set('r-wind-sub', o.windDir !== null ? 'out of the ' + cardinal(o.windDir) : 'mph');
    } else {
      set('r-temp', 'n/a');
      set('r-wind', 'n/a');
    }
    if (region.lake && server && server.cover &&
        server.cover[region.lake] !== null && server.cover[region.lake] !== undefined) {
      set('r-cover', fmt(server.cover[region.lake], 1) + '%');
    } else if (region.lake) {
      set('r-cover', 'n/a');
    }

    paintTrack(document.getElementById('acc-region'), afdd, normal);

    var parts = [];
    parts.push('Stage: ' + s.label + '.');
    if (afdd !== null && afdd !== undefined) {
      if (normal !== null && normal !== undefined) {
        var rel = afdd > normal * 1.15 ? 'ahead of' : (afdd < normal * 0.85 ? 'behind' : 'close to');
        parts.push('Accumulated cold is ' + afdd + ' freezing degree days, ' + rel +
          ' the ten year normal of ' + normal + ' for this date.');
      } else {
        parts.push('Accumulated cold is ' + afdd + ' freezing degree days.');
      }
      var sr = stefanRange(afdd);
      if (sr && inIceSeason(now)) {
        parts.push('That implies a modeled sheet of roughly ' + sr.lo.toFixed(1) + ' to ' + sr.hi.toFixed(1) +
          ' inches on undisturbed water. It is a model, it assumes a uniform sheet that does not exist, and it ' +
          'overpredicts thin ice.');
      }
    }
    if (o && o.ok && o.windMph !== null && o.windMph > 15) {
      parts.push('Wind is currently ' + fmt(o.windMph) + ' mph out of the ' + cardinal(o.windDir) +
        ', strong enough to move ice on open water.');
    }
    parts.push('Test with a spud bar before you trust any of it.');
    set('r-read', parts.join(' '));

    var stamp = 'Accumulated cold from ' + (c ? c.station : 'the local station') +
      ' daily records since November 1.';
    if (o && o.ok && o.obsTime) {
      stamp += ' Weather observed ' + o.obsTime.toLocaleString('en-US',
        { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + '.';
    }
    set('r-stamp', stamp);
  }

  /* ------------------------------------------------ history page */
  function renderHistory(server) {
    var hur = server && server.climatology ? server.climatology.huron : null;
    var mic = server && server.climatology ? server.climatology.michigan : null;
    var el = document.getElementById('hist-detail');
    if (!el) return;
    if (!hur && !mic) {
      el.textContent = 'The climatology record is not reachable right now.';
      return;
    }
    var lines = [];
    if (hur) {
      lines.push('On this date the ' + hur.yearsOfRecord + ' year record for Lake Huron averages ' +
        fmt(hur.mean, 1) + ' percent ice cover, with a median of ' + fmt(hur.median, 1) +
        ' percent and a range from ' + fmt(hur.min, 1) + ' to ' + fmt(hur.max, 1) + ' percent.');
    }
    if (mic) {
      lines.push('Lake Michigan averages ' + fmt(mic.mean, 1) + ' percent for the same date, ranging from ' +
        fmt(mic.min, 1) + ' to ' + fmt(mic.max, 1) + ' percent.');
    }
    if (hur && hur.current !== null && hur.current !== undefined) {
      var d = hur.current - hur.mean;
      lines.push('This ice year Lake Huron sits at ' + fmt(hur.current, 1) + ' percent, ' +
        (d >= 0 ? fmt(d, 1) + ' points above' : fmt(Math.abs(d), 1) + ' points below') + ' the long term average.');
    }
    el.textContent = lines.join(' ');
    var st = document.getElementById('hist-stamp');
    if (st && hur) {
      st.textContent = 'NOAA GLERL daily ice climatology, ice years ' + hur.firstYear + ' through ' + hur.lastYear +
        '. A recorded zero means ice cover was observed and was zero. A gap means it was not measured, and gaps are ' +
        'excluded rather than counted as zero.';
    }
  }

  /* ------------------------------------------------ boot */
  function boot() {
    var regionEl = document.getElementById('region-live');
    var isIndex = !!document.getElementById('board');
    var isHistory = !!document.getElementById('hist-detail');

    if (regionEl) {
      var slug = regionEl.getAttribute('data-region');
      var reg = REGIONS.filter(function (r) { return r.slug === slug; })[0];
      Promise.all([fetchServer(), reg ? fetchObs(reg) : Promise.resolve(null)])
        .then(function (res) { renderRegion(slug, res[0], res[1]); });
      return;
    }

    if (isIndex) {
      Promise.all([fetchServer(), Promise.all(REGIONS.map(fetchObs))])
        .then(function (res) { renderIndex(res[0], res[1]); });
      return;
    }

    if (isHistory) {
      fetchServer().then(renderHistory);
      return;
    }

    // static pages still get the season stage in the header
    fetchServer().then(function (server) {
      var now = new Date();
      var c = null;
      if (server && server.cold) {
        c = server.cold.filter(function (x) { return x.slug === 'saginaw-bay'; })[0];
      }
      var s = stageFor(c ? c.afdd : null, now, null);
      set('season-stage', s.label);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
