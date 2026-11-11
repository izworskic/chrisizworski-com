'use strict';
(function () {
  const API = '/api/space-coast-launch';
  const KSC_API = '/api/space-coast-ksc';
  const KSC_HISTORY_API = '/api/space-coast-ksc-watch';
  const LAUNCH_DAY_API = '/api/space-coast-launch-day';
  const PULSE_REFRESH_MS = 2 * 60 * 1000;
  const LAUNCH_DAY_SCHEDULE_REFRESH_MS = 5 * 60 * 1000;
  const KSC_REFRESH_MS = 5 * 60 * 1000;
  const SCHEDULE_REFRESH_MS = 45 * 60 * 1000;
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
      row.appendChild(element('strong', '', 'No Florida launches listed right now. Check the operator for late announcements.'));
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
      card.appendChild(element('p', '', place.assessment?.detail || 'No hourly sky forecast for this launch time yet.'));
      const short = place.period?.shortForecast;
      if (short) card.appendChild(element('p', 'small', 'NWS: ' + short + '. Forecast is near the viewing area, not the rocket flight path.'));
      if (Number.isInteger(place.cloudCoverPercent) && place.cloudStatus === 'ok') {
        card.appendChild(element('div', 'launch-cloud-number', place.cloudCoverPercent + '%'));
        card.appendChild(element('p', 'small', 'Nearby NWS forecasts show cloud cover here. The rocket may still climb into clearer sky farther along its path.'));
      } else {
        card.appendChild(element('p', 'small', 'We don’t have a reliable cloud forecast for this spot and launch time yet.'));
      }
      if (place.forecastUpdatedAt) card.appendChild(element('p', 'small', 'NWS grid updated ' + new Date(place.forecastUpdatedAt).toLocaleString('en-US') + '.'));
      target.appendChild(card);
    });
  };
  const renderIndependentReporting = desk => {
    const d=desk || {};
    const active=d.status==='ok';
    set('sfn-reporting-status',active ?
      'Independent feed checked ' + (d.checkedAt ?
        new Date(d.checkedAt).toLocaleString('en-US',{timeZone:'America/New_York',
          dateStyle:'medium',timeStyle:'short'}) : 'recently') +
      ' · reporting is not launch control' :
      'Spaceflight Now stories aren’t loading right now. You can still check the launch calendar');
    const list=$('sfn-reporting-list');
    if(!list)return;
    list.replaceChildren();
    const stories=Array.isArray(d.stories)?d.stories.slice(0,3):[];
    for(const story of active?stories:[]){
      if(!/^https:\/\/(?:www\.)?spaceflightnow\.com\/20\d\d\/(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])\/[a-z0-9-]+\/$/i.test(story?.url||''))
        continue;
      if(typeof story.title!=='string')continue;
      const card=element('article','sfn-reporting-item');
      const date=new Date(story.publishedAt||'');
      const when=Number.isFinite(+date)?date.toLocaleDateString('en-US',
        {month:'short',day:'numeric',year:'numeric'}):'Date unavailable';
      card.appendChild(element('p','sfn-reporting-date',
        (story.match==='mission-identifier'?'This mission is mentioned in reporting':
          'Related rocket or payload story, not an update on this exact flight') +
        ' · published ' + when));
      card.appendChild(link(story.url,story.title.slice(0,170)));
      card.appendChild(element('p','',
        story.match==='mission-identifier'?
          'Read the full story to see what the mission is about and why it matters.':
          'This article may cover the rocket family rather than today’s particular launch.'));
      list.appendChild(card);
    }
    if(!list.children.length){
      list.appendChild(element('p','sfn-reporting-empty',
        active?
          'No recent story tied to this exact flight is listed here. Look at Spaceflight Now for broader mission coverage.':
          'The news feed isn’t loading. That doesn’t mean your launch has been delayed or scrubbed.'));
    }
    set('sfn-reporting-note',d.note ||
      'Reporting adds context, but launch times, weather decisions and visitor access come from the operators and agencies.');
  };

  const renderOfficialWeather = forecast => {
    const d = forecast || {};
    const briefing = d.weatherStory || {};
    const display = $('fl-weather-story');
    if (display) display.dataset.stage = briefing.stage || 'unverified';
    set('fl-weather-story-title', briefing.headline || 'What does the weather mean for this mission?');
    set('fl-weather-story-lead', briefing.explanation || 'No mission-matched forecast has been verified.');
    set('fl-weather-story-changes', briefing.changes || 'No earlier official forecast available to compare yet.');
    set('fl-weather-story-decision', briefing.decision ||
      'Keep an eye on the operator’s updates. The countdown can still move.');
    set('fl-weather-story-next', briefing.nextUpdate || 'Next official forecast update has not been announced.');
    const rules = $('fl-weather-story-rules');
    if (rules) {
      rules.replaceChildren();
      const items = Array.isArray(briefing.rules)?briefing.rules.slice(0,4):[];
      if(items.length){
        rules.appendChild(element('h6','','Why this matters for liftoff'));
        for(const item of items){
          if(typeof item?.label!=='string'||typeof item?.explanation!=='string')continue;
          const details=element('details');
          details.appendChild(element('summary','',item.label));
          details.appendChild(element('p','',item.explanation));
          rules.appendChild(details);
        }
      }
    }
    const observed = briefing.observedAt && Number.isFinite(Date.parse(briefing.observedAt)) ?
      ' · source dated ' + new Date(briefing.observedAt).toLocaleString('en-US',
        {timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'}) : '';
    set('fl-weather-story-attribution',
      (briefing.sourceLabel || 'No current mission-specific weather evidence') + observed +
      '. This summary is website interpretation, not an official weather officer statement.');
    const valid = d.status === 'mission-matched-current';
    const hasPov = valid && Number.isInteger(d.povPercent);
    set('fl-official-status', d.status === 'mission-matched-current' ?
      d.label : d.agencyWeather?.status==='nasa-reported-current' ?
      'Original 45WS PDF not verified; a separate NASA-reported forecast is available below.' :
      d.label || 'Official mission forecast has not been verified');
    set('fl-official-pov', hasPov ? d.povPercent + '% PoV' : 'Not verified');
    set('fl-official-concerns', valid && d.primaryConcerns?.length ?
      'Official primary concerns: ' + d.primaryConcerns.join(', ') + '.' :
      valid ? 'The official document did not clearly identify the main weather concerns.' :
        'No official mission-specific weather concerns have been confirmed here yet.');
    const risks = d.additionalRisks || {};
    set('fl-official-risks', valid && Object.keys(risks).length ?
      'Other risks outside the quoted PoV may include: ' +
      [['upperWindShear','upper-level wind shear'],['boosterRecovery','booster recovery weather'],
       ['solarActivity','solar activity']]
        .filter(([key]) => risks[key]).map(([key,label]) => label + ' (' + risks[key] + ')').join('; ') +
      '. The launch operator makes the final decision.' :
      'Upper-level winds, booster recovery conditions and other mission-specific criteria may not be included in the official PoV.');
    const change = $('fl-official-change');
    change.replaceChildren();
    if (valid && d.latestChange) {
      change.appendChild(element('strong', '', d.latestChange.headline));
      change.appendChild(element('p', '', d.latestChange.detail));
      const observed = new Date(d.latestChange.detectedAt);
      if (!Number.isNaN(+observed)) {
        change.appendChild(element('small', '', 'Detected by this site ' +
          observed.toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'}) +
          '. Forecast issued ' + new Date(d.issuedAt).toLocaleString('en-US',
            {timeZone:'UTC',dateStyle:'medium',timeStyle:'short'}) + ' UTC.'));
      }
    } else change.appendChild(element('p','small',
      'No earlier official forecast update is available for this flight.'));
    const history = $('fl-official-history');
    history.replaceChildren();
    if (valid && (d.timeline || []).length > 1) {
      const details = element('details');
      const summary = element('summary','','Official forecast revision history');
      details.appendChild(summary);
      const list = element('ol');
      for (const e of d.timeline.slice(0,8)) {
        const row=element('li');
        row.appendChild(element('strong','',e.headline));
        row.appendChild(element('span','', ' · ' +
          (Number.isInteger(e.povPercent) ? e.povPercent + '% PoV' : 'Value not extracted')));
        const a=typeof e.sourceUrl==='string'&&
          /^https:\/\/45thweathersquadron\.nebula\.spaceforce\.mil\/assets\/LaunchForecasts\//.test(e.sourceUrl) ?
          link(e.sourceUrl,'Official PDF') : null;
        if (a) row.appendChild(a);
        list.appendChild(row);
      }
      details.appendChild(list);history.appendChild(details);
    }
    const links = $('fl-official-links');
    links.replaceChildren();
    if (valid && typeof d.officialUrl === 'string' &&
      /^https:\/\/45thweathersquadron\.nebula\.spaceforce\.mil\/assets\/LaunchForecasts\//.test(d.officialUrl)) {
      links.appendChild(link(d.officialUrl,'Read the exact official mission PDF'));
    }
    if(d.agencyWeather?.status==='nasa-reported-current' &&
      /^https:\/\/www\.nasa\.gov\/blogs\/[a-z0-9_-]+\/20\d\d\/\d\d\/\d\d\/[a-z0-9-]+\/$/.test(d.agencyWeather.sourceUrl||'')){
      links.appendChild(link(d.agencyWeather.sourceUrl,'Read NASA’s dated mission weather report'));
    }
    links.appendChild(link('https://www.patrick.spaceforce.mil/About-Us/Weather/',
      '45th Weather Squadron forecast portal'));
    const monitor = d.health || {};
    if (monitor.checkedAt) links.appendChild(element('span','small',
      'Official forecast search checked ' + new Date(monitor.checkedAt).toLocaleString('en-US') +
      ' · ' + (monitor.status || 'status unknown')));
    else links.appendChild(element('span','small',
      'We haven’t confirmed a current official mission forecast yet.'));
    const horizon = monitor.forecastWindow || {};
    if(horizon.candidates7Days===0 &&
      ['before-forecast-window','no-launches-in-21-days'].includes(horizon.status))
      links.appendChild(element('span','small',
        horizon.candidates21Days>0 ?
        'No Florida launch is close enough for the seven-day official forecast check yet; ' +
          horizon.candidates21Days + ' scheduled mission(s) are within the 21-day lookahead.' :
        'No Florida launch falls within the 21-day official forecast lookahead right now.'));
    const agencySources = monitor.nasaSourceChecks || [];
    if(agencySources.some(x=>x.status==='unavailable'))
      links.appendChild(element('span','small',
        'A NASA mission-blog source check was unavailable; NASA weather-report coverage may be incomplete.'));
    const direct = (monitor.sourceChecks || []).filter(x =>
      ['45ws-home','45ws-forecast-support','45ws-sitemap','45ws-parent-weather'].includes(x.id));
    const blocked = direct.filter(x => x.status === 'unavailable').length;
    const linked = direct.reduce((n,x) => n + (x.links || 0),0);
    if (blocked) links.appendChild(element('span','small',
      'Couldn’t reach ' + blocked + ' of ' + direct.length +
      '. Forecast coverage may be incomplete.'));
    else if (direct.length && linked === 0) links.appendChild(element('span','small',
      'No mission forecast PDF was found on the official pages checked. We’ll keep linking to the operator.'));
    if (valid) links.appendChild(element('span','small',
      d.discoveredVia === '45ws-public-page' ? 'PDF discovered on a first-party weather page.' :
      d.discoveredVia === 'll2-update-link' ? 'PDF link discovered through Launch Library; document verified against official PDF bytes.' :
      'Official PDF verified.'));
  };

  const renderRangeWeather = forecast => {
    const d = forecast || {};
    const good = d.status === 'forecast';
    set('fl-range-label', d.label || 'Weather near the launch pad isn’t available yet');
    set('fl-range-explain', d.detail || 'We don’t have a reliable forecast near this launch pad for the planned time.');
    const chip = $('fl-range-chip');
    chip.textContent = good ? 'NWS forecast checked' : 'Launch-pad forecast not confirmed';
    chip.dataset.state = good && d.level === 'elevated' ? 'poor' : 'unknown';
    const metrics = $('fl-range-metrics');
    metrics.replaceChildren();
    for (const [name, value, unit] of [
      ['Thunder chance', d.readings?.thunderPercent, '%'],
      ['Precipitation', d.readings?.precipitationPercent, '%'],
      ['Wind gust', d.readings?.gustMph, ' mph'],
      ['Cloud cover', d.readings?.cloudCoverPercent, '%']
    ]) {
      const card = element('div', 'fl-range-metric');
      card.appendChild(element('span', 'kicker', name));
      card.appendChild(element('strong', '', Number.isFinite(value) ? value + unit : 'Not provided'));
      metrics.appendChild(card);
    }
    const signals = $('fl-range-signals');
    signals.replaceChildren();
    if (d.signals?.length) {
      for (const x of d.signals) {
        const card = element('div', 'fl-range-signal');
        card.dataset.level = x.level;
        card.appendChild(element('strong', '', x.label + (x.value ? ' · ' + x.value : '')));
        card.appendChild(element('p', '', x.detail));
        signals.appendChild(card);
      }
    } else signals.appendChild(element('p', 'small', good ?
      'No standout concerns in the nearby surface forecast, but only the launch weather team can clear the rocket.' :
      'We don’t have enough launch-day weather information to make a useful comparison yet.'));
    const timeline = $('fl-range-timeline');
    timeline.replaceChildren();
    const rows = (d.timeline || []).filter(r => r.level !== 'unknown');
    if (rows.length) {
      const list = element('ol', 'fl-range-rail');
      for (const r of rows) {
        const item = element('li', 'fl-range-hour');
        item.dataset.level = r.level;
        const offset = r.hoursFromTarget === 0 ? 'Target' :
          r.hoursFromTarget < 0 ? 'T−' + Math.abs(r.hoursFromTarget) + 'h' : 'T+' + r.hoursFromTarget + 'h';
        item.appendChild(element('span', 'kicker', offset));
        const time = new Date(r.at);
        item.appendChild(element('strong', '', Number.isNaN(+time) ? 'Time unavailable' :
          time.toLocaleString('en-US', { timeZone: 'America/New_York',
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })));
        const v = r.readings || {};
        item.appendChild(element('small', '', [
          Number.isFinite(v.thunderPercent) ? v.thunderPercent + '% thunder' : null,
          Number.isFinite(v.precipitationPercent) ? v.precipitationPercent + '% precipitation' : null,
          Number.isFinite(v.gustMph) ? v.gustMph + ' mph gust' : null
        ].filter(Boolean).join(' · ') || v.shortForecast || 'Limited data'));
        list.appendChild(item);
      }
      timeline.appendChild(list);
    } else timeline.appendChild(element('p', 'small', 'Not enough hourly forecast information to show how the weather may change.'));
    set('fl-range-provenance', (d.site?.name || 'Florida Space Coast') +
      ' · regional NWS reference, not an individual pad. ' +
      (d.forecastUpdatedAt ? 'Grid updated ' + new Date(d.forecastUpdatedAt).toLocaleString('en-US') + '. ' :
        'Current source age unavailable. ') +
      'Only the mission and range weather teams decide whether the rocket can fly.');
    const sources = $('fl-range-sources');
    sources.replaceChildren();
    sources.appendChild(link('https://www.patrick.spaceforce.mil/About-Us/Weather/',
      '45th Weather Squadron forecasts'));
    if (typeof d.sourceUrl === 'string' &&
      /^https:\/\/api\.weather\.gov\/gridpoints\//.test(d.sourceUrl)) {
      sources.appendChild(link(d.sourceUrl, 'NWS source grid'));
    }
  };

  const renderKsc = (data) => {
    const target = $('ksc-mission-viewing');
    if (!target) return;
    target.replaceChildren();
    const ksc = data.kscViewing || {};
    const confirmed = ksc.state === 'matched' &&
      typeof ksc.sourceUrl === 'string' &&
      /^https:\/\/www\.kennedyspacecenter\.com\/event\/[a-z0-9-]+\/?$/.test(ksc.sourceUrl);
    target.dataset.state = confirmed ? 'matched' : 'unverified';
    const meta = element('div', 'ksc-evidence-status');
    addChip(meta, confirmed ? 'candidate' : 'unknown',
      confirmed ? 'Official mission listing matched' : 'Kennedy viewing not announced for this flight yet');
    if (ksc.checkedAt) {
      meta.appendChild(element('span', 'small',
        'Source checked ' + new Date(ksc.checkedAt).toLocaleString('en-US')));
    }
    meta.appendChild(element('span', 'small',
      'Official KSC announcement checks refresh separately while this page is open.'));
    target.appendChild(meta);
    if (!confirmed) {
      target.appendChild(element('h4', '', 'Check Kennedy’s launch event before buying tickets.'));
      target.appendChild(element('p', '',
        'We haven’t found a current Kennedy viewing event for this specific rocket. That doesn’t mean tickets are sold out or viewing will not happen. Kennedy usually posts viewing options after official confirmation, sometimes close to launch.'));
      target.appendChild(link('https://www.kennedyspacecenter.com/launches-and-events/events-calendar/',
        'Check Kennedy’s official events calendar', 'launch-link official'));
      return;
    }
    target.appendChild(element('h4', '', ksc.eventTitle || 'Official KSC launch event'));
    const officialClock = ksc.officialTiming || {};
    if (officialClock.state === 'different-time' || officialClock.state === 'different-day') {
      const warning = element('div', 'ksc-source-conflict');
      warning.setAttribute('role', 'status');
      warning.appendChild(element('strong', '', officialClock.label || 'Schedule sources disagree'));
      warning.appendChild(element('p', '', officialClock.detail || 'Verify the current launch time with the operator.'));
      if (officialClock.sourceDate) warning.appendChild(element('p', 'small',
        'KSC event listing: ' + officialClock.sourceDate + (officialClock.sourceTime ? ' · ' + officialClock.sourceTime : '')));
      target.appendChild(warning);
    }
    target.appendChild(element('p', 'ksc-event-explanation',
      'Kennedy lists these viewing areas for this mission. Each has its own ticket and entry rules. Availability may change, and so can the launch time.'));
    const list = element('div', 'ksc-venue-grid');
    for (const venue of ksc.venues || []) {
      const v = element('article', 'ksc-venue');
      v.dataset.state = venue.status || 'listed-on-source';
      v.appendChild(element('h5', '', venue.name || 'Viewing area'));
      const ticketNames = {
        'sold-out-on-page': 'Sold out on the published page',
        'additional-ticket-listed': 'Extra launch-viewing ticket listed',
        'package-listed': 'Launch package listed',
        'included-with-admission-listed': 'Listed with admission',
        'details-not-verified': 'Ticket details not confirmed'
      };
      const safetyExcluded = venue.status === 'safety-exclusion';
      addChip(v, safetyExcluded || venue.status === 'sold-out-on-source' ? 'closed' :
        venue.status === 'conditional' ? 'verify' : 'candidate',
      safetyExcluded ? 'Excluded for this launch pad' :
        ticketNames[venue.ticket] || 'Ticket details require confirmation');
      if (venue.openingAt) v.appendChild(element('p', 'ksc-venue-time', 'Listed opening: ' + venue.openingAt));
      if (venue.opensIfDelayedUntil) v.appendChild(element('p', 'ksc-venue-time',
        'Only opens if launch is delayed until ' + venue.opensIfDelayedUntil + ' or later'));
      if (venue.closesAt) v.appendChild(element('p', 'ksc-venue-time',
        'Published viewing cutoff: ' + venue.closesAt));
      if (venue.checkInAt) v.appendChild(element('p', 'ksc-venue-time', 'Check-in: ' + venue.checkInAt));
      if (venue.busBoardingAt) v.appendChild(element('p', 'ksc-venue-time', 'Bus boarding: ' + venue.busBoardingAt));
      if (venue.transport === 'ksc-controlled-bus') {
        v.appendChild(element('p', 'ksc-venue-transport', 'This viewing site is behind NASA’s gates. Use the assigned Kennedy bus; do not drive to the pad.'));
      } else if (venue.transport === 'ksc-bus-tour') {
        v.appendChild(element('p', 'ksc-venue-transport', 'Access via the Kennedy Space Center Bus Tour; confirm operating hours and first-come availability.'));
      }
      v.appendChild(element('p', 'ksc-venue-note', venue.note || 'Confirm current rules with Kennedy Space Center.'));
      list.appendChild(v);
    }
    target.appendChild(list);
    target.appendChild(link(ksc.sourceUrl, 'Read this mission’s official KSC viewing notice', 'launch-link official'));
    target.appendChild(element('p', 'small',
      'KSC can change opening hours, viewing areas, price and ticket inventory. Confirm the event page again before travelling.'));
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
      panel.appendChild(element('p', '', 'No matching alert doesn’t mean Playalinda is open for your launch. Check park conditions and the posted gate rules.'));
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
        card.appendChild(element('p', 'launch-reason', v.reason || 'Check this place’s launch-day hours and entry rules.'));
        card.appendChild(element('p', 'launch-note', v.summary));
        const actions = element('div', 'launch-venue-actions');
        if (v.source && v.source.startsWith('https://')) {
          actions.appendChild(link(v.source, 'Official access source', 'launch-link official'));
        }
        if (v.address && !['closed', 'ineligible'].includes(v.level)) {
          actions.appendChild(link('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.address), 'Google Maps · check access before driving', 'launch-link'));
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
      o.textContent = 'No upcoming Florida flights listed here';
      o.value = '';
      select.appendChild(o);
      select.disabled = true;
    } else select.disabled = false;
    if (data.selectedLaunchId) select.value = data.selectedLaunchId;
    select.onchange = () => {
      if (select.value) load(select.value);
    };
  };
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let staleDeepLink = false;

  // The facility selector changes the ACTUAL selected mission, not a parallel
  // decorative filter. All weather, map, ticket and source desks use the same
  // launchId and refresh together. Empty facilities never manufacture missions.
  const renderFacilityNetwork = data => {
    const network = data.facilityNetwork || {};
    const selected = network.selected || {};
    const groups = Array.isArray(network.facilities) ? network.facilities : [];
    const active = data.selectedLaunchId || null;
    for (const id of ['kennedy', 'cape']) {
      const facility = groups.find(x => x.id === id);
      const button = document.querySelector('[data-fl-facility="' + id + '"]');
      if (!button) continue;
      const idOfNext = facility?.nextLaunchId;
      const available = typeof idOfNext === 'string' && UUID_RE.test(idOfNext);
      button.disabled = !available;
      button.setAttribute('aria-pressed', selected.id === id ? 'true' : 'false');
      set('fl-' + id + '-count', facility ?
        (facility.countInFeed ? facility.countInFeed + ' upcoming in the bounded feed' :
          'No upcoming Florida flight listed here') : 'Schedule unavailable');
      button.onclick = available ? () => {
        if (idOfNext !== active) {
          staleDeepLink = false;
          void load(idOfNext);
        }
      } : null;
    }
    set('fl-origin-name', selected.name || 'Launch facility not confirmed for this flight');
    set('fl-origin-pad', selected.pad ?
      'Launch pad: ' + selected.pad + ' (restricted facility)' :
      'Launch pad not announced');
    set('fl-origin-context', selected.description ||
      'A launch schedule does not establish the correct Florida spaceport.');
    set('fl-origin-viewing', selected.viewing ||
      'A launch pad on the calendar does not open a beach, ticketed venue or range gate.');
    set('fl-origin-rule-title', selected.padRule?.headline || 'No pad-specific access verified');
    set('fl-origin-rule-copy', selected.padRule?.note ||
      'Check the mission operator and Kennedy Space Center for current access details.');
    const rule = $('fl-origin-rule');
    if (rule) rule.dataset.rule = selected.padRule?.code || 'unverified';
    const linkToNational = $('fl-national-mission-link');
    if (linkToNational) linkToNational.href =
      '/national-tools/rocket-launch-live/?region=florida' +
      (active && UUID_RE.test(active) ? '&launchId=' + encodeURIComponent(active) : '');
    set('fl-facility-hint', staleDeepLink ?
      'The flight you followed is no longer listed, so the next Florida flight is shown. Check the operator for news of your original mission.' :
      'Choose Kennedy or Cape Canaveral to see its listed flights. No launch on this calendar does not mean the range is inactive.');
    const confidence = data.scheduleCheckedAt ?
      new Date(data.scheduleCheckedAt).toLocaleString('en-US',
        {dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'}) + ' ET' :
      'time unavailable';
    set('fl-facility-evidence',
      'Shared launch-source observation: ' + confidence + '. ' +
      (network.unassignedCount ?
        network.unassignedCount + ' upcoming record(s) have an unverified Florida facility. ' : '') +
      'The facility tells you where the rocket starts, not whether you may enter. Check the operator and the venue.');
  };
  function syncMissionLink(launchId) {
    const url = new URL(location.href);
    if (launchId && UUID_RE.test(launchId)) url.searchParams.set('launchId', launchId);
    else url.searchParams.delete('launchId');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  // Florida's first visitor decision is one presentation of the exact same
  // pad/park/NPS/KSC/NWS snapshot driving the detailed map. Never treat a
  // location recommendation as a current admission or launch GO verdict.
  const renderFloridaDeck = data => {
    const deck = data?.floridaViewingDeck || null;
    const panel = $('florida-viewing-plan');
    if (!panel) return;
    const ready = !!(deck && deck.locationStatus === 'source-identified');
    panel.dataset.status = ready ? 'source-identified' : 'unverified';
    set('fl-deck-range', deck?.eyebrow ||
      'Launch and viewing updates unavailable');
    set('fl-deck-headline', deck?.headline ||
      'We can’t confirm viewing options until the launch and pad are checked with the operator.');
    set('fl-deck-story', deck?.story ||
      'Without a verified mission, a geographical candidate is not a launch-day recommendation.');
    const cards = Array.isArray(deck?.cards) ? deck.cards : [];
    const shortDistance = card => card?.geometry ?
      'Approximately ' + card.geometry.miles.toFixed(1) + ' miles straight to the listed pad · ' +
      card.geometry.bearingDegrees + '° ' + (card.geometry.bearingCardinal || '') +
      ' (not driving distance or flight trajectory)' :
      'Launch-pad distance and bearing not verified';
    const weatherText = card => Number.isInteger(card?.weather?.cloudCoverPercent) ?
      'NWS sky cover near this park: ' + card.weather.cloudCoverPercent +
      '% (not launch approval)' :
      'Mission-time park sky evidence unavailable';
    const setSource = (id, url, fallback) => {
      const anchor = $(id);
      if (!anchor) return;
      const verified = typeof url === 'string' && /^https:\/\//i.test(url);
      anchor.href = verified ? url : fallback;
    };
    const renderPublic = (kind, index) => {
      const entry = cards[index];
      const box = $('fl-deck-' + kind);
      if (box) box.dataset.state = entry?.accessLevel || 'unknown';
      set('fl-deck-' + kind + '-tag',
        entry ? (entry.accessLevel === 'candidate' ?
          'PUBLISHED PUBLIC CANDIDATE' : 'CHECK ENTRY BEFORE TRAVEL') :
          'NO VERIFIED OPTION');
      set('fl-deck-' + kind + '-name', entry?.name ||
        (kind === 'primary' ? 'No public viewing spot confirmed yet' :
          'Backup viewing spot not confirmed'));
      set('fl-deck-' + kind + '-reason', entry ?
        (entry.accessLabel + '. ' + entry.accessReason + ' ' + entry.parking) :
        (deck?.reason ||
         'A closed or unverified park is not a place to set up and watch a rocket.'));
      set('fl-deck-' + kind + '-pad', shortDistance(entry));
      set('fl-deck-' + kind + '-weather', weatherText(entry));
      const button = $('fl-deck-' + kind + '-map');
      if (button) {
        button.disabled = !entry?.mapId || entry.excluded;
        button.onclick = !button.disabled ? () =>
          document.dispatchEvent(new CustomEvent('space-coast:focus-point',
            { detail: { id: entry.mapId } })) : null;
      }
      setSource('fl-deck-' + kind + '-source',entry?.source,
        'https://www.visitspacecoast.com/landing-page/launch-venues/');
    };
    renderPublic('primary', 0);
    renderPublic('backup', 1);
    const ticket = deck?.ksc || null;
    set('fl-deck-ticket-tag',
      ticket?.officialEventMatched ? 'OFFICIAL EVENT LISTING MATCHED' :
      'MISSION TICKETS UNVERIFIED');
    set('fl-deck-ticket-reason',
      ticket?.admission ||
      'Check Kennedy’s event page for this flight’s tickets and entry rules.');
    set('fl-deck-ticket-rule', ticket?.ruleNote ||
      'The Gantry excludes LC-39A and LC-39B launches. Other venue permissions depend on the exact mission.');
    const ticketButton = $('fl-deck-ticket-map');
    if (ticketButton) {
      ticketButton.disabled = !ticket?.mapId || !data?.geographicViewing;
      ticketButton.onclick = !ticketButton.disabled ? () =>
        document.dispatchEvent(new CustomEvent('space-coast:focus-point',
          { detail: { id:ticket.mapId } })) : null;
    }
    const beach = deck?.playalinda || null;
    const beachWrap = document.querySelector('#florida-viewing-plan .fl-deck-conditions');
    if (beachWrap) beachWrap.dataset.closed = beach?.excluded ? 'true' : 'false';
    set('fl-deck-beach-head', beach?.excluded ?
      'Playalinda: an NPS restriction is reported for the mapped reference lot' :
      'Playalinda: check the park gate before driving');
    set('fl-deck-beach-copy', beach ?
      (beach.accessLabel + '. ' + beach.accessReason + ' ' + beach.policy) :
      'Playalinda’s current closures aren’t available here. Check NPS before heading to the beach.');
    const note = deck?.decisionNote ||
      'The map still shows the place, but we can’t confirm it is open for this launch.';
    const npsStamp = deck?.observation?.npsAlertCheckedAt ?
      ' NPS alert observation: ' + new Date(deck.observation.npsAlertCheckedAt)
        .toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'}) + ' ET.' :
      ' No verified NPS observation timestamp.';
    set('fl-deck-provenance',
      (data?.scheduleFreshness === 'stale' ?
        'The listed launch time may have changed. Check the operator before you leave. ' : '') +
      note + npsStamp);
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
      panel.appendChild(element('strong', 'launch-gate-time', 'Estimated park-road cutoff from published policy: ' +
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
      'Once your rocket has a precise time within the forecast window, you can compare clouds at the viewing areas.'));
    if (v.winner) panel.appendChild(element('p', 'small',
      'Less cloud overhead can help, but it doesn’t guarantee you will see the rocket through its entire climb.'));
  };
  const kscStoryTime = iso => {
    const date = new Date(iso || '');
    if (Number.isNaN(date.valueOf())) return 'Detection time unavailable';
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York', month: 'short', day: 'numeric',
      year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    });
  };
  const validKscEventUrl = url => typeof url === 'string' &&
    /^https:\/\/www\.kennedyspacecenter\.com\/event\/[a-z0-9-]+\/?$/.test(url);
  const renderKscChronicle = result => {
    const healthPanel = $('ksc-watch-health');
    const target = $('ksc-chronicle-entries');
    if (!target || !healthPanel) return;
    const health = result?.health || {};
    target.replaceChildren();
    const checked = health.lastCalendarCheckedAt;
    const online = health.status === 'checked' || health.status === 'partial';
    healthPanel.dataset.status = health.status || 'not-initialized';
    healthPanel.textContent = online ?
      'Latest official KSC calendar check: ' + kscStoryTime(checked) +
      (health.status === 'partial' ?
        '. Some mission pages could not be verified during that check.' :
        '. Scheduled checks target every 15 minutes, including overnight.') :
      health.status === 'overdue' ?
        'Kennedy’s last confirmed event check was ' +
          kscStoryTime(checked) + '. Verify directly with KSC before traveling.' :
        'We haven’t completed a successful check of Kennedy’s event calendar yet.';
    const timeline = result?.timeline || {};
    const events = Array.isArray(timeline.events) ? timeline.events.slice(0, 20) : [];
    if (!events.length) {
      const empty = element('div', 'ksc-chronicle-empty');
      empty.appendChild(element('strong', '', 'No change to Kennedy’s published viewing event recorded here yet.'));
      empty.appendChild(element('p', '', 'That is not evidence of no launch viewing. Official KSC instructions may not yet be published, or the monitor may still be establishing a history.'));
      empty.appendChild(link('https://www.kennedyspacecenter.com/launches-and-events/events-calendar/',
        'Read KSC’s official events calendar', 'launch-link'));
      target.appendChild(empty);
      return;
    }
    for (const event of events) {
      if (!validKscEventUrl(event.officialUrl)) continue;
      const item = element('article', 'ksc-chronicle-event');
      const date = element('time', '', 'First detected ' + kscStoryTime(event.detectedAt));
      date.dateTime = event.detectedAt;
      item.appendChild(date);
      item.appendChild(element('h4', '', event.headline || 'Official KSC page updated'));
      item.appendChild(element('p', '', event.detail || 'Inspect the official notice for current instructions.'));
      item.appendChild(link(event.officialUrl, 'See KSC’s source notice', 'launch-link official'));
      target.appendChild(item);
    }
    if (!timeline.verifiedPageIsRecent) healthPanel.textContent +=
      ' The stored mission-page evidence is older than 45 minutes; treat this as a historical timeline, not current ticket inventory.';
  };
  let chronicleController = null;
  async function loadKscChronicle(sequence, missionId) {
    if (chronicleController) chronicleController.abort();
    const controller = new AbortController();
    chronicleController = controller;
    try {
      const r = await fetch(KSC_HISTORY_API + '?launchId=' + encodeURIComponent(missionId), {
        headers: { Accept: 'application/json' }, signal: controller.signal
      });
      const data = await r.json();
      if (controller.signal.aborted || sequence !== loadSequence ||
          missionId !== activeMissionId) return;
      if (r.ok && data.ok && data.selectedLaunchId === missionId) renderKscChronicle(data);
      else if (data.health) renderKscChronicle({ health: data.health, timeline: { events: [] } });
    } catch {
      const node = $('ksc-watch-health');
      if (node && sequence === loadSequence && activeMissionId === missionId) {
        node.dataset.status = 'overdue';
        node.textContent = 'Kennedy’s viewing update history isn’t loading. Check its official event page for the latest details.';
      }
    } finally {
      if (chronicleController === controller) chronicleController = null;
    }
  }

  // Every on-screen status is a dated LL2 observation, never mission-control
  // telemetry. The status endpoint ONLY reads the shared monitoring state.
  let pulseData=null,pulseLastAttemptAt=0,pulseController=null;
  let scheduleSourceObservedAt=0,selectedTargetAt=null;
  function pulseEt(iso){
    const t=Date.parse(iso||'');
    if(!Number.isFinite(t))return 'unverified time';
    return new Date(t).toLocaleString('en-US',{
      timeZone:'America/New_York',month:'short',day:'numeric',
      hour:'numeric',minute:'2-digit',timeZoneName:'short'
    });
  }
  function renderPulseCountdown(){
    const mission=pulseData?.mission;
    const target=Date.parse(mission?.targetAt||'');
    if(!mission || !mission.exactTarget || mission.freshness!=='recent' ||
        !Number.isFinite(target)||target<=Date.now()){
      set('launch-pulse-countdown','Not verified');
      set('launch-pulse-time-note',mission?.level==='overdue'?
        'The published target has passed; no launch outcome has been verified.':
        'An exact upcoming launch time isn’t confirmed here yet.');
      return;
    }
    const m=Math.ceil((target-Date.now())/60000);
    const d=Math.floor(m/1440),h=Math.floor((m%1440)/60),mins=m%60;
    set('launch-pulse-countdown',(d?d+'d ':'')+(h?h+'h ':'')+mins+'m');
    set('launch-pulse-time-note','Target: '+pulseEt(mission.targetAt)+
      ' · Countdown to LL2 target, NOT an approved launch.');
  }
  function pulseChangeCopy(e){
    if(e.type==='target-time')return 'Target time changed from '+
      pulseEt(e.before)+' to '+pulseEt(e.after)+'.';
    if(e.type==='time-precision')return 'Time precision changed from '+
      (e.before||'unverified')+' to '+(e.after||'unverified')+'.';
    if(e.type==='provider-status')return 'LL2 status changed from '+
      (e.before||'unverified')+' to '+(e.after||'unverified')+'.';
    if(e.type==='launch-pad')return 'Listed launch pad changed from '+
      (e.before||'unverified')+' to '+(e.after||'unverified')+'.';
    if(e.type==='window-start'||e.type==='window-end')return 'Published launch window changed; check current operator timing.';
    if(e.type==='left-upcoming-list')return 'The flight disappeared from the public upcoming list. That does not tell us whether it was scrubbed or launched.';
    return 'A schedule field was revised. Recheck the operator.';
  }
  function renderPulse(body){
    const root=$('launch-day-pulse'),list=$('launch-pulse-changes-list');
    if(!root||!list)return;
    const mission=body?.mission;
    pulseData=body;
    list.replaceChildren();
    if(!body?.ok||!mission){
      root.dataset.level='unknown';
      set('launch-pulse-headline','Latest launch update unavailable');
      set('launch-pulse-advice','We haven’t checked this flight’s latest public time yet. Check the operator before making plans.');
      set('launch-pulse-checked',body?.monitorCheckedAt?
        'Shared monitor last checked '+pulseEt(body.monitorCheckedAt)+
        '; this mission was not verified.' :
        'No verified scheduled observation available.');
      list.appendChild(element('p','launch-pulse-empty',
        'We don’t have a trustworthy time-change history for this particular launch yet.'));
      renderPulseCountdown();
      return;
    }
    root.dataset.level=mission.level||'unknown';
    set('launch-pulse-headline',mission.label||'Check the schedule');
    const explanations={
      stale:'The last calendar check is old. The launch time or status may have changed.',
      scrub:'LL2 explicitly reports a scrub. Do not plan to view the previous attempt; confirm any new date with the operator.',
      hold:'LL2 explicitly reports a hold. The published target may no longer apply. Check the mission operator before leaving.',
      terminal:'LL2 shows a result, but this site does not independently verify launch outcome or flight telemetry.',
      unknown:'This flight is no longer listed as upcoming. Check the operator; we can’t tell whether it launched or was scrubbed.',
      overdue:'The planned time has passed. Check the operator; the countdown alone doesn’t prove liftoff.',
      uncertain:'Only a rough launch date is listed. Wait for a real launch window before planning when to arrive.',
      planning:'A target time is published, but technical holds, weather or range decisions can change it without warning.',
      check:'Confirm official launch and viewing information before traveling.'
    };
    set('launch-pulse-advice',explanations[mission.level]||explanations.check);
    set('launch-pulse-checked',
      'LL2 last observed '+pulseEt(mission.checkedAt)+
      ' · '+(mission.freshness==='recent'?
        'Public calendar checked recently' :
        'Scheduled check overdue')+
      ' · independent of KSC ticket and access information.');
    const events=Array.isArray(mission.events)?mission.events.slice(0,8):[];
    if(!events.length){
      list.appendChild(element('p','launch-pulse-empty',
        'No published time change recorded here yet. Rockets can still slip at the last minute.'));
    }else{
      for(const event of events){
        const card=element('article','launch-pulse-event');
        const heading=element('strong','',
          event.type==='target-time'?'Target revised':
          event.type==='provider-status'?'Status updated':
          event.type==='left-upcoming-list'?'Upcoming-list change':
          event.type==='launch-pad'?'Launch pad revised':
          'Schedule information updated');
        card.appendChild(heading);
        card.appendChild(element('time','',
          'First detected '+pulseEt(event.firstDetectedAt)));
        card.appendChild(element('p','',pulseChangeCopy(event)));
        list.appendChild(card);
      }
    }
    // A cached general schedule card can be older than the shared monitor.
    // When that is demonstrable, update its timing/status consistently.
    const checked=Date.parse(mission.checkedAt||'');
    if(mission.freshness==='recent'&&Number.isFinite(checked)&&
       checked>scheduleSourceObservedAt &&
       mission.presentInUpcoming===true){
      if(mission.targetAt&&
        ['second','minute','hour'].includes(mission.netPrecision)){
        set('launch-time',timeFormat(mission.targetAt,mission.netPrecision));
        set('launch-date',dateFormat(mission.targetAt,mission.netPrecision));
      }
      if(['hold','scrub','overdue'].includes(mission.level)){
        $('schedule-card').dataset.level='hold';
        set('schedule-label',mission.label);
        set('schedule-detail','More recent shared LL2 observation at '+
          pulseEt(mission.checkedAt)+'. Confirm this status with the operator.');
      }
    }
    renderPulseCountdown();
  }
  async function loadPulse(id,force=false){
    if(!id)return;
    if(!force&&Date.now()-pulseLastAttemptAt<PULSE_REFRESH_MS)return;
    pulseLastAttemptAt=Date.now();
    if(pulseController)pulseController.abort();
    const controller=new AbortController();
    pulseController=controller;
    try{
      const response=await fetch(LAUNCH_DAY_API+'?launchId='+encodeURIComponent(id),{
        headers:{Accept:'application/json'},signal:controller.signal
      });
      const data=await response.json();
      if(controller.signal.aborted||activeMissionId!==id)return;
      renderPulse(response.ok?data:{ok:false,monitorCheckedAt:null});
    }catch{
      if(!controller.signal.aborted&&activeMissionId===id)
        renderPulse({ok:false,monitorCheckedAt:null});
    }finally{
      if(pulseController===controller)pulseController=null;
    }
  }
  const pulseRefreshButton=$('launch-pulse-refresh');
  if(pulseRefreshButton)pulseRefreshButton.addEventListener('click',()=>{
    if(!activeMissionId)return;
    set('launch-pulse-checked','Checking the latest stored source observation…');
    void loadPulse(activeMissionId,true);
  });

  // Mission media is piggybacked on the existing LL2 snapshot. No browser
  // video search or upstream API poll, no auto-playing outside players.
  let mediaDesk=null,selectedMediaKey=null,mediaSources=[];
  const validVideoId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{11}$/.test(id);
  const safeMediaHref=href=>{
    try{
      const url=new URL(href);
      return url.protocol==='https:'&&[
        'www.youtube.com','www.youtube-nocookie.com',
        'spaceflightnow.com','www.spacex.com','www.blueorigin.com',
        'www.ulalaunch.com','www.nasa.gov','x.com'
      ].includes(url.hostname);
    }catch{return false}
  };
  const mediaDate=iso=>{
    const value=Date.parse(iso||'');
    if(!Number.isFinite(value))return 'unavailable';
    return new Date(value).toLocaleString('en-US',{
      timeZone:'America/New_York',month:'short',day:'numeric',
      hour:'numeric',minute:'2-digit',timeZoneName:'short'
    });
  };
  const mediaSummary=item=>{
    if(item.kind==='camera')return item.scope+
      '. This independent camera is not verified to be showing the selected mission. '+
      (item.caveat||'');
    const reportedLive=mediaDesk?.sourceFreshness==='recent'&&
      item.sourceReportedLive===true&&!item.sourceReportedEnded;
    if(item.sourceReportedEnded)return 'The LL2 listing records a past broadcast end time. This may be a replay, not live coverage.';
    if(reportedLive)return 'LL2 reports this video as live as of the last schedule observation; the stream itself was not checked.';
    return 'Listed for this exact mission in LL2. The stream may be scheduled, offline or a replay. Playback is not verified.';
  };
  function selectMedia(key){
    const screen=$('mission-media-stage-screen');
    const actions=$('mission-media-stage-actions');
    if(!screen||!actions)return;
    const item=mediaSources.find(x=>x.key===key);
    if(!item)return;
    selectedMediaKey=key;
    document.querySelectorAll('[data-media-key]').forEach(el=>{
      el.dataset.active=el.dataset.mediaKey===key?'true':'false';
      el.setAttribute('aria-pressed',String(el.dataset.mediaKey===key));
    });
    screen.replaceChildren();actions.replaceChildren();
    set('mission-media-stage-title',item.title);
    set('mission-media-stage-type',item.kind==='camera'?
      'Independent camera · coverage may rotate':
      item.classification==='ll2-official-listed'?
      'LL2-listed official webcast · not operator-verified':
      'Mission webcast or video · LL2 listing');
    set('mission-media-stage-copy',mediaSummary(item));
    if(validVideoId(item.youtubeId)){
      const poster=element('div','mission-media-poster');
      const img=document.createElement('img');
      img.src='https://i.ytimg.com/vi/'+item.youtubeId+'/hqdefault.jpg';
      img.alt='YouTube provider preview image, not a verified current camera frame';
      img.loading='lazy';img.decoding='async';poster.appendChild(img);
      const overlay=element('span','mission-media-poster-label','Video preview · not a live still');
      poster.appendChild(overlay);screen.appendChild(poster);
      const play=element('button','mission-media-play','Play from YouTube');
      play.type='button';
      play.addEventListener('click',()=>{
        screen.replaceChildren();
        const iframe=document.createElement('iframe');
        iframe.className='mission-media-player';
        iframe.title=item.title+' | video hosted by '+item.publisher;
        iframe.src='https://www.youtube-nocookie.com/embed/'+item.youtubeId+'?autoplay=1&rel=0';
        iframe.loading='eager';iframe.allow='autoplay; encrypted-media; picture-in-picture';
        iframe.allowFullscreen=true;
        iframe.referrerPolicy='strict-origin-when-cross-origin';
        screen.appendChild(iframe);
      });
      actions.appendChild(play);
    }else{
      screen.appendChild(element('p','mission-media-no-embed',
        'This provider does not offer a verified embeddable player through our source records. Open the broadcast at its source.'));
    }
    const href=item.kind==='camera'?item.siteUrl:item.url;
    if(safeMediaHref(href))actions.appendChild(link(
      href,item.kind==='camera'?'Open camera at provider':'Open video at publisher',
      'mission-media-outbound'));
  }
  function mediaSourceButton(item){
    const el=element('button','mission-media-source-button');
    el.type='button';el.dataset.mediaKey=item.key;
    el.setAttribute('aria-pressed','false');
    const heading=element('span','mission-media-source-name',item.title);
    const by=element('span','mission-media-source-by',
      item.publisher+' · '+(item.kind==='camera'?'General Space Coast feed':
        item.classification==='ll2-official-listed'?'LL2-listed official webcast':'LL2 mission video'));
    const flag=element('span','mission-media-source-flag',
      item.kind==='camera'?'Live playback not checked':
      item.sourceReportedEnded?'Listed recording / ended':
      item.sourceReportedLive===true&&mediaDesk?.sourceFreshness==='recent'?
        'LL2 reports live · not verified':'Broadcast status unverified');
    el.append(heading,by,flag);
    el.addEventListener('click',()=>selectMedia(item.key));
    return el;
  }
  function renderMissionMedia(data){
    const root=$('mission-media');
    const missions=$('mission-media-mission-list');
    const cameras=$('mission-media-camera-list');
    if(!root||!missions||!cameras)return;
    missions.replaceChildren();cameras.replaceChildren();
    mediaDesk=data&&data.launchId===activeMissionId?data:null;
    mediaSources=[];selectedMediaKey=null;
    if(!mediaDesk){
      set('mission-media-checked','Mission media could not be matched to this selected launch.');
      missions.appendChild(element('p','mission-media-empty',
        'No mission-specific webcast was verified. Do not substitute an unrelated launch video.'));
      cameras.appendChild(element('p','mission-media-empty',
        'General camera directory is currently unavailable.'));
      set('mission-media-operator',
        'Check the selected mission operator and NASA Live for current coverage.');
      $('mission-media-stage-screen').replaceChildren(element('p','mission-media-no-embed',
        'No verified media source for this mission.'));
      $('mission-media-stage-actions').replaceChildren();
      return;
    }
    set('mission-media-checked','LL2 mission media checked '+mediaDate(mediaDesk.checkedAt)+
      ' · '+(mediaDesk.sourceFreshness==='recent'?'Recent source check':'Outdated source check'));
    const videoList=Array.isArray(mediaDesk.videos)?mediaDesk.videos:[];
    for(const video of videoList.slice(0,5)){
      if(!safeMediaHref(video.url))continue;
      const item={...video,kind:'mission',key:'mission:'+video.url};
      mediaSources.push(item);
      missions.appendChild(mediaSourceButton(item));
    }
    if(!mediaSources.length)missions.appendChild(element('p','mission-media-empty',
      'No safe, mission-specific webcast link is listed for this launch yet. This is not proof the operator will not broadcast.'));
    for(const camera of (mediaDesk.cameras||[]).slice(0,3)){
      if(!safeMediaHref(camera.siteUrl))continue;
      const item={...camera,kind:'camera',key:'camera:'+camera.id};
      mediaSources.push(item);cameras.appendChild(mediaSourceButton(item));
    }
    if(!cameras.children.length)cameras.appendChild(element('p','mission-media-empty',
      'No verified camera-provider directory is currently available.'));
    const operator=$('mission-media-operator');if(operator){
      operator.replaceChildren();
      operator.appendChild(document.createTextNode(
        'Launch operator: '+(mediaDesk.operator?.label||'not matched to an official operator directory')+'. '));
      if(mediaDesk.operator?.url&&safeMediaHref(mediaDesk.operator.url))
        operator.appendChild(link(mediaDesk.operator.url,'Check operator announcements','mission-media-outbound'));
      else operator.appendChild(link(
        'https://www.nasa.gov/live/','Check NASA live coverage','mission-media-outbound'));
    }
    const previous=mediaSources.find(x=>x.key===selectedMediaKey);
    const first=previous||mediaSources.find(x=>x.kind==='mission'&&!x.sourceReportedEnded)||
      mediaSources.find(x=>x.kind==='camera')||mediaSources[0];
    if(first)selectMedia(first.key);
  }

  let loadSequence = 0;
  let activeMissionId = null;
  let lastKscAttemptAt = 0;
  let lastScheduleLoadedAt = 0;
  let kscController = null;

  // Read KSC on its own cached endpoint, never re-fetching Launch Library
  // just to see whether the operator published a new viewing notice.
  async function refreshKsc(sequence, launchId) {
    if (kscController) kscController.abort();
    const controller = new AbortController();
    kscController = controller;
    try {
      const response = await fetch(KSC_API + '?launchId=' + encodeURIComponent(launchId), {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      const result = await response.json();
      if (sequence !== loadSequence || activeMissionId !== launchId || controller.signal.aborted) return;
      if (!response.ok || !result.ok || result.selectedLaunchId !== launchId || !result.kscViewing) return;
      renderKsc({ kscViewing: result.kscViewing });
      void loadKscChronicle(sequence, launchId);
    } catch {
      // Preserve the previously displayed, dated evidence if only the
      // independent announcement refresh fails.
    } finally {
      if (kscController === controller) kscController = null;
    }
  }
  function checkForKscUpdate() {
    if (document.hidden || !activeMissionId ||
        Date.now() - lastKscAttemptAt < KSC_REFRESH_MS) return;
    lastKscAttemptAt = Date.now();
    void refreshKsc(loadSequence, activeMissionId);
  }
  function checkForPageUpdates() {
    if (document.hidden || !activeMissionId) return;
    // An open tab must occasionally refresh its ordinary schedule too; the
    // official KSC checker itself never calls the schedule provider.
    const withinDay=Number.isFinite(selectedTargetAt)&&
      Math.abs(selectedTargetAt-Date.now())<=24*3600000;
    const cadence=withinDay?LAUNCH_DAY_SCHEDULE_REFRESH_MS:SCHEDULE_REFRESH_MS;
    if (Date.now()-lastScheduleLoadedAt>=cadence)
      void load(activeMissionId);
    else checkForKscUpdate();
    void loadPulse(activeMissionId);
    renderPulseCountdown();
  }

  async function load(selectedId) {
    const sequence = ++loadSequence;
    const previousMissionId = activeMissionId;
    if (kscController) kscController.abort();
    if (chronicleController) chronicleController.abort();
    activeMissionId = null;
    try {
      const endpoint = selectedId ? API + '?launchId=' + encodeURIComponent(selectedId) : API;
      const r = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      const d = await r.json();
      if (sequence !== loadSequence) return;
      if (!r.ok || !d.ok) throw new Error(d.error || 'Launch data unavailable');
      renderSelector(d);
      renderFacilityNetwork(d);
      set('loading',
        (d.scheduleCheckedAt?
          'Launch schedule observed '+new Date(d.scheduleCheckedAt).toLocaleString('en-US') :
          'Launch schedule observation unavailable')+
        ' · Eastern time. '+(d.scheduleWarning||''));
      const next = d.next;
      const decision = d.nextDecision || {};
      $('schedule-card').dataset.level = d.scheduleFreshness==='stale'?'unknown':
        decision.schedule?.level || 'unknown';
      set('schedule-label', d.scheduleFreshness==='stale'?
        'Published schedule check overdue — confirm with operator':
        decision.schedule?.label || 'Schedule unavailable');
      set('schedule-detail',(d.scheduleWarning?d.scheduleWarning+' ':'')+
        (decision.schedule?.detail||''));
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
      renderRangeWeather(d.launchWeatherIntelligence);
      renderOfficialWeather(d.officialLaunchWeather);
      renderIndependentReporting(d.independentReporting);
      renderAccess(d);
      renderFloridaDeck(d);
      renderKsc(d);
      renderArrival(d);
      renderSkyComparison(d);
      lastScheduleLoadedAt = Date.now();
      scheduleSourceObservedAt=Date.parse(d.scheduleCheckedAt||d.generatedAt)||0;
      selectedTargetAt=next&&['minute','second'].includes(next.netPrecision)?
        Date.parse(next.net):null;
      activeMissionId = d.selectedLaunchId || null;
      syncMissionLink(activeMissionId);
      document.dispatchEvent(new CustomEvent('rocket-truth:mission-selected',{
        detail:{launchId:activeMissionId,
          net:next?.net||null,netPrecision:next?.netPrecision||null,
          timezone:'America/New_York'}
      }));
      renderMissionMedia(d.mediaDesk || null);
      // Same trusted, cached launch response powers the GIS layer; its listener
      // cannot fetch another LL2 schedule or infer mission-specific closures.
      document.dispatchEvent(new CustomEvent('space-coast:launch-loaded', {
        detail: { selectedLaunchId: activeMissionId,
          geographicViewing: d.geographicViewing || null,
          launches: [...(d.upcoming||[]),...(next&&!(d.upcoming||[]).some(m=>m.id===next.id)?[next]:[])] }
      }));
      if (activeMissionId) {
        void loadKscChronicle(sequence, activeMissionId);
        void loadPulse(activeMissionId,true);
      }else renderPulse({ok:false,monitorCheckedAt:null});
      lastKscAttemptAt = 0;
      checkForKscUpdate();
    } catch (err) {
      if (sequence !== loadSequence) return;
      if (selectedId && !previousMissionId &&
          /no longer in the current Florida launch list/i.test(err.message)) {
        staleDeepLink = true;
        void load();
        return;
      }
      activeMissionId = previousMissionId;
      set('fl-facility-hint', 'Launch details could not be checked. Facility switches are unavailable until the shared source recovers.');
      document.dispatchEvent(new CustomEvent('rocket-truth:mission-selected',
        {detail:{launchId:null}}));
      // Retry failed standard schedule after five minutes, without turning
      // the independent monitor into per-visitor LL2 polling.
      lastScheduleLoadedAt=Date.now()-SCHEDULE_REFRESH_MS+KSC_REFRESH_MS;
      if(activeMissionId)void loadPulse(activeMissionId,true);
      set('loading', err.message);
      $('schedule-card').dataset.level = 'unknown';
      $('weather-card').dataset.level = 'unknown';
      set('schedule-label', 'Live schedule unavailable');
      set('schedule-detail', 'Use official NASA and launch operator sources for current timing.');
      renderMissionMedia(null);
      set('weather-label', 'Visibility not assessed');
      set('weather-detail', 'This page is not displaying verified live forecast conditions.');
      renderRangeWeather(null);
      renderOfficialWeather(null);
      renderIndependentReporting(null);
      renderFloridaDeck(null);
      set('launch-access-checked', 'Live access data could not be checked.');
      const arrival = $('launch-arrival');
      if (arrival) arrival.textContent = 'Launch-day Playalinda entrance policy could not be evaluated. Check the official NPS page before travel.';
      const comparison = $('launch-sky-compare');
      if (comparison) comparison.textContent = 'Current sky comparison unavailable. Do not assume a clear line of sight.';
      const panel = $('launch-nps-alert');
      if (panel) panel.textContent = 'NPS live closures unavailable. Do not assume Playalinda access.';
      const kscPanel = $('ksc-mission-viewing');
      if (kscPanel) kscPanel.textContent = 'KSC mission viewing could not be verified. Check the official KSC calendar before purchasing admission.';
    }
  }
  document.addEventListener('visibilitychange', checkForPageUpdates);
  window.setInterval(checkForPageUpdates, 60 * 1000);
  document.addEventListener('space-coast:mission-marker-selected',event=>{
    const id=event.detail?.launchId;
    if(typeof id==='string'&&UUID_RE.test(id))void load(id);
  });
  const incoming = new URL(location.href).searchParams.get('launchId');
  load(incoming && UUID_RE.test(incoming) ? incoming : null);
})();
