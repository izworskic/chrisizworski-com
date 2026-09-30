import {stopName, segment, totalMiles, visitHours, refresh, borderEffects, buildAdaptivePlan, healthNotes} from './lake-superior-circle-tour-adaptive-data.js?v=20260930-1';

(() => {
  'use strict';
  const base = window.CircleTourToday;
  const page = window.CircleTourPage;
  const form = document.querySelector('.ct-today-form');
  if (!base || !page || !form || document.getElementById('ctAdaptiveStyle')) return;

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let currentPlan = null;
  let rendering = false;
  let pendingFocus = null;

  function track(action, data = {}) { page.track?.(`today-adaptive-${action}`, data); }

  function installUi() {
    const style = document.createElement('style');
    style.id = 'ctAdaptiveStyle';
    style.textContent = `
      @media(min-width:851px){.ct-today-form{grid-template-columns:1.15fr 1.15fr .62fr .72fr 1fr auto}}
      .ct-field input[type=time]{width:100%;min-height:42px;border:1px solid #d8d8d0;background:#fff;border-radius:4px;padding:8px 9px;font:13px Georgia,'Times New Roman',serif;color:#2c2c2c}
      .ct-day-sheet{margin-top:14px;border-top:1px solid #e5e2db;padding-top:14px}.ct-day-sheet h3{margin:0 0 4px;font-size:17px;font-weight:normal;color:#17352a}.ct-day-sheet>p,.ct-live-reading{font-size:12px;line-height:1.5;color:#68716b;margin:0 0 9px}
      .ct-day-rows{border:1px solid #e4e2dc;border-radius:4px;overflow:hidden}.ct-day-row{display:grid;grid-template-columns:92px minmax(0,1fr);gap:10px;padding:10px 11px;border-top:1px solid #eceae5}.ct-day-row:first-child{border-top:0}.ct-day-row.drive{background:#f9faf8}.ct-day-row.arrive{background:#f3f8f5}.ct-day-row.note{background:#fff9ea}.ct-day-time{font:700 11px/1.25 Arial,sans-serif;color:#426052;padding-top:2px}.ct-day-copy strong{display:block;font-size:13px;color:#27372f}.ct-day-copy span{display:block;margin-top:2px;font-size:11px;line-height:1.45;color:#68716b}
      .ct-live-changes{margin-top:11px;padding:10px 12px;border-left:4px solid #b27a20;background:#fff9ed}.ct-live-changes strong{font-size:12px;color:#6f4910}.ct-live-changes ul{margin:5px 0 0 18px}.ct-live-changes li{font-size:12px;line-height:1.45;color:#5d625f;margin:2px 0}.ct-plan-stop small{display:block;margin-top:4px;color:#777;font-size:10px;line-height:1.4}
      @media(max-width:520px){.ct-day-row{grid-template-columns:78px 1fr}}
    `;
    document.head.appendChild(style);
    if (!$('ctTodayLeave')) {
      const field = document.createElement('div');
      field.className = 'ct-field';
      field.innerHTML = '<label for="ctTodayLeave">Leave at</label><input id="ctTodayLeave" type="time" value="08:00" min="05:00" max="18:00" step="900">';
      $('ctTodayHours')?.closest('.ct-field')?.insertAdjacentElement('afterend', field);
    }
  }

  function chosenInterests() { return Array.from(document.querySelectorAll('.ct-interest[aria-pressed="true"]')).map((button) => button.dataset.interest); }
  function leaveMinutes() { const match = String($('ctTodayLeave')?.value || '08:00').match(/^(\d{1,2}):(\d{2})$/); return match ? Number(match[1]) * 60 + Number(match[2]) : 480; }
  function clock(value) { const minutes = ((Math.round(value) % 1440) + 1440) % 1440, hour = Math.floor(minutes / 60), minute = minutes % 60; return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`; }

  function directionsUrl(ids) {
    const names = ids.map((id) => `${stopName(id)}, Lake Superior`);
    if (names.length < 2) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(names[0] || 'Lake Superior')}`;
    let middle = names.slice(1, -1);
    if (middle.length > 8) middle = Array.from({length:8}, (_, index) => middle[Math.round(index * (middle.length - 1) / 7)]);
    const params = new URLSearchParams({api:'1', origin:names[0], destination:names.at(-1), travelmode:'driving'});
    if (middle.length) params.set('waypoints', middle.join('|'));
    return `https://www.google.com/maps/dir/?${params}`;
  }

  function focusWhenMapReady(id) {
    if (!id) return;
    const invoke = () => {
      if (!window.CircleTourMap?.focusStop) return false;
      window.CircleTourMap.focusStop(String(id));
      pendingFocus = null;
      return true;
    };
    if (invoke()) return;
    pendingFocus = String(id);
    let attempts = 0;
    const timer = window.setInterval(() => { attempts += 1; if ((pendingFocus && invoke()) || attempts >= 30) window.clearInterval(timer); }, 200);
  }

  function daySheet(plan) {
    if (plan.start === plan.end) return `<div class="ct-day-sheet"><h3>Clock-based day sheet</h3><p>This is a stay day, not a loop segment.</p><div class="ct-day-rows"><div class="ct-day-row arrive"><div class="ct-day-time">${clock(plan.leave)}</div><div class="ct-day-copy"><strong>Start and finish in ${esc(stopName(plan.start))}</strong><span>Use this stop’s specialist links for local timing. The Circle Tour does not invent a local sub-itinerary.</span></div></div></div></div>`;
    let cursor = plan.leave;
    const rows = [`<div class="ct-day-row arrive"><div class="ct-day-time">${clock(cursor)}</div><div class="ct-day-copy"><strong>Leave ${esc(stopName(plan.start))}</strong><span>${plan.hours} hours available for the route.</span></div></div>`];
    for (let index = 1; index < plan.ids.length; index += 1) {
      const from = plan.ids[index - 1], to = plan.ids[index], route = segment(from, to), routeMiles = Math.round(totalMiles(route)), baseMinutes = Math.round((routeMiles / 47) * 60), border = borderEffects(route), depart = cursor;
      cursor += baseMinutes + border.minutes;
      const driveBits = [`${routeMiles} mi`, `~${Math.round((baseMinutes + border.minutes) / 5) * 5} min planning drive`, ...border.notes];
      rows.push(`<div class="ct-day-row drive"><div class="ct-day-time">${clock(depart)}–${clock(cursor)}</div><div class="ct-day-copy"><strong>Drive to ${esc(stopName(to))}</strong><span>${esc(driveBits.join(' · '))}</span></div></div>`);
      if (index < plan.ids.length - 1) {
        const selected = plan.chosen.get(to), visitMinutes = Math.round((selected?.hours || visitHours(to)) * 60), arrive = cursor;
        cursor += visitMinutes;
        rows.push(`<div class="ct-day-row"><div class="ct-day-time">${clock(arrive)}–${clock(cursor)}</div><div class="ct-day-copy"><strong>${esc(stopName(to))}</strong><span>${esc(selected?.reasons?.[0] || 'Recommended from your priorities and available time.')}</span></div></div>`);
      }
    }
    rows.push(`<div class="ct-day-row arrive"><div class="ct-day-time">${clock(cursor)}</div><div class="ct-day-copy"><strong>Arrive ${esc(stopName(plan.end))}</strong><span>Keep the remaining margin for meals, fuel, parking, delays, or a short unplanned stop.</span></div></div>`);
    if (plan.aurora.note) rows.push(`<div class="ct-day-row note"><div class="ct-day-time">Tonight</div><div class="ct-day-copy"><strong>Protect an aurora recheck window</strong><span>${esc(plan.aurora.note)}</span></div></div>`);
    return `<div class="ct-day-sheet"><h3>Clock-based day sheet</h3><p>Times are planning estimates from route mileage, your departure time, visit blocks, and any usable official Sault wait—not live traffic ETAs.</p><div class="ct-day-rows">${rows.join('')}</div></div>`;
  }

  function liveChanges(plan) {
    const notes = [...plan.border.notes, ...(plan.aurora.note ? [plan.aurora.note] : [])];
    for (const item of [...plan.chosen.values(), ...plan.excluded]) for (const reason of item.reasons) notes.push(`${stopName(item.id)}: ${reason}`);
    notes.push(...healthNotes());
    const unique = Array.from(new Set(notes)).slice(0, 8);
    return unique.length ? `<div class="ct-live-changes"><strong>What live conditions changed</strong><ul>${unique.map((note) => `<li>${esc(note)}</li>`).join('')}</ul></div>` : '';
  }

  function render(plan) {
    const output = $('ctTodayOutput');
    if (!output || !plan) return;
    rendering = true;
    const flexible = plan.hours - plan.driveHours - plan.visitHours - plan.aurora.hours;
    const cards = plan.ids.map((id, index) => {
      const selected = plan.chosen.get(id), role = index === 0 ? 'Start' : index === plan.ids.length - 1 ? 'Overnight' : 'Recommended stop';
      return `<div class="ct-plan-stop"><strong>${esc(stopName(id))}</strong><span>${role}</span>${selected?.reasons?.length ? `<small>${esc(selected.reasons.join(' '))}</small>` : ''}</div>`;
    }).join('');
    const call = plan.start === plan.end ? 'Stay day: no route miles are added.' : plan.driveHours > plan.hours - plan.aurora.hours ? 'Transit-heavy day. Optional stops are not forced into an over-budget plan.' : plan.ids.length <= 2 ? 'No optional stop cleared both the value threshold and the honest time budget.' : `About ${Math.max(0, flexible).toFixed(1)} hours of flexible margin remain${plan.aurora.hours ? ', including protected night-sky time' : ''}.`;
    output.innerHTML = `<p class="ct-live-reading"><strong>Live route read:</strong> water, smoke, fall color, aurora, border, access and ship signals affect the plan only when usable.</p><div class="ct-plan-summary"><div class="ct-metric"><strong>${plan.miles} mi</strong>segment estimate</div><div class="ct-metric"><strong>~${plan.driveHours.toFixed(1)} hr</strong>drive + Sault wait</div><div class="ct-metric"><strong>${plan.ids.length}</strong>route stops</div></div><div class="ct-plan-call"><strong>${esc(stopName(plan.start))}${plan.start === plan.end ? '' : ` → ${esc(stopName(plan.end))}`}</strong><br>${esc(call)}</div><div class="ct-plan-stops">${cards}</div>${daySheet(plan)}${liveChanges(plan)}<div class="ct-plan-actions"><button type="button" id="ctAdaptiveAdd">Use today’s stops as my trip</button><a href="${directionsUrl(plan.ids)}" target="_blank" rel="noopener" id="ctAdaptiveDirections">Open today’s directions →</a></div>`;
    $('ctAdaptiveAdd')?.addEventListener('click', () => { page.setTrip?.(plan.ids, {measure:true}); track('add-day', {stops:plan.ids.length}); });
    $('ctAdaptiveDirections')?.addEventListener('click', () => track('directions', {stops:plan.ids.length}));
    document.querySelectorAll('[data-focus-stop]').forEach((button) => button.addEventListener('click', () => focusWhenMapReady(button.dataset.focusStop), {once:true}));
    rendering = false;
  }

  async function build({measure = true} = {}) {
    const start = $('ctTodayStart')?.value, end = $('ctTodayEnd')?.value, hours = Number($('ctTodayHours')?.value || 8);
    if (!start || !end) return null;
    const route = segment(start, end), output = $('ctTodayOutput');
    if (output) output.innerHTML = '<p class="ct-empty">Reading live route conditions and rebuilding the day…</p>';
    try { await refresh(route); } catch {}
    currentPlan = buildAdaptivePlan({start, end, hours, interests:chosenInterests(), leave:leaveMinutes()});
    render(currentPlan);
    if (measure) track('plan-build', {segmentStops:route.length,recommendedStops:currentPlan.ids.length,liveBorderMinutes:currentPlan.border.minutes,auroraReserveMinutes:Math.round(currentPlan.aurora.hours * 60)});
    return currentPlan;
  }

  function wire() {
    $('ctBuildToday')?.addEventListener('click', (event) => {
      event.preventDefault(); event.stopImmediatePropagation();
      build().catch(() => { currentPlan = buildAdaptivePlan({start:$('ctTodayStart')?.value,end:$('ctTodayEnd')?.value,hours:Number($('ctTodayHours')?.value || 8),interests:chosenInterests(),leave:leaveMinutes()}); render(currentPlan); });
    }, true);
    document.querySelectorAll('.direction-btn').forEach((button) => button.addEventListener('click', () => { if (currentPlan) window.setTimeout(() => build({measure:false}), 0); }));
    $('ctTodayLeave')?.addEventListener('change', () => { if (currentPlan) build({measure:false}); });
    const output = $('ctTodayOutput');
    if (output) new MutationObserver(() => { if (currentPlan && !rendering && !output.querySelector('.ct-day-sheet')) queueMicrotask(() => render(currentPlan)); }).observe(output, {childList:true, subtree:true});
    const mapFrame = document.querySelector('.map-frame');
    mapFrame?.addEventListener('pointerenter', () => { if (pendingFocus) focusWhenMapReady(pendingFocus); }, {passive:true});
  }

  installUi(); wire(); refresh().catch(() => {});
  window.CircleTourAdaptive = {build,refresh:() => refresh(currentPlan?.segment || []),focusStop:focusWhenMapReady,getPlan:() => currentPlan ? {...currentPlan, ids:currentPlan.ids.slice(), segment:currentPlan.segment.slice()} : null};
})();
