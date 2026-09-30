(() => {
  'use strict';

  const page = window.CircleTourPage;
  const planner = document.querySelector('.route-planner');
  if (!page || !planner || document.getElementById('circleTourToday')) return;

  const ROUTE_ORDER = ['1','2','3','4','5','6','7','8','9','10','11','12','31','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30'];
  const STOP_COORDS = {
    '1':[-92.1005,46.7867],'2':[-92.1041,46.7208],'3':[-90.8182,46.8108],'4':[-90.8838,46.5924],'5':[-90.171,46.4547],
    '6':[-89.6807,46.782],'7':[-89.314,46.8711],'8':[-87.8884,47.468],'9':[-88.4529,46.7566],'10':[-87.3954,46.5436],
    '11':[-86.651,46.411],'12':[-85.256,46.574],'31':[-84.957,46.771],'13':[-84.3453,46.4953],'14':[-84.3461,46.5219],
    '15':[-84.625,47.346],'16':[-84.7734,47.9935],'17':[-85.276,48.592],'18':[-86.37,48.74],'19':[-88.268,49.0125],
    '20':[-89.2477,48.3809],'21':[-89.5992,48.0042],'22':[-89.6844,47.9635],'23':[-90.3343,47.7504],'24':[-90.5223,47.7077],
    '25':[-90.874,47.554],'26':[-91.199,47.339],'27':[-91.367,47.2],'28':[-91.468,47.144],'29':[-91.6707,47.0227],
    '30':[-92.088,46.778]
  };
  const ACCESS_STOPS = ['11','13','15','21'];
  const SHIP_STOPS = ['1','13','31'];
  const SCENIC_TAGS = new Set(['must','hiking','waterfall','lighthouse','beach']);
  const WATER_TAGS = new Set(['boat','beach']);
  const AIR_TAGS = new Set(['hiking','lighthouse','beach','boat']);
  const CT_ZONES = new Set(['start','wi','mn']);
  const CONDITIONS = {
    duluth: null,
    soo: null,
    buoys: null,
    fall: null,
    aurora: null,
    border: null,
    smokeSamples: [],
    smokeKey: '',
    refreshedAt: null,
  };

  let currentPlan = null;
  let smokeRequestSerial = 0;

  const $ = (id) => document.getElementById(id);
  const card = (id) => $(`stop-${id}`);
  const name = (id) => card(id)?.querySelector('.stop-name')?.textContent.trim() || `Stop ${id}`;
  const region = (id) => card(id)?.dataset.seg || '';
  const acts = (id) => new Set((card(id)?.dataset.acts || '').split(/\s+/).filter(Boolean));
  const coords = (id) => {
    const raw = STOP_COORDS[String(id)];
    return raw ? {lon: raw[0], lat: raw[1]} : null;
  };
  const zoneFor = (id) => CT_ZONES.has(region(id)) ? 'America/Chicago' : 'America/Detroit';

  function track(action, data = {}) {
    page.track?.(`today-${action}`, data);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (c) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    }[c]));
  }

  async function fetchJson(url, timeoutMs = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {accept: 'application/json'},
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function addStyles() {
    if ($('circle-tour-today-styles')) return;
    const style = document.createElement('style');
    style.id = 'circle-tour-today-styles';
    style.textContent = `
      .ct-today{max-width:1280px;margin:16px auto 0;padding:0 20px 20px}
      .ct-today-shell{background:#fff;border:1px solid var(--border);border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(12,40,52,.06)}
      .ct-today-head{padding:18px 20px 12px;background:linear-gradient(135deg,#edf6f5,#f8faf7);border-bottom:1px solid var(--border)}
      .ct-today-kicker{font:700 11px/1.2 Arial,sans-serif;letter-spacing:.8px;text-transform:uppercase;color:#2c5f2d;margin-bottom:6px}
      .ct-today-head h2{font-size:21px;font-weight:normal;line-height:1.25;margin:0 0 5px;color:#17352a}
      .ct-today-head p{font-size:13px;line-height:1.65;color:#5d665f;margin:0}
      .ct-today-form{display:grid;grid-template-columns:1.2fr 1.2fr .68fr .68fr 1fr auto;gap:9px;align-items:end;padding:15px 20px}
      .ct-field label,.ct-interest-label{display:block;font:700 10px/1.2 Arial,sans-serif;text-transform:uppercase;letter-spacing:.55px;color:#7b827d;margin:0 0 5px}
      .ct-field select{width:100%;min-height:42px;border:1px solid #d8d8d0;background:#fff;border-radius:4px;padding:8px 9px;font:13px Georgia,'Times New Roman',serif;color:#2c2c2c}
      .ct-interest-row{display:flex;gap:5px;flex-wrap:wrap}
      .ct-interest{border:1px solid #d8d8d0;background:#faf9f6;border-radius:14px;padding:5px 8px;font:11px Georgia,'Times New Roman',serif;cursor:pointer;color:#555}
      .ct-interest[aria-pressed="true"]{background:#2c5f2d;color:#fff;border-color:#2c5f2d}
      .ct-build{min-height:42px;border:0;border-radius:4px;padding:9px 14px;background:#173f50;color:#fff;font:700 12px Georgia,'Times New Roman',serif;cursor:pointer}
      .ct-build:hover{background:#0d3545}
      .ct-today-output{padding:0 20px 18px}.ct-empty{font-size:13px;color:#666;padding:2px 0}
      .ct-plan-summary{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 12px}
      .ct-metric{background:#f6f5f1;border:1px solid #e7e4dc;border-radius:3px;padding:7px 10px;font-size:12px}
      .ct-metric strong{display:block;color:#17352a;font-size:14px}
      .ct-plan-call{border-left:4px solid #2f7057;background:#f4faf7;padding:10px 12px;margin:0 0 12px;font-size:13px;line-height:1.55}
      .ct-adjustments{display:grid;gap:6px;margin:0 0 13px}.ct-adjustment{padding:7px 9px;border:1px solid #e6e0d2;background:#fffaf0;border-radius:3px;font-size:12px;line-height:1.45;color:#5d574c}
      .ct-adjustment strong{color:#564420}
      .ct-day-sheet{border:1px solid #dedbd3;border-radius:4px;overflow:hidden;background:#fff}
      .ct-sheet-head{display:flex;justify-content:space-between;gap:12px;align-items:end;padding:10px 12px;background:#f6f5f1;border-bottom:1px solid #e5e1d8}
      .ct-sheet-head strong{font-size:14px;color:#17352a}.ct-sheet-head span{font-size:10px;color:#7a817c;text-transform:uppercase;letter-spacing:.45px}
      .ct-sheet-row{display:grid;grid-template-columns:105px 1fr;gap:12px;padding:10px 12px;border-top:1px solid #eeeae2}
      .ct-sheet-row:first-of-type{border-top:0}.ct-sheet-time{font:700 12px/1.35 Arial,sans-serif;color:#245b3b}
      .ct-sheet-body strong{display:block;font-size:13px;color:#26342d;margin-bottom:2px}.ct-sheet-body span{display:block;font-size:12px;line-height:1.48;color:#667069}
      .ct-sheet-row.drive{background:#fbfcfb}.ct-sheet-row.border{background:#fff8e8}.ct-sheet-row.night{background:#f4f5fb}
      .ct-night-note{margin-top:10px;padding:9px 11px;border-left:3px solid #5d5f8b;background:#f4f5fb;font-size:12px;line-height:1.5;color:#4e516d}
      .ct-plan-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ct-plan-actions button,.ct-plan-actions a{border-radius:3px;padding:8px 11px;font:700 12px Georgia,'Times New Roman',serif;text-decoration:none;cursor:pointer}
      .ct-plan-actions button{border:0;background:#2c5f2d;color:#fff}.ct-plan-actions a{border:1px solid #ccd7d1;color:#245b3b;background:#fff}
      .ct-intel{border-top:1px solid var(--border);padding:16px 20px 18px}.ct-intel-head{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:10px}
      .ct-intel-head h3{font-size:16px;font-weight:normal;color:#17352a;margin:0}.ct-intel-head p{font-size:11px;color:#888;margin:0}
      .ct-intel-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}
      .ct-signal{border:1px solid #e5e2db;border-radius:4px;padding:10px 11px;background:#fafaf8;min-height:112px}
      .ct-signal-top{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:5px}.ct-signal-type{font:700 10px/1.2 Arial,sans-serif;text-transform:uppercase;letter-spacing:.55px;color:#777}
      .ct-state{font:700 10px/1.2 Arial,sans-serif;border-radius:10px;padding:3px 6px;background:#e9eee9;color:#375947}.ct-state.live{background:#e2f4e8;color:#23633c}.ct-state.warn{background:#fff1d6;color:#83540b}
      .ct-signal strong{display:block;font-size:13px;color:#26342d;margin-bottom:4px}.ct-signal p{font-size:12px;line-height:1.5;color:#606862;margin:0 0 7px}
      .ct-signal-actions{display:flex;gap:8px;flex-wrap:wrap}.ct-signal a,.ct-signal button{font:700 11px Georgia,'Times New Roman',serif;color:#245b3b;background:none;border:0;padding:0;cursor:pointer;text-decoration:none}
      .ct-signal a:hover,.ct-signal button:hover{text-decoration:underline}
      .ct-map-live{margin:0 0 9px;padding:9px 10px;border:1px solid #d9e3de;background:#f7fbf9;border-radius:4px}
      .ct-map-live-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}.ct-map-live-head strong{font-size:12px;color:#17352a}.ct-map-live-head span{font-size:10px;color:#888}
      .ct-map-live-tabs{display:flex;gap:5px;flex-wrap:wrap}.ct-map-live-tabs button{border:1px solid #cfd9d4;background:#fff;border-radius:12px;padding:4px 8px;font:11px Georgia,'Times New Roman',serif;color:#4c5d54;cursor:pointer}
      .ct-map-live-tabs button[aria-pressed="true"]{background:#173f50;color:#fff;border-color:#173f50}.ct-map-picks{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
      .ct-map-pick{border:0;background:#e9f2ee;border-radius:3px;padding:5px 7px;font:11px Georgia,'Times New Roman',serif;color:#245b3b;cursor:pointer}
      .ct-map-pick.live:before{content:'●';color:#2f8b54;margin-right:5px}.ct-map-pick.warn:before{content:'●';color:#c28518;margin-right:5px}
      @media(max-width:980px){.ct-today-form{grid-template-columns:1fr 1fr 1fr}.ct-interest-wrap{grid-column:1/-1}.ct-build{grid-column:1/-1}}
      @media(max-width:850px){.ct-today{padding:0 12px 16px}.ct-today-form{padding:13px}.ct-today-output,.ct-intel{padding-left:13px;padding-right:13px}}
      @media(max-width:520px){.ct-today-form{grid-template-columns:1fr}.ct-interest-wrap,.ct-build{grid-column:auto}.ct-today-head{padding:15px 13px 11px}.ct-intel-grid{grid-template-columns:1fr}.ct-intel-head{display:block}.ct-intel-head p{margin-top:4px}.ct-sheet-row{grid-template-columns:88px 1fr}}
    `;
    document.head.appendChild(style);
  }

  function routeOrder() {
    const direction = document.querySelector('.direction-btn.active')?.dataset.direction || 'counterclockwise';
    return direction === 'clockwise' ? [ROUTE_ORDER[0], ...ROUTE_ORDER.slice(1).reverse()] : ROUTE_ORDER.slice();
  }

  function segmentIds(start, end) {
    start = String(start); end = String(end);
    if (start === end) return [start];
    const order = routeOrder();
    const a = order.indexOf(start);
    const b = order.indexOf(end);
    if (a < 0 || b < 0) return [];
    if (a <= b) return order.slice(a, b + 1);
    return order.slice(a).concat(order.slice(0, b + 1));
  }

  function edgeMiles(from, to) {
    from = String(from); to = String(to);
    if (new Set([from,to]).size === 2 && [from,to].every((id) => id === '1' || id === '30')) return 0;
    const ccwA = ROUTE_ORDER.indexOf(from);
    const ccwB = ROUTE_ORDER.indexOf(to);
    let mileageCard = null;
    if ((ccwA + 1) % ROUTE_ORDER.length === ccwB) mileageCard = card(to);
    if ((ccwB + 1) % ROUTE_ORDER.length === ccwA) mileageCard = card(from);
    const text = mileageCard?.querySelector('.stop-dist')?.textContent || '';
    const match = text.match(/([\d,.]+)\s*mi/i);
    return match ? Number(match[1].replace(/,/g, '')) : 45;
  }

  function totalMiles(ids) {
    return ids.slice(1).reduce((sum, id, index) => sum + edgeMiles(ids[index], id), 0);
  }

  function visitHours(id) {
    const meta = Array.from(card(id)?.querySelectorAll('.stop-dist') || [])
      .map((node) => node.textContent)
      .find((text) => /day/i.test(text)) || '';
    const match = meta.match(/([\d.]+)\s*days?/i);
    const days = match ? Number(match[1]) : 0.5;
    if (days <= 0.25) return 0.75;
    if (days <= 0.5) return 1.25;
    if (days <= 0.75) return 1.75;
    if (days <= 1) return 2.5;
    if (days <= 1.5) return 3.5;
    return 4.5;
  }

  function hasAny(tags, wanted) {
    for (const value of wanted) if (tags.has(value)) return true;
    return false;
  }

  function haversineMiles(a, b) {
    if (!a || !b) return Infinity;
    const R = 3958.7613;
    const rad = (v) => v * Math.PI / 180;
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function nearestFreshSuperiorBuoy(id) {
    const point = coords(id);
    const stations = Array.isArray(CONDITIONS.buoys?.stations) ? CONDITIONS.buoys.stations : [];
    const now = Date.now();
    return stations
      .filter((s) => String(s.lake || '').toLowerCase() === 'superior')
      .filter((s) => Number.isFinite(Number(s.wave_ht)))
      .map((s) => ({
        ...s,
        ageMs: Date.parse(s.obs_time || '') ? now - Date.parse(s.obs_time) : Infinity,
        distance: haversineMiles(point, {lat:Number(s.lat), lon:Number(s.lng)}),
      }))
      .filter((s) => s.ageMs >= 0 && s.ageMs <= 6 * 3600000 && s.distance <= 150)
      .sort((a,b) => a.distance - b.distance)[0] || null;
  }

  function fallRegionForStop(id) {
    if (region(id) !== 'mi') return null;
    const p = coords(id);
    if (!p) return null;
    return p.lon < -86.5 ? 'wup' : 'eup';
  }

  function fallSnapshot(id) {
    const key = fallRegionForStop(id);
    if (!key || !CONDITIONS.fall?.inSeason) return null;
    return (CONDITIONS.fall.regions || []).find((r) => r.id === key) || null;
  }

  function smokeForStop(id) {
    const point = coords(id);
    if (!point || !CONDITIONS.smokeSamples.length) return null;
    return CONDITIONS.smokeSamples
      .map((sample) => ({...sample, distance:haversineMiles(point, sample.point)}))
      .filter((sample) => sample.distance <= 150)
      .sort((a,b) => a.distance - b.distance)[0] || null;
  }

  function stopEffects(id) {
    const tags = acts(id);
    let delta = 0;
    const reasons = [];
    const ship = id === '1' ? CONDITIONS.duluth : id === '13' ? CONDITIONS.soo : null;
    if (ship?.state === 'live') {
      delta += 3;
      reasons.push(ship.short || 'Live ship opportunity');
    }

    const access = id === '11'
      ? document.querySelector('#stop-11 [data-current-alert="pictured-rocks"]')?.textContent.trim()
      : id === '15'
        ? document.querySelector('#stop-15 [data-current-alert="lspp"]')?.textContent.trim()
        : '';
    if (access && /closed/i.test(access)) {
      delta -= 1;
      reasons.push('Current access constraint reduces flexibility at this stop');
    }

    const buoy = nearestFreshSuperiorBuoy(id);
    if (buoy && hasAny(tags, WATER_TAGS)) {
      const ft = Number(buoy.wave_ht) * 3.28084;
      if (ft >= 4) {
        delta -= 5;
        reasons.push(`Nearby Lake Superior waves are about ${ft.toFixed(1)} ft; boat/beach time is demoted`);
      } else if (ft >= 2.5) {
        delta -= 2;
        reasons.push(`Nearby Lake Superior waves are about ${ft.toFixed(1)} ft; exposed-water time is less attractive`);
      } else if (ft <= 1.5) {
        delta += 1;
        reasons.push(`Nearby Lake Superior waves are about ${ft.toFixed(1)} ft; water-facing time gets a small boost`);
      }
    }

    const fall = fallSnapshot(id);
    if (fall && hasAny(tags, SCENIC_TAGS)) {
      if (fall.phase === 'peak' || fall.pct >= 85) {
        delta += 3;
        reasons.push(`${fall.name} fall color is ${fall.label.toLowerCase()} (${fall.pct}%)`);
      } else if (fall.pct >= 60) {
        delta += 2;
        reasons.push(`${fall.name} fall color is ${fall.label.toLowerCase()} (${fall.pct}%)`);
      } else if (fall.pct >= 35) {
        delta += 1;
        reasons.push(`${fall.name} fall color is building (${fall.pct}%)`);
      }
    }

    const smoke = smokeForStop(id);
    const aqi = Number(smoke?.data?.current?.pm25_aqi);
    if (Number.isFinite(aqi) && aqi >= 101 && hasAny(tags, AIR_TAGS)) {
      delta -= aqi >= 151 ? 4 : 2;
      reasons.push(`PM2.5 AQI near this route segment is ${Math.round(aqi)}; long outdoor/scenic blocks are demoted`);
    }

    return {delta, reasons};
  }

  function scoreStop(id, interests) {
    const tags = acts(id);
    let base = tags.has('must') ? 5 : 0;
    interests.forEach((interest) => { if (tags.has(interest)) base += 3; });
    if (['1','11','13','31'].includes(id)) base += 1;
    const live = stopEffects(id);
    return {base, liveDelta:live.delta, score:base + live.delta, reasons:live.reasons};
  }

  function chosenInterests() {
    return Array.from(document.querySelectorAll('.ct-interest[aria-pressed="true"]'))
      .map((button) => button.dataset.interest);
  }

  function directionsUrl(ids) {
    const names = ids.map((id) => `${name(id)}, Lake Superior`);
    if (names.length < 2) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(names[0] || 'Lake Superior')}`;
    let middle = names.slice(1, -1);
    if (middle.length > 8) middle = Array.from({length: 8}, (_, i) => middle[Math.round(i * (middle.length - 1) / 7)]);
    const params = new URLSearchParams({api:'1', origin:names[0], destination:names[names.length - 1], travelmode:'driving'});
    if (middle.length) params.set('waypoints', middle.join('|'));
    return `https://www.google.com/maps/dir/?${params}`;
  }

  function pairCrossing(segment, a, b) {
    for (let i = 0; i < segment.length - 1; i += 1) {
      if (segment[i] === a && segment[i + 1] === b) return i;
    }
    return -1;
  }

  function saultBorderForSegment(segment) {
    const toCanada = pairCrossing(segment, '13', '14') >= 0;
    const toUs = pairCrossing(segment, '14', '13') >= 0;
    if (!toCanada && !toUs) return null;
    const direction = toCanada ? 'to_canada' : 'to_us';
    const crossing = (CONDITIONS.border?.crossings || []).find((item) => item.id === 'sault-ste-marie');
    const lane = crossing?.waits?.[direction]?.passenger?.standard || null;
    const wait = Number(lane?.wait_minutes);
    return {
      direction,
      directionLabel: direction === 'to_canada' ? 'Canada-bound' : 'U.S.-bound',
      available: Boolean(lane?.available && Number.isFinite(wait)),
      waitMinutes: lane?.available && Number.isFinite(wait) ? Math.max(0, wait) : 0,
      display: lane?.available ? lane.display || (Number.isFinite(wait) ? `${wait} min` : 'reported') : 'unavailable',
      updatedAt: lane?.updated_at || null,
    };
  }

  function borderMinutesForSegment(segment) {
    return saultBorderForSegment(segment)?.waitMinutes || 0;
  }

  function buildTodayPlan({measure = true, requestSmoke = true} = {}) {
    const start = $('ctTodayStart').value;
    const end = $('ctTodayEnd').value;
    const hours = Number($('ctTodayHours').value);
    const startTime = $('ctTodayStartTime').value;
    const interests = chosenInterests();
    const segment = segmentIds(start, end);
    const miles = Math.round(totalMiles(segment));
    const driveHours = start === end ? 0 : Math.max(0, miles / 47);
    const borderMinutes = borderMinutesForSegment(segment);
    const transitHours = driveHours + borderMinutes / 60;
    const stopBudget = Math.max(0, hours - transitHours - 0.5);

    if (start === end) {
      const localVisit = Math.max(0, Math.min(hours - 0.5, visitHours(start)));
      currentPlan = {
        start,end,hours,startTime,interests,segment:[start],ids:[start],miles:0,driveHours:0,borderMinutes:0,
        visitHours:localVisit,stayDay:true,candidates:[],adjustments:[],
      };
      renderTodayPlan();
      renderSignals();
      renderMapPicks('today');
      if (measure) track('plan-build', {hours, segmentStops:1, recommendedStops:1, stayDay:true, interests:interests.join('-') || 'none'});
      if (requestSmoke) loadSmokeForPlan(currentPlan);
      return currentPlan;
    }

    const optional = segment.slice(1, -1).map((id) => {
      const scored = scoreStop(id, interests);
      return {id, ...scored, hours:visitHours(id)};
    });
    optional.sort((a,b) => b.score - a.score || segment.indexOf(a.id) - segment.indexOf(b.id));

    const keep = new Set([start, end]);
    let used = 0;
    for (const item of optional) {
      if (item.score <= 0) continue;
      if (used + item.hours <= stopBudget) {
        keep.add(item.id);
        used += item.hours;
      }
    }
    const ids = segment.filter((id) => keep.has(id));
    const adjustments = optional
      .filter((item) => item.reasons.length)
      .sort((a,b) => Math.abs(b.liveDelta) - Math.abs(a.liveDelta))
      .slice(0, 5)
      .map((item) => ({...item, selected:keep.has(item.id)}));

    currentPlan = {
      start,end,hours,startTime,interests,segment,ids,miles,driveHours,borderMinutes,visitHours:used,
      stayDay:false,candidates:optional,adjustments,
    };
    renderTodayPlan();
    renderSignals();
    renderMapPicks('today');
    if (measure) track('plan-build', {
      hours,
      segmentStops:segment.length,
      recommendedStops:ids.length,
      borderMinutes,
      liveAdjustments:adjustments.length,
      interests:interests.join('-') || 'none'
    });
    if (requestSmoke) loadSmokeForPlan(currentPlan);
    return currentPlan;
  }

  function zoneOffsetMinutes(date, zone) {
    const part = new Intl.DateTimeFormat('en-US', {timeZone:zone, timeZoneName:'shortOffset'})
      .formatToParts(date)
      .find((item) => item.type === 'timeZoneName')?.value || 'GMT';
    const match = part.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) return 0;
    const minutes = Number(match[2]) * 60 + Number(match[3] || 0);
    return match[1] === '-' ? -minutes : minutes;
  }

  function ymdFor(date, zone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function instantFromLocal(ymd, hhmm, zone) {
    const [year,month,day] = ymd.split('-').map(Number);
    const [hour,minute] = hhmm.split(':').map(Number);
    const wallUtc = Date.UTC(year, month - 1, day, hour, minute);
    let offset = zoneOffsetMinutes(new Date(wallUtc), zone);
    let instant = wallUtc - offset * 60000;
    const corrected = zoneOffsetMinutes(new Date(instant), zone);
    if (corrected !== offset) instant = wallUtc - corrected * 60000;
    return new Date(instant);
  }

  function formatClock(date, zone) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone:zone, hour:'numeric', minute:'2-digit', timeZoneName:'short'
    }).format(date);
  }

  function formatDuration(minutes) {
    const rounded = Math.max(0, Math.round(minutes));
    const h = Math.floor(rounded / 60);
    const m = rounded % 60;
    if (!h) return `${m} min`;
    if (!m) return `${h} hr`;
    return `${h} hr ${m} min`;
  }

  function routeSliceBetween(segment, fromId, toId) {
    const a = segment.indexOf(fromId);
    const b = segment.indexOf(toId);
    if (a < 0 || b < 0 || b < a) return [fromId,toId];
    return segment.slice(a, b + 1);
  }

  function parseYmd(ymd) {
    const [year,month,day] = ymd.split('-').map(Number);
    return {year,month,day};
  }

  function dayOfYear(ymd) {
    const {year,month,day} = parseYmd(ymd);
    return Math.floor((Date.UTC(year,month - 1,day) - Date.UTC(year,0,0)) / 86400000);
  }

  function normalizeDegrees(value) {
    let result = value % 360;
    if (result < 0) result += 360;
    return result;
  }

  function normalizeHours(value) {
    let result = value % 24;
    if (result < 0) result += 24;
    return result;
  }

  function sunTime(ymd, lat, lon, isSunrise) {
    const {year,month,day} = parseYmd(ymd);
    const N = dayOfYear(ymd);
    const lngHour = lon / 15;
    const t = N + ((isSunrise ? 6 : 18) - lngHour) / 24;
    const M = (0.9856 * t) - 3.289;
    let L = M + 1.916 * Math.sin(M * Math.PI / 180) + 0.020 * Math.sin(2 * M * Math.PI / 180) + 282.634;
    L = normalizeDegrees(L);
    let RA = Math.atan(0.91764 * Math.tan(L * Math.PI / 180)) * 180 / Math.PI;
    RA = normalizeDegrees(RA);
    RA = (RA + (Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90)) / 15;
    const sinDec = 0.39782 * Math.sin(L * Math.PI / 180);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(90.833 * Math.PI / 180) - sinDec * Math.sin(lat * Math.PI / 180)) /
      (cosDec * Math.cos(lat * Math.PI / 180));
    if (cosH > 1 || cosH < -1) return null;
    let H = Math.acos(cosH) * 180 / Math.PI;
    if (isSunrise) H = 360 - H;
    H /= 15;
    const T = H + RA - 0.06571 * t - 6.622;
    const UT = normalizeHours(T - lngHour);
    const hours = Math.floor(UT);
    const minutesFloat = (UT - hours) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.round((minutesFloat - minutes) * 60);
    return new Date(Date.UTC(year,month - 1,day,hours,minutes,seconds));
  }

  function auroraOpportunity(id, referenceDate) {
    const data = CONDITIONS.aurora;
    if (!data || region(id) !== 'mi') return null;
    const p = coords(id);
    const regions = data.ovation?.regions || [];
    if (!p || !regions.length) return null;
    const nearest = regions
      .map((item) => ({...item, distance:haversineMiles(p, {lat:Number(item.latitude),lon:Number(item.longitude)})}))
      .sort((a,b) => a.distance - b.distance)[0];
    const peak = Number(data.forecast?.peak_24h);
    const peakAt = data.forecast?.peak_24h_at;
    if (!nearest || !Number.isFinite(peak) || !peakAt) return null;
    const threshold = Number(nearest.planning_kp ?? 5);
    const skyPeriods = nearest.sky_cover?.periods || [];
    const peakMs = Date.parse(peakAt);
    const sky = skyPeriods.find((period) => peakMs >= Date.parse(period.start_time) && peakMs < Date.parse(period.end_time));
    const clouds = Number(sky?.percent);
    const supported = peak >= threshold && Number.isFinite(clouds) && clouds <= 50;
    return {
      supported,
      peak,
      threshold,
      clouds:Number.isFinite(clouds) ? clouds : null,
      peakAt:new Date(peakAt),
      label:nearest.label,
      referenceDate,
    };
  }

  function buildDaySheet(plan) {
    const events = [];
    const startZone = zoneFor(plan.start);
    const dateKey = ymdFor(new Date(), startZone);
    let clock = instantFromLocal(dateKey, plan.startTime, startZone);
    const add = (kind, id, title, detail, zone = zoneFor(id), at = clock) => {
      events.push({kind,id,title,detail,zone,time:new Date(at)});
    };

    if (plan.stayDay) {
      add('start', plan.start, `Start your local day in ${name(plan.start)}`, 'No route mileage today; use the available hours at this stop.');
      const visitMinutes = Math.round(plan.visitHours * 60);
      if (visitMinutes > 0) {
        clock = new Date(clock.getTime() + visitMinutes * 60000);
        add('stop', plan.start, `Explore ${name(plan.start)}`, `${formatDuration(visitMinutes)} local block.`);
      }
      return {events, endTime:clock, startTime:events[0]?.time || clock};
    }

    add('start', plan.start, `Leave ${name(plan.start)}`, 'Start the segment with the route and live checks already applied.');
    for (let i = 1; i < plan.ids.length; i += 1) {
      const from = plan.ids[i - 1];
      const to = plan.ids[i];
      const subsegment = routeSliceBetween(plan.segment, from, to);
      const miles = totalMiles(subsegment);
      const driveMinutes = Math.round((miles / 47) * 60);
      const fromZone = zoneFor(from);
      const toZone = zoneFor(to);
      const zoneNote = fromZone !== toZone ? ' The clock changes time zones on this leg; arrival is shown in local time.' : '';
      add('drive', from, `Drive ${Math.round(miles)} mi toward ${name(to)}`, `${formatDuration(driveMinutes)} base-drive estimate.${zoneNote}`, fromZone);
      clock = new Date(clock.getTime() + driveMinutes * 60000);

      const border = saultBorderForSegment(subsegment);
      if (border) {
        const detail = border.available
          ? `${border.directionLabel} official passenger wait: ${border.display}. This reported processing delay is added to the day budget.`
          : `${border.directionLabel} official wait is unavailable. The planner does not invent a delay; verify before crossing.`;
        add('border', '13', 'Sault Ste. Marie border crossing', detail, 'America/Detroit');
        if (border.waitMinutes) clock = new Date(clock.getTime() + border.waitMinutes * 60000);
      }

      if (to === plan.end) {
        add('end', to, `Arrive in ${name(to)}`, 'Overnight stop. Arrival is shown in the destination’s local time.', toZone);
      } else {
        const visitMinutes = Math.round(visitHours(to) * 60);
        const effects = stopEffects(to);
        const why = effects.reasons.length ? ` Live adjustment: ${effects.reasons.join('; ')}.` : '';
        add('stop', to, `Stop at ${name(to)}`, `${formatDuration(visitMinutes)} planned.${why}`, toZone);
        clock = new Date(clock.getTime() + visitMinutes * 60000);
      }
    }
    return {events, endTime:clock, startTime:events[0]?.time || clock};
  }

  function renderAdjustments(plan) {
    if (!plan.adjustments?.length) return '';
    const rows = plan.adjustments.map((item) => {
      const direction = item.liveDelta > 0 ? 'promoted' : 'demoted';
      const selection = item.selected ? 'kept in today’s route' : 'not selected today';
      return `<div class="ct-adjustment"><strong>${escapeHtml(name(item.id))} ${direction}</strong> — ${escapeHtml(item.reasons.join('; '))}. ${selection}.</div>`;
    }).join('');
    return `<div class="ct-adjustments" aria-label="Live route adjustments">${rows}</div>`;
  }

  function renderTodayPlan() {
    const out = $('ctTodayOutput');
    if (!currentPlan) {
      out.innerHTML = '<p class="ct-empty">Choose today’s starting point, where you plan to sleep, when you want to leave, and the time you actually have. The planner keeps the route continuous and lets current conditions change what earns time.</p>';
      return;
    }
    const p = currentPlan;
    const transitHours = p.driveHours + p.borderMinutes / 60;
    const used = transitHours + p.visitHours;
    const room = Math.max(0, p.hours - used);
    const sheet = buildDaySheet(p);
    const endPoint = coords(p.end);
    const endZone = zoneFor(p.end);
    const arrivalYmd = ymdFor(sheet.endTime, endZone);
    const sunset = endPoint ? sunTime(arrivalYmd, endPoint.lat, endPoint.lon, false) : null;
    const aurora = auroraOpportunity(p.end, sheet.endTime);
    const routeLabel = p.stayDay ? name(p.start) : `${name(p.start)} → ${name(p.end)}`;
    const call = p.stayDay
      ? `This is a stay day. The planner keeps the day local instead of pretending you need a transit segment.`
      : p.driveHours > p.hours - 0.5
        ? 'This is mostly a driving day. The route itself consumes nearly all of the available time, so optional stops are not forced into an over-budget plan.'
        : p.ids.length <= 2
          ? 'Keep this as a transit day. No intermediate stop cleared both the priority score and the honest time budget.'
          : `The route keeps ${p.ids.length - 2} intermediate stop${p.ids.length - 2 === 1 ? '' : 's'} and leaves about ${room.toFixed(1)} hours of unallocated margin.`;

    const rows = sheet.events.map((event) => `
      <div class="ct-sheet-row ${escapeHtml(event.kind)}">
        <div class="ct-sheet-time">${escapeHtml(formatClock(event.time, event.zone))}</div>
        <div class="ct-sheet-body"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(event.detail)}</span></div>
      </div>`).join('');

    let nightNote = '';
    if (sunset) {
      nightNote = `<div class="ct-night-note"><strong>Sunset at the overnight stop:</strong> ${escapeHtml(formatClock(sunset, endZone))}.`;
      if (aurora?.supported) {
        const checkAt = new Date(Math.max(sheet.endTime.getTime(), sunset.getTime() + 45 * 60000));
        nightNote += ` <strong>Tonight:</strong> NOAA’s current aurora + cloud evidence supports a recheck around ${escapeHtml(formatClock(checkAt, endZone))} (${aurora.label}; Kp ${aurora.peak}, cloud cover about ${aurora.clouds}%).`;
      } else if (CONDITIONS.aurora && region(p.end) === 'mi') {
        nightNote += ' The current Michigan aurora evidence does not clear the planner’s Kp + cloud gate for a dedicated night block.';
      }
      nightNote += '</div>';
    }

    out.innerHTML = `
      <div class="ct-plan-summary">
        <div class="ct-metric"><strong>${p.miles.toLocaleString()} mi</strong>segment estimate</div>
        <div class="ct-metric"><strong>~${p.driveHours.toFixed(1)} hr</strong>base driving</div>
        <div class="ct-metric"><strong>${p.borderMinutes ? `${p.borderMinutes} min` : '0 min'}</strong>live Sault wait added</div>
        <div class="ct-metric"><strong>${p.ids.length}</strong>route stops today</div>
      </div>
      <div class="ct-plan-call"><strong>${escapeHtml(routeLabel)}</strong><br>${escapeHtml(call)}</div>
      ${renderAdjustments(p)}
      <div class="ct-day-sheet">
        <div class="ct-sheet-head"><strong>Today’s day sheet</strong><span>local clock times · CT / ET changes handled</span></div>
        ${rows}
      </div>
      ${nightNote}
      <div class="ct-plan-actions">
        <button type="button" id="ctAddToday">Use this as my trip</button>
        <a href="${directionsUrl(p.ids)}" target="_blank" rel="noopener" id="ctTodayDirections">Open today’s directions →</a>
      </div>
    `;
    $('ctAddToday').addEventListener('click', () => {
      page.setTrip(p.ids, {direction:document.querySelector('.direction-btn.active')?.dataset.direction || 'counterclockwise'});
      track('add-day', {stops:p.ids.length});
    });
    $('ctTodayDirections').addEventListener('click', () => track('directions', {stops:p.ids.length}));
  }

  function signal(id, type, title, state, detail, href, stopId = null, extraHref = null) {
    return {id,type,title,state,detail,href,stopId,extraHref};
  }

  function routeIncludes(stopId) {
    return !currentPlan || currentPlan.segment.includes(String(stopId));
  }

  function waterSignal() {
    if (!currentPlan || !CONDITIONS.buoys) return signal('water','Water','Lake-facing conditions','check','Fresh Lake Superior buoy readings are still loading or unavailable.','/great-lakes-buoys/');
    const rows = currentPlan.segment
      .map((id) => nearestFreshSuperiorBuoy(id))
      .filter(Boolean);
    if (!rows.length) return signal('water','Water','Lake-facing conditions','check','No fresh Lake Superior wave-height reading is close enough to today’s segment; the planner does not use the cached fallback as current.','/great-lakes-buoys/');
    rows.sort((a,b) => Number(b.wave_ht) - Number(a.wave_ht));
    const worst = rows[0];
    const ft = Number(worst.wave_ht) * 3.28084;
    const state = ft >= 4 ? 'warn' : 'live';
    return signal('water','Water','Lake-facing conditions',state,`Roughest fresh nearby reading used by today’s scoring is about ${ft.toFixed(1)} ft at ${worst.name || worst.id}. Boat/beach stops are adjusted from this evidence.`,'/great-lakes-buoys/');
  }

  function smokeSignal() {
    if (!currentPlan) return signal('smoke','Air','Smoke / PM2.5','check','Build a segment to load route-specific U.S. smoke/PM2.5 checks.','/national-tools/smoke/');
    const us = currentPlan.segment.some((id) => ['start','mn','wi','mi'].includes(region(id)));
    if (!us) return null;
    if (!CONDITIONS.smokeSamples.length) return signal('smoke','Air','Smoke / PM2.5','check','Route-specific smoke/PM2.5 samples are loading or unavailable; no air-quality penalty is being assumed.','/national-tools/smoke/');
    const worst = CONDITIONS.smokeSamples
      .map((sample) => ({...sample, aqi:Number(sample.data?.current?.pm25_aqi)}))
      .filter((sample) => Number.isFinite(sample.aqi))
      .sort((a,b) => b.aqi - a.aqi)[0];
    if (!worst) return signal('smoke','Air','Smoke / PM2.5','check','The route samples returned no current PM2.5 AQI, so the planner is not changing stops from this signal.','/national-tools/smoke/');
    return signal('smoke','Air','Smoke / PM2.5',worst.aqi >= 101 ? 'warn' : 'live',`Highest route sample: PM2.5 AQI ${Math.round(worst.aqi)} near ${name(worst.id)}. Scenic/outdoor stops are demoted only when AQI reaches 101 or higher.`,'/national-tools/smoke/');
  }

  function fallSignal() {
    if (!currentPlan || !CONDITIONS.fall?.inSeason) return null;
    const snapshots = currentPlan.segment.map((id) => fallSnapshot(id)).filter(Boolean);
    if (!snapshots.length) return null;
    snapshots.sort((a,b) => b.pct - a.pct);
    const top = snapshots[0];
    return signal('color','Season','Fall color timing','live',`${top.name} is ${top.label.toLowerCase()} at about ${top.pct}%. Scenic Michigan stops receive a bounded live boost from the shared fall-color model.`,'/fall-color/');
  }

  function auroraSignal() {
    if (!currentPlan || region(currentPlan.end) !== 'mi') return null;
    const op = auroraOpportunity(currentPlan.end, new Date());
    if (!op) return signal('aurora','Tonight','Aurora opportunity','check','The Michigan aurora feed is unavailable or does not cover this overnight stop cleanly.','/northern-lights-michigan/');
    const state = op.supported ? 'live' : 'check';
    const detail = op.clouds == null
      ? `Peak Kp ${op.peak}; local cloud evidence is unavailable, so no dedicated night block is added.`
      : `Peak Kp ${op.peak}; ${op.label} cloud cover near the peak is about ${op.clouds}%. ${op.supported ? 'The day sheet adds an after-dark recheck.' : 'This does not clear the planner’s Kp + cloud gate.'}`;
    return signal('aurora','Tonight','Aurora opportunity',state,detail,'/northern-lights-michigan/');
  }

  function borderSignal() {
    if (!currentPlan) return null;
    const border = saultBorderForSegment(currentPlan.segment);
    if (!border) return null;
    const detail = border.available
      ? `${border.directionLabel} official passenger wait is ${border.display}; ${border.waitMinutes} minutes are included in today’s time budget.`
      : `${border.directionLabel} official wait is unavailable. No delay is invented; verify before committing to the crossing.`;
    return signal('border','Border','Sault Ste. Marie crossing',border.available ? 'live' : 'check',detail,'/sault-ste-marie-border-wait-time/','13','/michigan-border-wait-times/');
  }

  function accessSignal(stopId, label, selector, href) {
    if (!routeIncludes(stopId)) return null;
    const text = document.querySelector(selector)?.textContent.replace(/\s+/g,' ').trim();
    return signal(
      `access-${stopId}`,
      'Access',
      label,
      text ? 'warn' : 'check',
      text || 'Verify current access before committing time to this stop.',
      href,
      stopId
    );
  }

  function signalList() {
    const list = [];
    if (routeIncludes('1')) {
      const d = CONDITIONS.duluth;
      list.push(signal('duluth','Ships','Duluth Canal Park',d?.state || 'check',d?.detail || 'Check the live Canal Park ship watch before committing time to a bridge-side wait.','/duluth-canal-park/','1'));
    }
    if (routeIncludes('13')) {
      const s = CONDITIONS.soo;
      list.push(signal('soo','Ships','Soo Locks',s?.state || 'check',s?.detail || 'Use the live Soo vessel picture to decide whether a dedicated lock stop is worth the time now.','/soo-locks/','13'));
    }
    [borderSignal(),
      accessSignal('11','Pictured Rocks','#stop-11 [data-current-alert="pictured-rocks"]','https://picturedrocks.chrisizworski.com/'),
      accessSignal('15','Lake Superior Provincial Park','#stop-15 [data-current-alert="lspp"]','https://www.ontarioparks.ca/park/LakeSuperior/alerts'),
      waterSignal(),
      smokeSignal(),
      fallSignal(),
      auroraSignal()
    ].filter(Boolean).forEach((item) => list.push(item));
    if (routeIncludes('21')) {
      list.push(signal('pigeon','Border','Pigeon River / Grand Portage crossing','check','This is an international crossing, but the Michigan border-wait feed does not cover it. The planner does not invent a live wait. Verify crossing requirements before the day.','https://www.cbp.gov/about/contact/ports/grand-portage','21'));
    }
    return list;
  }

  function renderSignals() {
    const grid = $('ctIntelGrid');
    if (!grid) return;
    grid.replaceChildren();
    signalList().forEach((s) => {
      const article = document.createElement('article');
      article.className = 'ct-signal';
      article.dataset.signal = s.id;
      const stateLabel = s.state === 'live' ? 'LIVE' : s.state === 'warn' ? 'AFFECTING PLAN' : 'VERIFY';
      article.innerHTML = `<div class="ct-signal-top"><span class="ct-signal-type">${escapeHtml(s.type)}</span><span class="ct-state ${escapeHtml(s.state)}">${stateLabel}</span></div><strong>${escapeHtml(s.title)}</strong><p>${escapeHtml(s.detail)}</p><div class="ct-signal-actions"><a href="${s.href}"${s.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>Open specialist →</a>${s.extraHref ? `<a href="${s.extraHref}">All crossings →</a>` : ''}${s.stopId ? `<button type="button" data-focus-stop="${s.stopId}">Show on map</button>` : ''}</div>`;
      grid.appendChild(article);
    });
    grid.querySelectorAll('[data-focus-stop]').forEach((button) => {
      button.addEventListener('click', () => focusStop(button.dataset.focusStop, button.closest('.ct-signal')?.dataset.signal || 'signal'));
    });
  }

  function mapControlIds(mode) {
    if (mode === 'ships') return SHIP_STOPS;
    if (mode === 'access') return ACCESS_STOPS;
    if (mode === 'today' && currentPlan) return currentPlan.ids;
    return ['1','11','13','15','21','31'];
  }

  function renderMapPicks(mode) {
    document.querySelectorAll('.ct-map-live-tabs button').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.mapMode === mode));
    });
    const picks = $('ctMapPicks');
    if (!picks) return;
    picks.replaceChildren();
    mapControlIds(mode).forEach((id) => {
      if (!card(id)) return;
      const button = document.createElement('button');
      const live = id === '1' ? CONDITIONS.duluth : id === '13' ? CONDITIONS.soo : null;
      const access = ['11','15'].includes(id) ? 'warn' : '';
      button.className = `ct-map-pick${live?.state ? ` ${live.state}` : access ? ` ${access}` : ''}`;
      button.type = 'button';
      button.textContent = name(id).replace(/, (Michigan|Minnesota|Ontario.*)$/i,'');
      button.addEventListener('click', () => focusStop(id, `map-${mode}`));
      picks.appendChild(button);
    });
  }

  function focusStop(id, source) {
    const map = document.querySelector('.map-frame');
    map?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'center'});
    let attempts = 0;
    const apply = () => {
      if (window.CircleTourMap?.focusStop) {
        window.CircleTourMap.focusStop(String(id));
        return;
      }
      attempts += 1;
      if (attempts <= 30) setTimeout(apply, 150);
    };
    apply();
    track('map-focus', {stop:Number(id), source});
  }

  function populateStops() {
    const options = ROUTE_ORDER.filter((id) => card(id))
      .map((id) => `<option value="${id}">${escapeHtml(name(id))}</option>`).join('');
    $('ctTodayStart').innerHTML = options;
    $('ctTodayEnd').innerHTML = options;
    $('ctTodayStart').value = '1';
    $('ctTodayEnd').value = '5';
  }

  function installUi() {
    const section = document.createElement('section');
    section.className = 'ct-today';
    section.id = 'circleTourToday';
    section.setAttribute('aria-labelledby','circleTourTodayTitle');
    section.innerHTML = `
      <div class="ct-today-shell">
        <div class="ct-today-head">
          <div class="ct-today-kicker">Today on the Circle Tour</div>
          <h2 id="circleTourTodayTitle">Build a day that reacts to the lake, border, season, access and tonight.</h2>
          <p>Pick where you are, where you plan to sleep, when you want to leave, and the hours you actually have. Current evidence can promote, demote or remove optional stops before the clock-based day sheet is built.</p>
        </div>
        <div class="ct-today-form">
          <div class="ct-field"><label for="ctTodayStart">Start today</label><select id="ctTodayStart"></select></div>
          <div class="ct-field"><label for="ctTodayEnd">Sleep tonight</label><select id="ctTodayEnd"></select></div>
          <div class="ct-field"><label for="ctTodayStartTime">Leave</label><select id="ctTodayStartTime"><option value="06:00">6:00 AM</option><option value="07:00">7:00 AM</option><option value="08:00" selected>8:00 AM</option><option value="09:00">9:00 AM</option><option value="10:00">10:00 AM</option></select></div>
          <div class="ct-field"><label for="ctTodayHours">Available</label><select id="ctTodayHours"><option value="4">4 hours</option><option value="6">6 hours</option><option value="8" selected>8 hours</option><option value="10">10 hours</option><option value="12">12 hours</option></select></div>
          <div class="ct-interest-wrap"><span class="ct-interest-label">Prioritize</span><div class="ct-interest-row"><button class="ct-interest" type="button" data-interest="must" aria-pressed="true">Highlights</button><button class="ct-interest" type="button" data-interest="waterfall" aria-pressed="false">Waterfalls</button><button class="ct-interest" type="button" data-interest="hiking" aria-pressed="false">Hikes</button><button class="ct-interest" type="button" data-interest="history" aria-pressed="false">History</button><button class="ct-interest" type="button" data-interest="boat" aria-pressed="false">Boat</button></div></div>
          <button class="ct-build" id="ctBuildToday" type="button">Build today’s day sheet</button>
        </div>
        <div class="ct-today-output" id="ctTodayOutput" aria-live="polite"></div>
        <div class="ct-intel">
          <div class="ct-intel-head"><h3>Live along your route</h3><p>Only fresh, supported evidence changes the plan. Missing feeds do not become “good conditions.”</p></div>
          <div class="ct-intel-grid" id="ctIntelGrid"></div>
        </div>
      </div>`;
    planner.insertAdjacentElement('afterend', section);
    populateStops();
    renderTodayPlan();
    renderSignals();

    document.querySelectorAll('.ct-interest').forEach((button) => button.addEventListener('click', () => {
      button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
    }));
    $('ctBuildToday').addEventListener('click', () => buildTodayPlan());
    ['ctTodayStart','ctTodayEnd','ctTodayStartTime','ctTodayHours'].forEach((id) => {
      $(id).addEventListener('change', () => { if (currentPlan) buildTodayPlan({measure:false}); });
    });
    document.querySelectorAll('.direction-btn').forEach((button) => button.addEventListener('click', () => {
      if (currentPlan) setTimeout(() => buildTodayPlan({measure:false}), 0);
    }));

    const mapShell = document.querySelector('.map-shell');
    const frame = mapShell?.querySelector('.map-frame');
    if (mapShell && frame) {
      const controls = document.createElement('div');
      controls.className = 'ct-map-live';
      controls.innerHTML = `<div class="ct-map-live-head"><strong>Route intelligence</strong><span>Focus the map on what can change the day</span></div><div class="ct-map-live-tabs"><button type="button" data-map-mode="today" aria-pressed="true">Today</button><button type="button" data-map-mode="ships" aria-pressed="false">Ships</button><button type="button" data-map-mode="access" aria-pressed="false">Access / border</button><button type="button" data-map-mode="core" aria-pressed="false">Core live stops</button></div><div class="ct-map-picks" id="ctMapPicks"></div>`;
      mapShell.insertBefore(controls, frame);
      controls.querySelectorAll('[data-map-mode]').forEach((button) => {
        button.addEventListener('click', () => renderMapPicks(button.dataset.mapMode));
      });
      renderMapPicks('today');
    }
  }

  async function loadDuluth() {
    try {
      const data = await fetchJson('/api/duluth-canal');
      if (!data?.ok) throw new Error('Duluth unavailable');
      const pick = data.watchPick;
      const detail = pick
        ? `${pick.name} has a supported Canal Park ${pick.direction === 'departure' ? 'departure' : 'arrival'} watch window.`
        : 'No supported Canal Park passage to call from current AIS evidence. That is not a zero-traffic report.';
      CONDITIONS.duluth = {state:pick ? 'live' : 'check', short:pick ? 'ship watch active' : 'verify ships', detail};
    } catch {
      CONDITIONS.duluth = {state:'check', short:'live check unavailable', detail:'The Circle Tour could not refresh Duluth AIS. Open Canal Park Live before planning a ship wait.'};
    }
  }

  async function loadSoo() {
    try {
      const data = await fetchJson('/api/soo-ais');
      if (!data?.ok || !Array.isArray(data.vessels)) throw new Error('Soo unavailable');
      const inLock = data.nextShip?.inLock || [];
      const pick = data.nextShip?.pick;
      const detail = inLock.length
        ? `${inLock[0].name || 'A vessel'} is reported in the ${inLock[0].chamberName || 'locks'} now.`
        : pick
          ? `${pick.name || 'A vessel'} is the current supported next-ship estimate for the locks.`
          : `No fresh inbound ship call right now; ${data.vessels.length} recent vessel report${data.vessels.length === 1 ? '' : 's'} are still available near the Soo.`;
      CONDITIONS.soo = {state:(inLock.length || pick) ? 'live' : 'check', short:inLock.length ? 'ship in locks' : pick ? 'ship approaching' : 'verify ships', detail};
    } catch {
      CONDITIONS.soo = {state:'check', short:'live check unavailable', detail:'The Circle Tour could not refresh Soo AIS. Open Soo Locks Live before allocating a ship-watch block.'};
    }
  }

  async function loadBuoys() {
    try { CONDITIONS.buoys = await fetchJson('/api/buoys'); }
    catch { CONDITIONS.buoys = {stations:[], unavailable:true}; }
  }

  async function loadFall() {
    try { CONDITIONS.fall = await fetchJson('/api/fall-color?view=snapshot', 15000); }
    catch { CONDITIONS.fall = null; }
  }

  async function loadAurora() {
    try { CONDITIONS.aurora = await fetchJson('/api/aurora'); }
    catch { CONDITIONS.aurora = null; }
  }

  async function loadBorder() {
    try { CONDITIONS.border = await fetchJson('/api/border-crossings', 15000); }
    catch { CONDITIONS.border = null; }
  }

  function smokeSampleIds(plan) {
    const candidates = plan.segment.filter((id) => ['start','mn','wi','mi'].includes(region(id)));
    if (!candidates.length) return [];
    if (candidates.length <= 2) return Array.from(new Set(candidates));
    const mid = candidates[Math.floor((candidates.length - 1) / 2)];
    return Array.from(new Set([candidates[0], mid, candidates[candidates.length - 1]]));
  }

  async function loadSmokeForPlan(plan) {
    const ids = smokeSampleIds(plan);
    const key = ids.join(',');
    if (!key) {
      CONDITIONS.smokeSamples = [];
      CONDITIONS.smokeKey = '';
      renderSignals();
      return;
    }
    if (CONDITIONS.smokeKey === key && CONDITIONS.smokeSamples.length) return;
    const serial = ++smokeRequestSerial;
    const samples = await Promise.all(ids.map(async (id) => {
      const point = coords(id);
      try {
        const data = await fetchJson(`/api/fall-color?view=circle-tour-smoke&lat=${point.lat.toFixed(4)}&lon=${point.lon.toFixed(4)}`, 15000);
        return {id,point,data};
      } catch {
        return {id,point,data:null};
      }
    }));
    if (serial !== smokeRequestSerial) return;
    CONDITIONS.smokeSamples = samples.filter((sample) => sample.data);
    CONDITIONS.smokeKey = key;
    if (currentPlan) buildTodayPlan({measure:false, requestSmoke:false});
    else renderSignals();
  }

  async function refreshLive() {
    await Promise.allSettled([loadDuluth(), loadSoo(), loadBuoys(), loadFall(), loadAurora(), loadBorder()]);
    CONDITIONS.refreshedAt = new Date().toISOString();
    if (currentPlan) buildTodayPlan({measure:false});
    else {
      renderSignals();
      const activeMode = document.querySelector('.ct-map-live-tabs button[aria-pressed="true"]')?.dataset.mapMode || 'today';
      renderMapPicks(activeMode);
    }
  }

  addStyles();
  installUi();
  setTimeout(refreshLive, 0);

  window.CircleTourToday = {
    build: buildTodayPlan,
    refreshLive,
    getPlan: () => currentPlan ? {
      ...currentPlan,
      ids:currentPlan.ids.slice(),
      segment:currentPlan.segment.slice(),
      adjustments:(currentPlan.adjustments || []).map((item) => ({...item,reasons:item.reasons.slice()})),
    } : null,
  };
})();