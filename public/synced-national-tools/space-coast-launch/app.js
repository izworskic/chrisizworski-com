'use strict';
(function () {
  const API = '/api/space-coast-launch';
  const $ = id => document.getElementById(id);
  const set = (id, text) => { const node = $(id); if (node) node.textContent = text == null ? '—' : String(text); };
  const element = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null) node.textContent = String(value);
    return node;
  };
  const link = (url, label, className) => {
    const a = element('a', className || 'launch-link', label);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  };
  const dateFormat = (iso, precision) => {
    if (!iso) return 'Unannounced';
    const d = new Date(iso);
    if (Number.isNaN(d.valueOf())) return 'Unannounced';
    if (precision === 'year') return new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' }).format(d);
    if (precision === 'month') return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
    const zone = ['day', 'date-tbd'].includes(precision) ? 'UTC' : 'America/New_York';
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: zone }).format(d);
  };
  const timeFormat = (iso, precision) => {
    if (!iso || !['second', 'minute', 'hour'].includes(precision)) return 'Launch time not announced';
    const d = new Date(iso);
    if (Number.isNaN(d.valueOf())) return 'Launch time unverified';
    const time = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: precision === 'hour' ? undefined : '2-digit',
      timeZone: 'America/New_York', timeZoneName: 'short'
    }).format(d);
    return precision === 'hour' ? 'Around ' + time + ' (hour-level estimate)' : time;
  };
  const addChip = (target, state, label) => {
    const chip = element('span', 'launch-chip', label);
    chip.dataset.state = state || 'unknown';
    target.appendChild(chip);
  };
  const renderList = launches => {
    const list = $('launches');
    if (!list) return;
    list.replaceChildren();
    if (!launches.length) {
      const row = element('div', 'row');
      row.appendChild(element('strong', '', 'No upcoming Florida launch in the current feed.'));
      list.appendChild(row);
      return;
    }
    launches.forEach(l => {
      const row = element('div', 'row');
      const main = element('div');
      main.appendChild(element('strong', '', l.name || 'Upcoming mission'));
      main.appendChild(element('div', 'small', l.location || 'Florida Space Coast'));
      const when = element('div');
      when.appendChild(element('span', 'kicker', 'When'));
      when.appendChild(element('div', '', dateFormat(l.net, l.netPrecision)));
      when.appendChild(element('div', 'small', timeFormat(l.net, l.netPrecision)));
      const status = element('div');
      status.appendChild(element('span', 'kicker', 'Status'));
      status.appendChild(element('div', '', l.scheduleConfidence?.label || l.status || 'Unverified'));
      const pad = element('div');
      pad.appendChild(element('span', 'kicker', 'Pad'));
      pad.appendChild(element('div', '', l.pad || 'Unannounced'));
      row.append(main, when, status, pad);
      list.appendChild(row);
    });
  };
  const renderWeather = places => {
    const target = $('launch-weather-places');
    if (!target) return;
    target.replaceChildren();
    places.forEach(place => {
      const card = element('article', 'launch-weather-place');
      card.appendChild(element('h3', '', place.name));
      addChip(card, place.assessment?.level || 'unknown', place.assessment?.label || 'Unverified');
      card.appendChild(element('p', '', place.assessment?.detail || 'Hourly forecast unavailable.'));
      const short = place.period?.shortForecast;
      if (short) card.appendChild(element('p', 'small', 'NWS: ' + short + '. Forecast is near the viewing area, not the rocket flight path.'));
      if (Number.isInteger(place.cloudCoverPercent) && place.cloudStatus === 'ok') {
        card.appendChild(element('div', 'launch-cloud-number', place.cloudCoverPercent + '%'));
        card.appendChild(element('p', 'small', 'Forecast sky covered by clouds near this area, from the NWS gridded forecast.'));
      } else {
        card.appendChild(element('p', 'small', 'No verified cloud-cover percentage for this mission and location.'));
      }
      if (place.forecastUpdatedAt) card.appendChild(element('p', 'small', 'NWS grid updated ' + new Date(place.forecastUpdatedAt).toLocaleString('en-US') + '.'));
      target.appendChild(card);
    });
  };
  const renderAccess = (data) => {
    const venues = $('launch-venues');
    const flags = $('launch-access-flags');
    const panel = $('launch-nps-alert');
    if (!venues || !flags || !panel) return;
    venues.replaceChildren();
    flags.replaceChildren();
    panel.replaceChildren();
    const views = Array.isArray(data.viewpoints) ? data.viewpoints : [];
    const count = state => views.filter(v => v.level === state).length;
    addChip(flags, 'candidate', count('candidate') + ' public candidate' + (count('candidate') === 1 ? '' : 's'));
    if (count('closed') > 0) addChip(flags, 'closed', count('closed') + ' closure' + (count('closed') === 1 ? '' : 's'));
    if (count('ineligible') > 0) addChip(flags, 'ineligible', count('ineligible') + ' pad restriction' + (count('ineligible') === 1 ? '' : 's'));
    addChip(flags, data.accessSource?.verified ? 'candidate' : 'unknown', data.accessSource?.verified ? 'NPS alerts checked' : 'NPS access unverified');
    const checked = data.accessSource?.checkedAt;
    set('launch-access-checked', checked ?
      'NPS alerts checked ' + new Date(checked).toLocaleString('en-US') +
      '. A park alert is not an official launch-specific security clearance.' :
      'Current access-source time unavailable.');
    const activeClosures = (data.parkAlerts || []).filter(a => /closure/i.test(a.category || ''));
    if (activeClosures.length) {
      panel.dataset.empty = 'false';
      panel.appendChild(element('h3', '', 'Active NPS closure'));
      activeClosures.forEach(a => {
        panel.appendChild(element('p', '', a.title));
        panel.appendChild(element('p', 'small', a.description));
      });
      panel.appendChild(link('https://www.nps.gov/cana/planyourvisit/conditions.htm', 'Confirm current NPS conditions', 'launch-link'));
    } else {
      panel.dataset.empty = 'true';
      panel.appendChild(element('h3', '', data.accessSource?.verified ? 'No closure alert detected in the checked feed' : 'NPS closure feed unavailable'));
      panel.appendChild(element('p', '', 'This is not confirmation that Playalinda is open for the next launch. Check launch-specific restrictions and gate instructions.'));
    }
    const order = { candidate: 0, verify: 1, unknown: 2, closed: 3, ineligible: 4 };
    views.slice().sort((a, b) => (order[a.level] ?? 5) - (order[b.level] ?? 5))
      .forEach(v => {
        const card = element('article', 'launch-venue');
        card.dataset.state = v.level || 'unknown';
        const top = element('div', 'launch-venue-top');
        top.appendChild(element('p', 'eyebrow', v.area));
        addChip(top, v.level, v.label);
        card.appendChild(top);
        card.appendChild(element('h3', '', v.name));
        card.appendChild(element('p', 'launch-reason', v.reason || 'Site access is not confirmed.'));
        card.appendChild(element('p', 'launch-note', v.summary));
        const actions = element('div', 'launch-venue-actions');
        if (v.source && v.source.startsWith('https://')) {
          actions.appendChild(link(v.source, 'Official access source', 'launch-link official'));
        }
        if (v.address) {
          actions.appendChild(link('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.address), 'Directions · verify entry', 'launch-link'));
        }
        card.appendChild(actions);
        venues.appendChild(card);
      });
  };
  const renderSelector = (data) => {
    const select = $('launch-selector');
    if (!select) return;
    select.replaceChildren();
    const options = data.upcoming || [];
    options.forEach(l => {
      const option = document.createElement('option');
      option.value = l.id;
      option.textContent = (l.name || 'Mission') + ' · ' +
        dateFormat(l.net, l.netPrecision) + ' · ' +
        (['minute', 'second'].includes(l.netPrecision) ? timeFormat(l.net, l.netPrecision) : l.scheduleConfidence?.label || 'Time TBD');
      select.appendChild(option);
    });
    if (!options.length) {
      const o = document.createElement('option');
      o.textContent = 'No Florida launches in current feed';
      o.value = '';
      select.appendChild(o);
      select.disabled = true;
    } else select.disabled = false;
    if (data.selectedLaunchId) select.value = data.selectedLaunchId;
    select.onchange = () => {
      if (select.value) load(select.value);
    };
  };
  const renderArrival = data => {
    const panel = $('launch-arrival');
    if (!panel) return;
    panel.replaceChildren();
    const g = data.arrivalGuidance || {};
    panel.dataset.state = g.level || 'unknown';
    panel.appendChild(element('h3', '', 'Playalinda: ' + (g.label || 'Confirm the park gate')));
    if (g.estimatedRoadRestrictionAt) {
      const when = new Date(g.estimatedRoadRestrictionAt);
      panel.appendChild(element('strong', 'launch-gate-time', 'Policy-based T–30 estimate: ' +
        when.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' })));
    }
    panel.appendChild(element('p', '', g.detail || 'Confirm the current park entrance policy.'));
    if (g.npsOperatingHours) {
      const h = g.npsOperatingHours;
      const fmt = minutes => {
        const hour = Math.floor(minutes / 60) % 24;
        const min = minutes % 60;
        return (hour % 12 || 12) + ':' + String(min).padStart(2, '0') + (hour >= 12 ? ' p.m.' : ' a.m.');
      };
      panel.appendChild(element('p', 'small', 'Active NPS notice: ' +
        fmt(h.openMinutes) + '–' + fmt(h.closeMinutes) +
        (h.lastEntryMinutes === null ? '' : '; last entry ' + fmt(h.lastEntryMinutes)) +
        '. Special launch restrictions can override these hours.'));
    }
    panel.appendChild(link(g.source || 'https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm', 'Read NPS launch-day entry rules', 'launch-link official'));
  };
  const renderSkyComparison = data => {
    const panel = $('launch-sky-compare');
    if (!panel) return;
    panel.replaceChildren();
    const v = data.skyComparison || {};
    panel.dataset.state = v.level || 'unknown';
    panel.appendChild(element('strong', '', v.label || 'No sky comparison yet'));
    panel.appendChild(element('p', '', v.detail ||
      'Select a precisely timed mission within the NWS forecast horizon to compare cloud forecasts.'));
    if (v.winner) panel.appendChild(element('p', 'small',
      'This is a relative cloud forecast, not a recommendation that a rocket will be visible from that location.'));
  };
  let loadSequence = 0;
  async function load(selectedId) {
    const sequence = ++loadSequence;
    try {
      const endpoint = selectedId ? API + '?launchId=' + encodeURIComponent(selectedId) : API;
      const r = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      const d = await r.json();
      if (sequence !== loadSequence) return;
      if (!r.ok || !d.ok) throw new Error(d.error || 'Launch data unavailable');
      renderSelector(d);
      set('loading', 'Latest checked ' + new Date(d.generatedAt).toLocaleString('en-US') + '. Times displayed in Eastern Time.');
      const next = d.next;
      const decision = d.nextDecision || {};
      $('schedule-card').dataset.level = decision.schedule?.level || 'unknown';
      set('schedule-label', decision.schedule?.label || 'Schedule unavailable');
      set('schedule-detail', decision.schedule?.detail || '');
      $('weather-card').dataset.level = decision.viewingWeather?.level || 'unknown';
      set('weather-label', decision.viewingWeather?.label || 'Weather unavailable');
      set('weather-detail', decision.viewingWeather?.detail || '');
      set('launch-time', next ? timeFormat(next.net, next.netPrecision) : 'Not announced');
      set('launch-date', next ? dateFormat(next.net, next.netPrecision) : 'Check the official schedule');
      set('mission-name', next?.name || 'No future Space Coast launch in current feed');
      set('mission-context', next ?
        [next.location, next.status ? 'Status: ' + next.status : null,
          'Time precision: ' + (next.netPrecision || 'unknown'),
          next.lastUpdated ? 'Schedule updated ' + new Date(next.lastUpdated).toLocaleDateString('en-US') : null]
          .filter(Boolean).join(' · ') :
        'Keep this page bookmarked; new missions are added when scheduling data becomes available.');
      set('rocket', next?.rocket || 'Not announced');
      set('pad', next?.pad || 'Not announced');
      set('provider', next?.provider || 'Not announced');
      renderList(d.upcoming || []);
      renderWeather(d.viewingWeatherByArea || []);
      renderAccess(d);
      renderArrival(d);
      renderSkyComparison(d);
    } catch (err) {
      set('loading', err.message);
      $('schedule-card').dataset.level = 'unknown';
      $('weather-card').dataset.level = 'unknown';
      set('schedule-label', 'Live schedule unavailable');
      set('schedule-detail', 'Use official NASA and launch operator sources for current timing.');
      set('weather-label', 'Visibility not assessed');
      set('weather-detail', 'This page is not displaying verified live forecast conditions.');
      set('launch-access-checked', 'Live access data could not be checked.');
      const arrival = $('launch-arrival');
      if (arrival) arrival.textContent = 'Launch-day Playalinda entrance policy could not be evaluated. Check the official NPS page before travel.';
      const comparison = $('launch-sky-compare');
      if (comparison) comparison.textContent = 'Current sky comparison unavailable. Do not assume a clear line of sight.';
      const panel = $('launch-nps-alert');
      if (panel) panel.textContent = 'NPS live closures unavailable. Do not assume Playalinda access.';
    }
  }
  load();
})();
