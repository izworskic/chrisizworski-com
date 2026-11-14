(() => {
  'use strict';

  const RELEASE = '2026-11-14';

  function addStyles() {
    if (document.getElementById('circle-tour-current-style')) return;
    const style = document.createElement('style');
    style.id = 'circle-tour-current-style';
    style.textContent = `.ct-current-alert{margin:12px 0;padding:11px 13px;border-left:3px solid #c85c00;background:#fff7e8;font-size:13px;line-height:1.55}.ct-current-alert strong{display:block;margin-bottom:2px;color:#7c4100}.ct-current-alert a{font-weight:700}.authority-block[data-retired="true"]{display:none!important}`;
    document.head.appendChild(style);
  }

  async function loadLiveLevel() {
    const el = document.getElementById('liveData');
    if (!el) return;
    try {
      const url = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=9099064&product=water_level&datum=LWD&time_zone=lst&units=english&format=json';
      const response = await fetch(url);
      if (!response.ok) throw new Error(`NOAA water level returned ${response.status}`);
      const data = await response.json();
      const reading = data?.data?.[0];
      const value = Number(reading?.v);
      if (!Number.isFinite(value)) throw new Error('NOAA water level unavailable');
      const date = String(reading?.t || '').split(' ')[0];
      el.textContent = `${value.toFixed(2)} ft above LWD at Duluth${date ? ` · ${date}` : ''}`;
    } catch {
      el.innerHTML = '<a href="https://greatlakeslevels.org" target="_blank" rel="noopener" style="color:#7bc8e8">Check current level →</a>';
    }
  }

  function updateStructuredData() {
    const node = document.querySelector('script[type="application/ld+json"]');
    if (!node) return;
    try {
      const data = JSON.parse(node.textContent);
      const graph = Array.isArray(data['@graph']) ? data['@graph'] : [];
      const article = graph.find((item) => item['@type'] === 'Article');
      if (article) article.dateModified = RELEASE;
      node.textContent = JSON.stringify(data);
    } catch {}
  }

  function removeSelfJustifyingCopy() {
    const block = document.querySelector('.authority-block');
    if (block) {
      block.dataset.retired = 'true';
      block.remove();
    }
    const whitefish = document.querySelector('#stop-31 .stop-desc');
    if (whitefish) {
      whitefish.textContent = 'Whitefish Point sits at the eastern gateway to Lake Superior, where freighters heading to and from the Soo Locks pass close to shore. The SS Edmund Fitzgerald lies 17 miles NNW in Canadian waters. The 1849 light station, Great Lakes Shipwreck Museum, Whitefish Point Bird Observatory, and open shoreline make this a major eastern-Lake Superior stop.';
    }
  }

  // These are dated source notices, not a perpetual current-season feed.
  // Future seasons must not inherit a 2026 closure or operating calendar.
  function sourceSeasonIsCurrent(year = 2026) {
    return new Date().getFullYear() === year;
  }

  function patchAgawaTrain() {
    document.querySelectorAll('a[href*="agawacanyontrain.com"]').forEach((a) => {
      a.href = 'https://agawatrain.com/';
    });
    const note = document.querySelector('#stop-14 .season-note');
    const current = sourceSeasonIsCurrent();
    const label = current
      ? 'The published 2026 Agawa Canyon Tour Train season ran August 1–October 18 and has ended. These are reference dates, not live ticket availability.'
      : 'Last verified schedule: August 1–October 18, 2026. New-season dates and ticket availability are not confirmed here.';
    if (note) {
      note.innerHTML = `🗓 <strong>${current ? '2026 season ended:' : 'Historical schedule:'}</strong> ${label} <a href="https://agawatrain.com/" target="_blank" rel="noopener">Verify train schedule →</a>`;
    }
    document.querySelectorAll('.fn-item').forEach((item) => {
      if (!/Agawa Canyon train/i.test(item.textContent)) return;
      item.innerHTML = `<strong>The Agawa Canyon train.</strong> ${label} Check the <a href="https://agawatrain.com/" target="_blank" rel="noopener">official operator schedule</a> before building a day around the train.`;
    });
  }

  function addCurrentAlerts() {
    const is2026 = sourceSeasonIsCurrent();
    const alerts = [
      {
        stop: '11', key: 'pictured-rocks',
        heading: is2026 ? 'Pictured Rocks: latest checked 2026 notice' : 'Pictured Rocks: historical access notice',
        body: is2026
          ? 'As checked October 26, 2026, Munising Falls Trail was listed closed until further notice; this page does not verify its present status.'
          : 'The 2026 source check listed Munising Falls Trail closed. Current-season access is not verified here.',
        links: '<a href="https://www.nps.gov/piro/planyourvisit/conditions.htm" target="_blank" rel="noopener">Verify NPS conditions →</a>'
      },
      {
        stop: '15', key: 'lspp',
        heading: is2026 ? 'Lake Superior Provincial Park: 2026 operating season ended' : 'Lake Superior Provincial Park: historical 2026 notice',
        body: is2026
          ? 'The 2026 day-use season ended October 25. Agawa Rock Pictographs Trail and Trapper’s Trail were closed for the 2026 season. Other off-season access is unverified.'
          : 'The park’s 2026 day-use dates and trail closures are historical. New-season opening dates and access have not been confirmed by this Circle Tour page.',
        links: '<a href="/lake-superior-provincial-park/">Compare park experiences →</a> <a href="https://www.ontarioparks.ca/park/lakesuperior/alerts" target="_blank" rel="noopener">Verify Ontario Parks alerts →</a>'
      }
    ];
    alerts.forEach(({stop, key, heading, body, links}) => {
      const host = document.querySelector(`#stop-${stop} .stop-body`);
      if (!host) return;
      let alert = host.querySelector(`[data-current-alert="${key}"]`);
      if (!alert) {
        alert = document.createElement('div');
        alert.className = 'ct-current-alert';
        alert.dataset.currentAlert = key;
        host.prepend(alert);
      }
      alert.dataset.currentSeason = String(is2026);
      alert.dataset.sourceYear = '2026';
      alert.innerHTML = `<strong>${heading}</strong>${body} ${links}`;
    });
  }

  function flattenCompanionCards() {
    const grid = document.querySelector('.ct-grid');
    if (!grid) return;
    Array.from(grid.querySelectorAll('.ct-card')).forEach((card) => {
      if (card.parentElement !== grid) grid.appendChild(card);
    });
  }

  function loadContextualTripStack() {
    if (document.querySelector('script[data-contextual-trip-stack-loader]')) return;
    const script = document.createElement('script');
    script.src = '/assets/contextual-trip-stack.js?v=20260820-registry1';
    script.defer = true;
    script.dataset.contextualTripStackLoader = 'circle-tour';
    document.head.appendChild(script);
  }

  function markRelease() {
    document.documentElement.dataset.circleTourRelease = RELEASE;
    const footer = document.querySelector('.footer');
    if (footer) {
      footer.textContent = footer.textContent.replace(/Updated (August 2026|August 20, 2026|September 29, 2026)/, 'Updated November 8, 2026');
    }
  }

  async function boot() {
    try {
      // Shared Rust source gates must be available before both route planners.
      // The adapter itself is nonblocking: a missing WASM keeps JS policy live.
      await import('/assets/circle-tour-rust-itinerary.js?v=20261114');
      await import('/assets/lake-superior-circle-tour-core.js?v=20260820');
    } finally {
      addStyles();
      updateStructuredData();
      removeSelfJustifyingCopy();
      patchAgawaTrain();
      addCurrentAlerts();
      flattenCompanionCards();
      loadContextualTripStack();
      markRelease();
      loadLiveLevel();
    }
    await import('/assets/lake-superior-circle-tour-live-day.js?v=20260930-1');
  }

  boot();
})();