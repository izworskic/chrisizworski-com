(() => {
  'use strict';

  const page = window.CircleTourPage;
  const planner = document.querySelector('.route-planner');
  if (!page || !planner || document.getElementById('circleTourToday')) return;

  const ROUTE_ORDER = ['1','2','3','4','5','6','7','8','9','10','11','12','31','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30'];
  const SIGNAL_STOPS = {
    ships: ['1','13','31'],
    access: ['11','13','21'],
  };
  const LIVE = new Map();
  let currentPlan = null;

  const $ = (id) => document.getElementById(id);
  const card = (id) => $(`stop-${id}`);
  const name = (id) => card(id)?.querySelector('.stop-name')?.textContent.trim() || `Stop ${id}`;
  const acts = (id) => new Set((card(id)?.dataset.acts || '').split(/\s+/).filter(Boolean));

  function track(action, data = {}) {
    page.track?.(`today-${action}`, data);
  }

  function addStyles() {
    const style = document.createElement('style');
    style.id = 'circle-tour-today-styles';
    style.textContent = `
      .ct-today{max-width:1280px;margin:16px auto 0;padding:0 20px 20px}.ct-today-shell{background:#fff;border:1px solid var(--border);border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(12,40,52,.06)}
      .ct-today-head{padding:18px 20px 12px;background:linear-gradient(135deg,#edf6f5,#f8faf7);border-bottom:1px solid var(--border)}.ct-today-kicker{font:700 11px/1.2 Arial,sans-serif;letter-spacing:.8px;text-transform:uppercase;color:#2c5f2d;margin-bottom:6px}.ct-today-head h2{font-size:21px;font-weight:normal;line-height:1.25;margin:0 0 5px;color:#17352a}.ct-today-head p{font-size:13px;line-height:1.65;color:#5d665f;margin:0}
      .ct-today-form{display:grid;grid-template-columns:1.25fr 1.25fr .7fr 1fr auto;gap:9px;align-items:end;padding:15px 20px}.ct-field label,.ct-interest-label{display:block;font:700 10px/1.2 Arial,sans-serif;text-transform:uppercase;letter-spacing:.55px;color:#7b827d;margin:0 0 5px}.ct-field select{width:100%;min-height:42px;border:1px solid #d8d8d0;background:#fff;border-radius:4px;padding:8px 9px;font:13px Georgia,'Times New Roman',serif;color:#2c2c2c}.ct-interest-row{display:flex;gap:5px;flex-wrap:wrap}.ct-interest{border:1px solid #d8d8d0;background:#faf9f6;border-radius:14px;padding:5px 8px;font:11px Georgia,'Times New Roman',serif;cursor:pointer;color:#555}.ct-interest[aria-pressed="true"]{background:#2c5f2d;color:#fff;border-color:#2c5f2d}.ct-build{min-height:42px;border:0;border-radius:4px;padding:9px 14px;background:#173f50;color:#fff;font:700 12px Georgia,'Times New Roman',serif;cursor:pointer}.ct-build:hover{background:#0d3545}
      .ct-today-output{padding:0 20px 18px}.ct-empty{font-size:13px;color:#666;padding:2px 0}.ct-plan-summary{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 12px}.ct-metric{background:#f6f5f1;border:1px solid #e7e4dc;border-radius:3px;padding:7px 10px;font-size:12px}.ct-metric strong{display:block;color:#17352a;font-size:14px}.ct-plan-call{border-left:4px solid #2f7057;background:#f4faf7;padding:10px 12px;margin:0 0 12px;font-size:13px;line-height:1.55}.ct-plan-stops{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:7px}.ct-plan-stop{border:1px solid #e5e2db;background:#fff;border-radius:4px;padding:9px 10px;font-size:12px;line-height:1.5}.ct-plan-stop strong{display:block;font-size:13px;color:#27372f}.ct-plan-stop span{color:#68716b}.ct-plan-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ct-plan-actions button,.ct-plan-actions a{border-radius:3px;padding:8px 11px;font:700 12px Georgia,'Times New Roman',serif;text-decoration:none;cursor:pointer}.ct-plan-actions button{border:0;background:#2c5f2d;color:#fff}.ct-plan-actions a{border:1px solid #ccd7d1;color:#245b3b;background:#fff}
      .ct-intel{border-top:1px solid var(--border);padding:16px 20px 18px}.ct-intel-head{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:10px}.ct-intel-head h3{font-size:16px;font-weight:normal;color:#17352a;margin:0}.ct-intel-head p{font-size:11px;color:#888;margin:0}.ct-intel-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}.ct-signal{border:1px solid #e5e2db;border-radius:4px;padding:10px 11px;background:#fafaf8;min-height:112px}.ct-signal-top{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:5px}.ct-signal-type{font:700 10px/1.2 Arial,sans-serif;text-transform:uppercase;letter-spacing:.55px;color:#777}.ct-state{font:700 10px/1.2 Arial,sans-serif;border-radius:10px;padding:3px 6px;background:#e9eee9;color:#375947}.ct-state.live{background:#e2f4e8;color:#23633c}.ct-state.warn{background:#fff1d6;color:#83540b}.ct-signal strong{display:block;font-size:13px;color:#26342d;margin-bottom:4px}.ct-signal p{font-size:12px;line-height:1.5;color:#606862;margin:0 0 7px}.ct-signal-actions{display:flex;gap:8px;flex-wrap:wrap}.ct-signal a,.ct-signal button{font:700 11px Georgia,'Times New Roman',serif;color:#245b3b;background:none;border:0;padding:0;cursor:pointer;text-decoration:none}.ct-signal a:hover,.ct-signal button:hover{text-decoration:underline}
      .ct-map-live{margin:0 0 9px;padding:9px 10px;border:1px solid #d9e3de;background:#f7fbf9;border-radius:4px}.ct-map-live-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}.ct-map-live-head strong{font-size:12px;color:#17352a}.ct-map-live-head span{font-size:10px;color:#888}.ct-map-live-tabs{display:flex;gap:5px;flex-wrap:wrap}.ct-map-live-tabs button{border:1px solid #cfd9d4;background:#fff;border-radius:12px;padding:4px 8px;font:11px Georgia,'Times New Roman',serif;color:#4c5d54;cursor:pointer}.ct-map-live-tabs button[aria-pressed="true"]{background:#173f50;color:#fff;border-color:#173f50}.ct-map-picks{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.ct-map-pick{border:0;background:#e9f2ee;border-radius:3px;padding:5px 7px;font:11px Georgia,'Times New Roman',serif;color:#245b3b;cursor:pointer}.ct-map-pick.live:before{content:'●';color:#2f8b54;margin-right:5px}.ct-map-pick.warn:before{content:'●';color:#c28518;margin-right:5px}
      @media(max-width:850px){.ct-today{padding:0 12px 16px}.ct-today-form{grid-template-columns:1fr 1fr;padding:13px}.ct-interest-wrap{grid-column:1/-1}.ct-build{grid-column:1/-1}.ct-today-output,.ct-intel{padding-left:13px;padding-right:13px}}
      @media(max-width:520px){.ct-today-form{grid-template-columns:1fr}.ct-interest-wrap,.ct-build{grid-column:auto}.ct-today-head{padding:15px 13px 11px}.ct-plan-stops,.ct-intel-grid{grid-template-columns:1fr}.ct-intel-head{display:block}.ct-intel-head p{margin-top:4px}}
    `;
    document.head.appendChild(style);
  }

  function routeOrder() {
    const direction = document.querySelector('.direction-btn.active')?.dataset.direction || 'counterclockwise';
    return direction === 'clockwise' ? [ROUTE_ORDER[0], ...ROUTE_ORDER.slice(1).reverse()] : ROUTE_ORDER.slice();
  }

  function segmentIds(start, end) {
    const order = routeOrder();
    const a = order.indexOf(start);
    const b = order.indexOf(end);
    if (a < 0 || b < 0) return [];
    if (a <= b) return order.slice(a, b + 1);
    return order.slice(a).concat(order.slice(0, b + 1));
  }

  function edgeMiles(from, to) {
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
    const meta = Array.from(card(id)?.querySelectorAll('.stop-dist') || []).map((node) => node.textContent).find((text) => /day/i.test(text)) || '';
    const match = meta.match(/([\d.]+)\s*days?/i);
    const days = match ? Number(match[1]) : 0.5;
    if (days <= 0.25) return 0.75;
    if (days <= 0.5) return 1.25;
    if (days <= 0.75) return 1.75;
    if (days <= 1) return 2.5;
    if (days <= 1.5) return 3.5;
    return 4.5;
  }

  function scoreStop(id, interests) {
    const tags = acts(id);
    let score = tags.has('must') ? 5 : 0;
    interests.forEach((interest) => { if (tags.has(interest)) score += 3; });
    if (LIVE.get(id)?.state === 'live') score += 3;
    if (['1','11','13','31'].includes(id)) score += 1;
    return score;
  }

  function chosenInterests() {
    return Array.from(document.querySelectorAll('.ct-interest[aria-pressed="true"]')).map((button) => button.dataset.interest);
  }

  function directionsUrl(ids) {
    const names = ids.map((id) => `${name(id)}, Lake Superior`);
    if (names.length < 2) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(names[0] || 'Lake Superior')}`;
    let middle = names.slice(1, -1);
    if (middle.length > 8) middle = Array.from({length: 8}, (_, i) => middle[Math.round(i * (middle.length - 1) / 7)]);
    const params = new URLSearchParams({api:'1', origin:names[0], destination:names.at(-1), travelmode:'driving'});
    if (middle.length) params.set('waypoints', middle.join('|'));
    return `https://www.google.com/maps/dir/?${params}`;
  }

  function buildTodayPlan({measure = true} = {}) {
    const start = $('ctTodayStart').value;
    const end = $('ctTodayEnd').value;
    const hours = Number($('ctTodayHours').value);
    const interests = chosenInterests();
    const segment = segmentIds(start, end);
    const miles = Math.round(totalMiles(segment));
    const driveHours = Math.max(0, miles / 47);
    const stopBudget = Math.max(0, hours - driveHours - 0.5);
    const optional = segment.slice(1, -1).map((id) => ({id, score:scoreStop(id, interests), hours:visitHours(id)}));
    optional.sort((a,b) => b.score - a.score || segment.indexOf(a.id) - segment.indexOf(b.id));
    const keep = new Set([start, end]);
    let used = 0;
    for (const item of optional) {
      if (item.score <= 0 && used > 0) continue;
      if (used + item.hours <= stopBudget || keep.size <= 2) {
        keep.add(item.id);
        used += item.hours;
      }
    }
    const ids = segment.filter((id) => keep.has(id));
    currentPlan = {start,end,hours,interests,segment,ids,miles,driveHours,visitHours:used};
    renderTodayPlan();
    renderSignals();
    renderMapPicks('today');
    if (measure) track('plan-build', {hours, segmentStops:segment.length, recommendedStops:ids.length, interests:interests.join('-') || 'none'});
    return currentPlan;
  }

  function renderTodayPlan() {
    const out = $('ctTodayOutput');
    if (!currentPlan) {
      out.innerHTML = '<p class="ct-empty">Choose today’s starting point, where you plan to sleep, and the time you actually have. The planner will keep the route continuous, budget driving time, and favor stops that match your interests.</p>';
      return;
    }
    const p = currentPlan;
    const room = p.hours - p.driveHours - p.visitHours;
    const stopCards = p.ids.map((id, index) => {
      const role = index === 0 ? 'Start' : index === p.ids.length - 1 ? 'Overnight' : 'Recommended stop';
      const live = LIVE.get(id);
      return `<div class="ct-plan-stop"><strong>${escapeHtml(name(id))}</strong><span>${role}${live ? ` · ${escapeHtml(live.short)}` : ''}</span></div>`;
    }).join('');
    const call = p.driveHours > p.hours - 0.5
      ? 'This is mostly a driving day. The route itself consumes nearly all of the available time, so the planner is intentionally not stuffing in extra stops.'
      : p.ids.length <= 2
        ? 'Keep this as a transit day. There is not enough honest time for a substantial intermediate stop after the drive.'
        : `This leaves about ${Math.max(0, room).toFixed(1)} hours of margin for meals, fuel, parking, short delays, or a longer stop.`;
    out.innerHTML = `
      <div class="ct-plan-summary">
        <div class="ct-metric"><strong>${p.miles.toLocaleString()} mi</strong>segment estimate</div>
        <div class="ct-metric"><strong>~${p.driveHours.toFixed(1)} hr</strong>base driving</div>
        <div class="ct-metric"><strong>${p.ids.length}</strong>route stops today</div>
      </div>
      <div class="ct-plan-call"><strong>${escapeHtml(name(p.start))} → ${escapeHtml(name(p.end))}</strong><br>${escapeHtml(call)}</div>
      <div class="ct-plan-stops">${stopCards}</div>
      <div class="ct-plan-actions"><button type="button" id="ctAddToday">Add today’s stops to my trip</button><a href="${directionsUrl(p.ids)}" target="_blank" rel="noopener" id="ctTodayDirections">Open today’s directions →</a></div>
    `;
    $('ctAddToday').addEventListener('click', () => {
      p.ids.forEach((id) => page.addStop(id));
      track('add-day', {stops:p.ids.length});
    });
    $('ctTodayDirections').addEventListener('click', () => track('directions', {stops:p.ids.length}));
  }

  function signal(id, type, title, state, detail, href, stopId, extraHref = null) {
    return {id,type,title,state,detail,href,stopId,extraHref};
  }

  function routeIncludes(stopId) {
    return !currentPlan || currentPlan.segment.includes(String(stopId));
  }

  function signalList() {
    const month = new Date().getMonth() + 1;
    const list = [];
    if (routeIncludes('1')) {
      const duluth = LIVE.get('1');
      list.push(signal('duluth','Ships','Duluth Canal Park',duluth?.state || 'check',duluth?.detail || 'Check the live Canal Park ship watch before committing time to a bridge-side wait.','/duluth-canal-park/','1'));
    }
    if (routeIncludes('13')) {
      const soo = LIVE.get('13');
      list.push(signal('soo','Ships','Soo Locks',soo?.state || 'check',soo?.detail || 'Use the live Soo vessel picture to decide whether a dedicated lock stop is worth the time now.','/soo-locks/','13'));
      list.push(signal('border','Border','Sault Ste. Marie crossing','check','The full loop crosses here. Verify current waits before committing to the international segment.','/sault-ste-marie-border-wait-time/','13','/michigan-border-wait-times/'));
    }
    if (routeIncludes('11')) {
      const alertText = document.querySelector('#stop-11 [data-current-alert="pictured-rocks"]')?.textContent.replace(/Check NPS conditions.*/i,'').trim();
      list.push(signal('pictured','Access','Pictured Rocks',alertText ? 'warn' : 'check',alertText || 'Check current access and operating mode before choosing boat, kayak, hike, or drive-up stops.','https://picturedrocks.chrisizworski.com/','11'));
    }
    if (routeIncludes('21')) list.push(signal('pigeon','Border','Pigeon River crossing','check','This is the other international crossing on the full loop. Keep the border check in the day plan.','/michigan-border-wait-times/','21'));
    list.push(signal('water','Water','Lake-facing conditions','check','Wind and waves can change boat, beach, shoreline, and photography plans even when the road is fine.','/great-lakes-buoys/',null));
    if ([6,7,8,9,10].includes(month)) list.push(signal('smoke','Visibility','Smoke / air window','check','Regional smoke can erase long lake views without changing the ordinary weather forecast.','/national-tools/smoke/',null));
    if ([9,10].includes(month)) list.push(signal('color','Season','Fall color timing','check','Current color can change which side of the lake deserves more of today’s daylight.','/fall-color/',null));
    if ([8,9,10,11,12,1,2,3].includes(month)) list.push(signal('aurora','Tonight','Aurora opportunity','check','If tonight is clear and active, your overnight stop may be worth shifting toward a dark north-facing shoreline.','/northern-lights-michigan/',null));
    return list;
  }

  function renderSignals() {
    const grid = $('ctIntelGrid');
    grid.replaceChildren();
    signalList().forEach((s) => {
      const article = document.createElement('article');
      article.className = 'ct-signal';
      article.dataset.signal = s.id;
      const stateLabel = s.state === 'live' ? 'LIVE' : s.state === 'warn' ? 'CURRENT NOTE' : 'VERIFY';
      article.innerHTML = `<div class="ct-signal-top"><span class="ct-signal-type">${escapeHtml(s.type)}</span><span class="ct-state ${s.state}">${stateLabel}</span></div><strong>${escapeHtml(s.title)}</strong><p>${escapeHtml(s.detail)}</p><div class="ct-signal-actions"><a href="${s.href}"${s.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>Open specialist →</a>${s.extraHref ? `<a href="${s.extraHref}">All crossings →</a>` : ''}${s.stopId ? `<button type="button" data-focus-stop="${s.stopId}">Show on map</button>` : ''}</div>`;
      grid.appendChild(article);
    });
    grid.querySelectorAll('[data-focus-stop]').forEach((button) => button.addEventListener('click', () => focusStop(button.dataset.focusStop, button.closest('.ct-signal')?.dataset.signal || 'signal')));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function mapControlIds(mode) {
    if (mode === 'ships') return SIGNAL_STOPS.ships;
    if (mode === 'access') return SIGNAL_STOPS.access;
    if (mode === 'today' && currentPlan) return currentPlan.ids;
    return ['1','11','13','21','31'];
  }

  function renderMapPicks(mode) {
    document.querySelectorAll('.ct-map-live-tabs button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mapMode === mode)));
    const picks = $('ctMapPicks');
    if (!picks) return;
    picks.replaceChildren();
    mapControlIds(mode).forEach((id) => {
      if (!card(id)) return;
      const button = document.createElement('button');
      const live = LIVE.get(id);
      button.className = `ct-map-pick${live ? ` ${live.state}` : ''}`;
      button.type = 'button';
      button.textContent = name(id).replace(/, (Michigan|Minnesota|Ontario.*)$/i,'');
      button.addEventListener('click', () => focusStop(id, `map-${mode}`));
      picks.appendChild(button);
    });
  }

  function focusStop(id, source) {
    const map = document.querySelector('.map-frame');
    map?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'center'});
    window.CircleTourMap?.focusStop?.(String(id));
    track('map-focus', {stop:Number(id), source});
  }

  function populateStops() {
    const options = ROUTE_ORDER.filter((id) => card(id)).map((id) => `<option value="${id}">${escapeHtml(name(id))}</option>`).join('');
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
        <div class="ct-today-head"><div class="ct-today-kicker">Today on the Circle Tour</div><h2 id="circleTourTodayTitle">Turn the 1,300-mile loop into today’s usable drive.</h2><p>Pick where you are, where you want to sleep, and the hours you actually have. Live specialist checks stay attached to the route instead of becoming another dashboard.</p></div>
        <div class="ct-today-form">
          <div class="ct-field"><label for="ctTodayStart">Start today</label><select id="ctTodayStart"></select></div>
          <div class="ct-field"><label for="ctTodayEnd">Sleep tonight</label><select id="ctTodayEnd"></select></div>
          <div class="ct-field"><label for="ctTodayHours">Available</label><select id="ctTodayHours"><option value="4">4 hours</option><option value="6">6 hours</option><option value="8" selected>8 hours</option><option value="10">10 hours</option><option value="12">12 hours</option></select></div>
          <div class="ct-interest-wrap"><span class="ct-interest-label">Prioritize</span><div class="ct-interest-row"><button class="ct-interest" type="button" data-interest="must" aria-pressed="true">Highlights</button><button class="ct-interest" type="button" data-interest="waterfall" aria-pressed="false">Waterfalls</button><button class="ct-interest" type="button" data-interest="hiking" aria-pressed="false">Hikes</button><button class="ct-interest" type="button" data-interest="history" aria-pressed="false">History</button><button class="ct-interest" type="button" data-interest="boat" aria-pressed="false">Boat</button></div></div>
          <button class="ct-build" id="ctBuildToday" type="button">Build today’s segment</button>
        </div>
        <div class="ct-today-output" id="ctTodayOutput" aria-live="polite"></div>
        <div class="ct-intel"><div class="ct-intel-head"><h3>Live along your route</h3><p>Specialist products own the underlying decision; this layer only brings the relevant check into the drive.</p></div><div class="ct-intel-grid" id="ctIntelGrid"></div></div>
      </div>`;
    planner.insertAdjacentElement('afterend', section);
    populateStops();
    renderTodayPlan();
    renderSignals();

    document.querySelectorAll('.ct-interest').forEach((button) => button.addEventListener('click', () => {
      button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
    }));
    $('ctBuildToday').addEventListener('click', () => buildTodayPlan());
    document.querySelectorAll('.direction-btn').forEach((button) => button.addEventListener('click', () => {
      if (currentPlan) window.setTimeout(() => buildTodayPlan({measure:false}), 0);
    }));

    const mapShell = document.querySelector('.map-shell');
    const frame = mapShell?.querySelector('.map-frame');
    if (mapShell && frame) {
      const controls = document.createElement('div');
      controls.className = 'ct-map-live';
      controls.innerHTML = `<div class="ct-map-live-head"><strong>Route intelligence</strong><span>Focus the map on what can change the day</span></div><div class="ct-map-live-tabs"><button type="button" data-map-mode="today" aria-pressed="true">Today</button><button type="button" data-map-mode="ships" aria-pressed="false">Ships</button><button type="button" data-map-mode="access" aria-pressed="false">Access / border</button><button type="button" data-map-mode="core" aria-pressed="false">Core live stops</button></div><div class="ct-map-picks" id="ctMapPicks"></div>`;
      mapShell.insertBefore(controls, frame);
      controls.querySelectorAll('[data-map-mode]').forEach((button) => button.addEventListener('click', () => renderMapPicks(button.dataset.mapMode)));
      renderMapPicks('today');
    }
  }

  async function loadDuluth() {
    try {
      const response = await fetch('/api/duluth-canal', {cache:'no-store', signal:AbortSignal.timeout?.(10000)});
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error('Duluth unavailable');
      const pick = data.watchPick;
      const detail = pick ? `${pick.name} has a supported Canal Park ${pick.direction === 'departure' ? 'departure' : 'arrival'} watch window.` : 'No supported Canal Park passage to call from the current AIS evidence. That is not a zero-traffic report.';
      LIVE.set('1', {state:pick ? 'live' : 'check', short:pick ? 'ship watch active' : 'verify ships', detail});
    } catch (_) {
      LIVE.set('1', {state:'check', short:'live check unavailable', detail:'The Circle Tour could not refresh Duluth AIS. Open Canal Park Live before planning a ship wait.'});
    }
  }

  async function loadSoo() {
    try {
      const response = await fetch('/api/soo-ais', {cache:'no-store', signal:AbortSignal.timeout?.(10000)});
      const data = await response.json();
      if (!response.ok || !data?.ok || !Array.isArray(data.vessels)) throw new Error('Soo unavailable');
      const inLock = data.nextShip?.inLock || [];
      const pick = data.nextShip?.pick;
      const detail = inLock.length ? `${inLock[0].name || 'A vessel'} is reported in the ${inLock[0].chamberName || 'locks'} now.` : pick ? `${pick.name || 'A vessel'} is the current supported next-ship estimate for the locks.` : `No fresh inbound ship call right now; ${data.vessels.length} recent vessel report${data.vessels.length === 1 ? '' : 's'} are still available near the Soo.`;
      LIVE.set('13', {state:(inLock.length || pick) ? 'live' : 'check', short:inLock.length ? 'ship in locks' : pick ? 'ship approaching' : 'verify ships', detail});
    } catch (_) {
      LIVE.set('13', {state:'check', short:'live check unavailable', detail:'The Circle Tour could not refresh Soo AIS. Open Soo Locks Live before allocating a ship-watch block.'});
    }
  }

  async function refreshLive() {
    await Promise.allSettled([loadDuluth(), loadSoo()]);
    renderSignals();
    renderTodayPlan();
    const activeMode = document.querySelector('.ct-map-live-tabs button[aria-pressed="true"]')?.dataset.mapMode || 'today';
    renderMapPicks(activeMode);
  }

  addStyles();
  installUi();
  refreshLive();

  window.CircleTourToday = {
    build: buildTodayPlan,
    refreshLive,
    getPlan: () => currentPlan ? {...currentPlan, ids:currentPlan.ids.slice(), segment:currentPlan.segment.slice()} : null,
  };
})();
