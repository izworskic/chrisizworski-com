(function () {
  'use strict';

  var MATRIX = null;
  var WEEK_IDS = ['2026-02-15', '2026-02-22', '2026-03-01', '2026-03-08', '2026-03-15', '2026-03-22', '2026-03-29', '2026-04-05'];
  var state = {
    zone: 'mid-michigan',
    weekIdx: 4, // Mar 15 peak split
    tod: 'am'
  };

  var ZONES = {
    'southern-lower': {
      title: 'Southern Lower Michigan (41.7°N – 42.8°N · Jackson, Waterloo, Kalamazoo)',
      phase: 'Mud, Bare Ridges & Early Sap',
      shedSite: 'jackson',
      sapSite: 'lansing',
      gear: 'Waterproof mud boots + gaiters; keep microspikes in the trunk for shaded north ravines.',
      shedWindow: 'South-facing oak slopes and ag field edges clear 2–3 weeks before northern counties.',
      sapWindow: 'Early freeze-thaw runs often peak late February through mid-March before buds swell.',
      etiquette: 'Stay off thawing dirt MTB singletrack (Fort Custer, Potawatomi) when ruts exceed 0.5 inch.'
    },
    'mid-michigan': {
      title: 'Mid-Michigan & Saginaw Basin (42.8°N – 44.0°N · Bay City, Midland, Shepherd)',
      phase: 'Freeze-Thaw Sugarbush & River Breakup',
      shedSite: 'bay-city',
      sapSite: 'bay-city',
      gear: 'Mud boots for river-bottom flats + slip-on traction cleats for morning refreeze.',
      shedWindow: 'Hedgerows and south-facing sandy ridges open in waves between March thaws.',
      sapWindow: 'Classic Saginaw Valley & Shepherd sugarbush window: nights < 28°F, days > 40°F.',
      etiquette: 'Watch Saginaw Bay & river-mouth ice edges for bald eagles and staging waterfowl from plowed pull-offs.'
    },
    'northern-lower': {
      title: 'Northern Lower Snowbelt (44.0°N – 45.7°N · Grayling, Traverse City, Gaylord)',
      phase: 'Morning Crust & Afternoon Slush',
      shedSite: 'traverse-city',
      sapSite: 'traverse-city',
      gear: 'Microspikes before 10:30 AM on packed trails; snowshoes required off-trail after noon.',
      shedWindow: 'Deep snowpack lingers in cedar swamps; wait for south-slope retreat before serious shed walks.',
      sapWindow: 'Later maple sap surge (mid-March through early April) in upland hardwood ridges.',
      etiquette: 'Avoid bumping deer in winter yarding complexes during late-March snowpack stress.'
    },
    'upper-peninsula': {
      title: 'Upper Peninsula & Lake Superior (45.8°N – 47.4°N · Munising, Marquette, Keweenaw)',
      phase: 'Deep-Snow Holdout & Late Ice Caves',
      shedSite: 'marquette',
      sapSite: 'marquette',
      gear: 'Full snowshoes + traction cleats; high-clearance vehicle for unplowed seasonal roads.',
      shedWindow: 'Snowpack frequently holds 18–30+ inches into April; shed hunting lags southern MI by 4–6 weeks.',
      sapWindow: 'U.P. sugarbushes run late March into mid-April as Lake Superior moderates daytime highs.',
      etiquette: 'Verify late-season ice-cave stability—warm sun undermines overhangs even when air temps stay below 32°F.'
    }
  };

  var titleEl = document.getElementById('fs-zone-title');
  var phaseEl = document.getElementById('fs-zone-phase');
  var gearEl = document.getElementById('fs-zone-gear');
  var shedEl = document.getElementById('fs-zone-shed');
  var sapEl = document.getElementById('fs-zone-sap');
  var etiqEl = document.getElementById('fs-zone-etiquette');
  var liveEl = document.getElementById('fs-live-status');
  var weekSlider = document.getElementById('fs-week-slider');
  var weekLabelEl = document.getElementById('fs-week-label');
  var zoneBtns = document.querySelectorAll('[data-fs-zone]');
  var todBtns = document.querySelectorAll('[data-fs-tod]');

  function renderSplitBars(weekId) {
    if (!MATRIX || !MATRIX.zones) return;
    Object.keys(MATRIX.zones).forEach(function (zId) {
      var entry = MATRIX.zones[zId].byWeek[weekId];
      var fill = document.getElementById('fs-bar-' + zId);
      var label = document.getElementById('fs-bar-label-' + zId);
      if (fill && entry) {
        fill.style.width = entry.score + '%';
        fill.className = 'fs-bar-fill fs-bar-fill--' + entry.code;
      }
      if (label && entry) {
        label.textContent = entry.label + ' (' + entry.solarNoonDeg + '° sun)';
      }
    });
  }

  function renderView() {
    var z = ZONES[state.zone] || ZONES['mid-michigan'];
    var weekId = WEEK_IDS[state.weekIdx] || WEEK_IDS[4];
    var mEntry = MATRIX && MATRIX.zones && MATRIX.zones[state.zone] ? MATRIX.zones[state.zone].byWeek[weekId] : null;

    if (weekLabelEl && mEntry) {
      weekLabelEl.textContent = mEntry.weekLabel + ' · Solar Noon ' + mEntry.solarNoonDeg + '°';
    }
    if (titleEl) titleEl.textContent = z.title;
    if (phaseEl) phaseEl.textContent = mEntry ? mEntry.label : z.phase;
    if (gearEl) {
      gearEl.textContent = mEntry
        ? (state.tod === 'am' ? '8:00 AM Crust Kit: ' + mEntry.amGear : '2:00 PM Thaw Kit: ' + mEntry.pmGear)
        : z.gear;
    }
    if (shedEl) shedEl.textContent = mEntry ? mEntry.shedStatus : z.shedWindow;
    if (sapEl) sapEl.textContent = mEntry ? mEntry.sapStatus : z.sapWindow;
    if (etiqEl) etiqEl.textContent = z.etiquette;

    renderSplitBars(weekId);

    zoneBtns.forEach(function (btn) {
      var active = btn.getAttribute('data-fs-zone') === state.zone;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    todBtns.forEach(function (btn) {
      var active = btn.getAttribute('data-fs-tod') === state.tod;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function fetchLiveSignals() {
    var z = ZONES[state.zone] || ZONES['mid-michigan'];
    if (!liveEl) return;
    liveEl.textContent = 'Checking live NWS/NOAA sap, snow-retreat, and winter-hike access signals…';
    Promise.allSettled([
      fetch('/api/maple-sap?mode=site&site=' + encodeURIComponent(z.sapSite)).then(function (r) { return r.ok ? r.json() : null; }),
      fetch('/api/shed-antlers?mode=forecast&site=' + encodeURIComponent(z.shedSite)).then(function (r) { return r.ok ? r.json() : null; }),
      fetch('/api/winter-hike-lab?mode=catalog').then(function (r) { return r.ok ? r.json() : null; })
    ]).then(function (results) {
      var sapData = results[0].status === 'fulfilled' ? results[0].value : null;
      var shedData = results[1].status === 'fulfilled' ? results[1].value : null;
      var hikeData = results[2].status === 'fulfilled' ? results[2].value : null;
      var parts = [];
      if (sapData && sapData.phase) {
        parts.push('Maple Sap API: ' + (sapData.phase === 'OFF_SEASON' ? 'Off-season (monitors Feb–Apr)' : (sapData.summary && sapData.summary.bestLevel ? sapData.summary.bestLevel : sapData.phase)));
      }
      if (shedData && shedData.snowDepth && shedData.snowDepth.status) {
        parts.push('NOAA Snow Cover: ' + shedData.snowDepth.status);
      }
      if (hikeData && Array.isArray(hikeData.routes)) {
        parts.push('Winter Hike Lab: ' + hikeData.routes.length + ' inventoried routes');
      }
      liveEl.textContent = parts.length
        ? 'Live 3-engine check — ' + parts.join(' · ') + '. Always verify local ground & trailhead conditions.'
        : 'Live regional check unavailable in offline/static mode — open the dedicated Maple Sap, Shed Antler, or Winter Hike Lab tools below for current NWS/NOAA telemetry.';
    });
  }

  zoneBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.zone = btn.getAttribute('data-fs-zone');
      renderView();
      fetchLiveSignals();
    });
  });

  todBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.tod = btn.getAttribute('data-fs-tod');
      renderView();
    });
  });

  if (weekSlider) {
    weekSlider.addEventListener('input', function () {
      state.weekIdx = Number(weekSlider.value) || 0;
      renderView();
    });
  }

  // Chapter category filtering
  var filterBtns = document.querySelectorAll('[data-fs-filter]');
  var stories = document.querySelectorAll('#fs-chapters article.wf-story');
  var countEl = document.getElementById('fs-visible-count');

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.getAttribute('data-fs-filter');
      filterBtns.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      var shown = 0;
      stories.forEach(function (story) {
        var match = cat === 'all' || story.getAttribute('data-fs-cat') === cat;
        story.style.display = match ? '' : 'none';
        if (match) shown++;
      });
      if (countEl) {
        countEl.textContent = 'Showing ' + shown + ' of ' + stories.length + ' false-spring chapters';
      }
    });
  });

  fetch('/assets/false-spring-transition-matrix.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (data) MATRIX = data;
      renderView();
    })
    .catch(function () { renderView(); });

  renderView();
  fetchLiveSignals();
})();
