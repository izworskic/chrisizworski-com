(() => {
  'use strict';

  const RELEASE = '2026-08-20';

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

  function patchAgawaTrain() {
    document.querySelectorAll('a[href*="agawacanyontrain.com"]').forEach((a) => {
      a.href = 'https://agawatrain.com/';
    });
    const stop = document.getElementById('stop-14');
    const note = stop?.querySelector('.season-note');
    if (note) note.innerHTML = '🗓 <strong>2026 season:</strong> Agawa Canyon Tour Train runs August 1–October 18. Summer fares run through September 14; fall season starts September 15. Reserve ahead, especially for fall color. <a href="https://agawatrain.com/" target="_blank" rel="noopener">Train schedule →</a>';

    document.querySelectorAll('.fn-item').forEach((item) => {
      if (!/Agawa Canyon train/i.test(item.textContent)) return;
      item.innerHTML = '<strong>The Agawa Canyon train.</strong> The 2026 season runs August 1–October 18 from Sault Ste. Marie. Fall dates sell quickly; verify the current schedule before building it into a driving day.';
    });
  }

  function addCurrentAlerts() {
    const pictured = document.querySelector('#stop-11 .stop-body');
    if (pictured && !pictured.querySelector('[data-current-alert="pictured-rocks"]')) {
      const alert = document.createElement('div');
      alert.className = 'ct-current-alert';
      alert.dataset.currentAlert = 'pictured-rocks';
      alert.innerHTML = '<strong>Pictured Rocks current note</strong>Munising Falls Trail remains closed until further notice. Sand Point Road and beach are open after the planned July closure was postponed. <a href="https://www.nps.gov/piro/planyourvisit/conditions.htm" target="_blank" rel="noopener">Check NPS conditions →</a>';
      pictured.prepend(alert);
    }

    const lspp = document.querySelector('#stop-15 .stop-body');
    if (lspp && !lspp.querySelector('[data-current-alert="lspp"]')) {
      const alert = document.createElement('div');
      alert.className = 'ct-current-alert';
      alert.dataset.currentAlert = 'lspp';
      alert.innerHTML = '<strong>Lake Superior Provincial Park alert</strong>Gargantua Road is closed for maintenance, affecting several backcountry access points and campsites. Photography and digital-device use are not permitted at the Agawa Rock Pictographs. <a href="https://www.ontarioparks.ca/park/LakeSuperior/alerts" target="_blank" rel="noopener">Check Ontario Parks alerts →</a>';
      lspp.prepend(alert);
    }
  }

  function flattenCompanionCards() {
    const grid = document.querySelector('.ct-grid');
    if (!grid) return;
    Array.from(grid.querySelectorAll('.ct-card')).forEach((card) => {
      if (card.parentElement !== grid) grid.appendChild(card);
    });
  }

  function markRelease() {
    document.documentElement.dataset.circleTourRelease = RELEASE;
    const footer = document.querySelector('.footer');
    if (footer && /Updated August 2026/.test(footer.textContent)) footer.textContent = footer.textContent.replace('Updated August 2026', 'Updated August 20, 2026');
  }

  async function boot() {
    try {
      await import('/assets/lake-superior-circle-tour-core.js?v=20260820');
    } finally {
      addStyles();
      updateStructuredData();
      removeSelfJustifyingCopy();
      patchAgawaTrain();
      addCurrentAlerts();
      flattenCompanionCards();
      markRelease();
      loadLiveLevel();
    }
  }

  boot();
})();