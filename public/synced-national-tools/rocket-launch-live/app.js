'use strict';
(() => {
  const API = '/api/rocket-launch-usa';
  const OFFICIAL_EVIDENCE_API = '/api/rocket-official-notices';
  const KSC_OFFICIAL_API = '/api/space-coast-ksc-watch';
  const $ = id => document.getElementById(id);
  const validRegions = new Set(['california', 'florida', 'texas', 'virginia', 'alaska', 'hawaii']);
  const state = { request: 0, data: null, map: null, markers: new Map(), regions: [], userFocusedMap: false, officialEvidence: null, officialEvidenceLoaded: false, kscEvidence: null, kscMissionId: null, kscRequest: 0 };
  const el = (tag, className, value) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (value !== undefined && value !== null) n.textContent = String(value);
    return n;
  };
  const set = (id, value) => { const n = $(id); if (n) n.textContent = value ?? '—'; };
  const safeUrl = url => typeof url === 'string' &&
    (/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(url) || /^\/(?!\/)/.test(url));
  const anchor = (url, label, className) => {
    if (!safeUrl(url)) return null;
    const a = el('a', className, label);
    a.href = url;
    if (/^https:\/\//.test(url)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  };
  const stamp = iso => {
    const d = new Date(iso || '');
    return Number.isNaN(+d) ? 'Not available' :
      d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  };
  function formattedDate(l, zone) {
    const d = new Date(l?.net || '');
    if (Number.isNaN(+d)) return 'Date not announced';
    const precision = l?.netPrecision;
    const year = () => new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' }).format(d);
    if (precision === 'year') return year();
    if (precision === 'month') return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
    const timeZone = ['day', 'date-tbd'].includes(precision) ? 'UTC' : zone || 'UTC';
    return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  }
  function formattedTime(l, zone) {
    const d = new Date(l?.net || '');
    if (Number.isNaN(+d)) return 'Time unverified';
    const p = l?.netPrecision;
    if (!['minute', 'second', 'hour'].includes(p)) return 'Launch time TBD';
    const t = new Intl.DateTimeFormat('en-US', {
      timeZone: zone || 'UTC', hour: 'numeric',
      minute: p === 'hour' ? undefined : '2-digit', timeZoneName: 'short'
    }).format(d);
    return p === 'hour' ? 'Approx. ' + t : t;
  }
  function chip(n, label, stateName) {
    n.textContent = label || 'Unverified';
    n.dataset.state = stateName || 'unknown';
  }
  function board() {
    const root = $('rl-national-board');
    if (!root || !state.data) return;
    root.replaceChildren();
    for (const r of state.data.regions || []) {
      const card = el('article', 'rl-board-card');
      const head = el('div', 'rl-board-header');
      const name = el('h3', '', r.name);
      name.appendChild(el('small', '', r.subtitle));
      head.append(name, el('span', 'rl-board-count',
        r.feedState === 'unavailable' ? 'Feed unavailable' : r.launches.length + ' listed'));
      card.appendChild(head);
      const launches = (r.launches || []).slice(0, 2);
      if (launches.length) launches.forEach(l => {
        const item = el('div', 'rl-board-item');
        item.appendChild(el('strong', '', l.name || 'Upcoming mission'));
        item.appendChild(el('span', '', formattedDate(l, r.timezone) +
          ' · ' + formattedTime(l, r.timezone) + ' · ' + (l.scheduleConfidence?.label || 'Timing unconfirmed')));
        card.appendChild(item);
      });
      else card.appendChild(el('p', 'rl-board-empty',
        r.feedState === 'unavailable' ?
          'The schedule service could not be checked for this region. Use the official range source.' :
          'No upcoming mission in this bounded schedule window. This is not a claim that the range has no operations.'));
      const button = el('button', '', 'Explore ' + r.name);
      button.type = 'button';
      button.addEventListener('click', () => changeRegion(r.id, true));
      card.appendChild(button);
      root.appendChild(card);
    }
  }
  function floridaSpecialistLink(url, data = state.data) {
    if (typeof url !== 'string') return url;
    const region = url.startsWith('/national-tools/space-coast-launch/')?'florida':
      url.startsWith('/starbase-rocket-launch-viewing/')?'texas':
      url.startsWith('/wallops-rocket-launch-viewing/')?'virginia':
      url.startsWith('/kodiak-rocket-launch-viewing/')?'alaska':
      url.startsWith('/barking-sands-rocket-launch-viewing/')?'hawaii':null;
    if (!region) return url;
    const selected = data?.selectedRegion === region ? data.selectedLaunchId : null;
    return selected && /^[0-9a-f-]{36}$/i.test(selected) ?
      url + '?launchId=' + encodeURIComponent(selected) : url;
  }
  function sourceLinks(r) {
    const root = $('rl-region-links');
    if (!root) return;
    root.replaceChildren();
    const links = [
      [r.authority, 'Official launch notices'],
      [r.access, 'Viewing and access rules']
    ];
    if (r.specialist) links.unshift([floridaSpecialistLink(r.specialist),
      r.id === 'texas' ? 'Starbase public viewing map · same mission' :
      r.id === 'virginia' ? 'Wallops public launch-viewing atlas · same mission' :
      r.id === 'alaska' ? 'Kodiak range access desk · same mission' :
      r.id === 'hawaii' ? 'Barking Sands Navy access desk · same mission' :
      'Florida detailed viewer · same mission']);
    for (const [url, title] of links) {
      const a = anchor(url, title);
      if (a) root.appendChild(a);
    }
  }
  function showRegion(r) {
    set('rl-region-name', r.name);
    set('rl-region-description', r.description);
    set('rl-region-coast', r.coast);
    set('rl-region-timezone', r.timezone.replace(/_/g, ' '));
    const match = state.data.regions.find(x => x.id === r.id);
    set('rl-region-count', match?.feedState === 'unavailable' ? 'Feed offline' :
      (match?.launches?.length ?? 0) + (match?.feedTruncated ? '+ listed' : ' listed'));
    sourceLinks(r);
    for (const button of document.querySelectorAll('.rl-region-btn[data-region]')) {
      button.setAttribute('aria-pressed', button.dataset.region === r.id ? 'true' : 'false');
    }
    if (state.map && state.markers.has(r.id)) {
      for (const [id, circle] of state.markers) circle.setStyle({
        radius: id === r.id ? 12 : 8,
        fillColor: id === r.id ? '#dc754c' : '#163f4b',
        color: '#fff', weight: id === r.id ? 3 : 2, fillOpacity: 1
      });
      if (state.userFocusedMap) state.map.setView([match.lat, match.lon], r.id === 'hawaii' || r.id === 'alaska' ? 7 : 8, { animate: false });
    }
  }
  function initMap() {
    if (state.map || !window.L || !$('rl-coast-map') || !state.data?.regions?.length) return;
    const root = $('rl-coast-map');
    root.replaceChildren();
    try {
      const map = window.L.map(root, { scrollWheelZoom: false, zoomControl: true, preferCanvas: true });
      const osmCredit = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      // Never request a keyless CARTO tile: as of 2026 those tiles return
      // an "API KEY REQUIRED" watermark even though the HTTP response is 200.
      // Start with a working fallback, then replace it only after a keyed tile loads.
      const osm = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: osmCredit
      }).addTo(map);
      root.dataset.tiles = 'osm-fallback';
      fetch('/api/carto-basemap-config', { credentials: 'same-origin', signal: AbortSignal.timeout(6500) })
        .then(response => response.ok ? response.json() : null)
        .then(config => {
          if (config?.provider !== 'CARTO' || typeof config.key !== 'string' || !config.key.trim()) return;
          const keyedUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=' +
            encodeURIComponent(config.key.trim());
          const carto = window.L.tileLayer(keyedUrl, {
            subdomains: 'abcd', maxZoom: 19,
            attribution: osmCredit + ' &copy; <a href="https://carto.com/attributions">CARTO</a>'
          });
          let confirmed = false, errors = 0;
          carto.on('tileload', () => {
            if (!confirmed && map.hasLayer(carto)) {
              confirmed = true;
              root.dataset.tiles = 'carto-keyed';
              if (map.hasLayer(osm)) map.removeLayer(osm);
            }
          });
          carto.on('tileerror', () => {
            if (++errors >= 2 && !confirmed) {
              if (map.hasLayer(carto)) map.removeLayer(carto);
              if (!map.hasLayer(osm)) osm.addTo(map);
              root.dataset.tiles = 'osm-fallback';
            }
          });
          carto.addTo(map);
        })
        .catch(() => { root.dataset.tiles = 'osm-fallback'; });
      const bounds = [];
      for (const r of state.data.regions) {
        if (!Number.isFinite(r.lat) || !Number.isFinite(r.lon)) continue;
        const circle = window.L.circleMarker([r.lat, r.lon], {
          radius: 8, fillColor: '#163f4b', fillOpacity: 1, color: '#fff', weight: 2
        }).addTo(map);
        circle.bindTooltip(r.name + ' · ' + r.coast, { direction: 'top' });
        circle.on('click', () => changeRegion(r.id));
        state.markers.set(r.id, circle);
        bounds.push([r.lat, r.lon]);
      }
      if (bounds.length) map.fitBounds(bounds, { padding: [27, 27] });
      state.map = map;
    } catch (_) {
      root.replaceChildren(el('div', 'rl-map-fallback', 'Map tiles unavailable. The coast buttons above remain fully functional.'));
    }
  }
  function renderMission(data) {
    const launch = data.selectedLaunch;
    const zone = data.region.timezone;
    set('rl-mission-name', launch?.name || 'No upcoming launch in this regional feed');
    const c = launch?.scheduleConfidence;
    const sourceStale=data.scheduleFreshness==='stale'||launch?.sourceStale===true;
    chip($('rl-schedule-grade'),
      sourceStale?'Launch schedule check overdue':
        c?.label || (data.coverage.partial ? 'Schedule partly unavailable' : 'Timing unverified'),
      sourceStale?'unknown':c?.level || 'unknown');
    set('rl-date', launch ? formattedDate(launch, zone) : 'No confirmed date');
    set('rl-time', launch ? formattedTime(launch, zone) : 'Time not announced');
    set('rl-schedule-detail',
      (sourceStale?'This launch record has not been verified in a recent source observation. ':'')+
      (data.scheduleWarning?data.scheduleWarning+' ':'')+
      (c?.detail || (data.coverage.partial ?
        'One or more provider groups are incomplete; an absent mission is not a confirmed zero.' :
        'No scheduled launch was returned within the configured bounded sample.')));
    set('rl-pad', launch?.pad || 'Not announced');
    set('rl-rocket', launch?.rocket || 'Not announced');
    set('rl-schedule-updated', launch?.lastUpdated ? stamp(launch.lastUpdated) : 'Not provided');
    set('rl-national-next', data.nationalNext ?
      data.nationalNext.name + ' · ' + formattedDate(data.nationalNext,
        data.regions.find(r => r.id === data.nationalNext.region)?.timezone) :
      'No upcoming coastal mission verified');
    set('rl-feed-health', data.coverage.partial ? 'Partial schedule coverage' : 'Six coastal regions checked');
    set('rl-updated-at', data.scheduleCheckedAt?stamp(data.scheduleCheckedAt):'No schedule observation');
  }

  // Static NASA catalog is built by an independently tested Python source review.
  // No NASA or launch-provider API requests are issued by the visitor's browser.
  const VISUAL_CATALOG = '/national-tools/rocket-launch-live/visual-catalog.json';
  const FAMILY_ORDER = ['falcon-9', 'starship', 'vulcan', 'new-glenn'];
  const NASA_IMAGE = /^https:\/\/images-assets\.nasa\.gov\/image\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+~(?:small|medium|large|thumb)\.(?:jpg|jpeg|png|webp)$/i;
  const NASA_PAGE = /^https:\/\/images\.nasa\.gov\/details\/[A-Za-z0-9_-]+$/i;
  const NASA_CREDIT = /^NASA(?:\/|$)/i;
  function visualImageApproved(item) {
    return Boolean(item && typeof item.imageUrl==='string' && NASA_IMAGE.test(item.imageUrl) &&
      NASA_PAGE.test(item.sourceUrl||'') && typeof item.nasaId==='string' &&
      typeof item.credit==='string' && NASA_CREDIT.test(item.credit) &&
      !/spacex|blue origin|copyright|courtesy|licensed/i.test(item.credit));
  }
  function visualPhoto(host, item, fallback, size) {
    host.replaceChildren();
    if (!visualImageApproved(item)) {
      host.appendChild(el('div', 'rl-visual-unavailable', fallback));
      return;
    }
    const photo=el('img', 'rl-visual-image');
    photo.src=item.imageUrl;
    photo.alt='NASA archive: '+(item.title||item.nasaId||'Rocket or spacecraft photo')+
      '. Representative archival photo, not a current launch camera.';
    photo.loading='lazy';
    photo.decoding='async';
    photo.referrerPolicy='no-referrer';
    if(size==='small') {photo.width=360;photo.height=230;}
    else {photo.width=920;photo.height=550;}
    photo.addEventListener('error',()=>{
      host.replaceChildren(el('div','rl-visual-unavailable',
        'Archived photo could not be loaded. The NASA source record remains linked below.'));
    }, {once:true});
    host.appendChild(photo);
    host.appendChild(el('span','rl-visual-caption',
      'NASA archive · '+item.credit+' · representative image'));
  }
  function rocketFamily(launch) {
    const value=((launch?.rocket||'')+' '+(launch?.name||'')).toLowerCase();
    if (/\bfalcon\s*heavy\b/.test(value)) return null;
    if (/\bfalcon[\s-]*9\b/.test(value)) return 'falcon-9';
    if (/\bstarship\b|\bsuper[\s-]*heavy\b/.test(value)) return 'starship';
    if (/\bvulcan\b/.test(value)) return 'vulcan';
    if (/\bnew[\s-]*glenn\b/.test(value)) return 'new-glenn';
    return null;
  }
  function matchedPayload(launch,catalog) {
    const value=((launch?.mission||'')+' '+(launch?.name||'')).toLowerCase();
    const tokens=['escapade','imap','europa-clipper','psyche','pace'];
    for (const key of tokens) {
      if (!catalog?.payloads?.[key]) continue;
      const word=key.replace(/-/g,'[\\s-]*');
      if(new RegExp('(?:^|[^a-z0-9])'+word+'(?:$|[^a-z0-9])','i').test(value))
        return catalog.payloads[key];
    }
    return null;
  }
  function renderVisuals(data) {
    const rocketHost=$('rl-visual-rocket-photo');
    const payloadHost=$('rl-visual-payload-photo');
    if(!rocketHost||!payloadHost)return;
    const launch=data?.selectedLaunch;
    const catalog=state.visualCatalog;
    const family=rocketFamily(launch);
    const rocket=family?catalog?.rockets?.[family]:null;
    const payload=matchedPayload(launch,catalog);
    const rocketLinks=$('rl-visual-rocket-links');
    const payloadLinks=$('rl-visual-payload-links');
    rocketLinks.replaceChildren();payloadLinks.replaceChildren();
    if (!launch) {
      visualPhoto(rocketHost,null,'Select a launch to explore its rocket.');
      visualPhoto(payloadHost,null,'No payload selected yet.');
      set('rl-visual-rocket-title','Choose a mission to meet the vehicle');
      set('rl-visual-rocket-story','Rocket-family images are selected from independently credited NASA archive assets.');
      set('rl-visual-rocket-evidence','No mission-selected rocket match.');
      set('rl-visual-payload-title','Choose a mission to learn about its payload');
      set('rl-visual-payload-story','A mission label alone does not prove a NASA spacecraft-photo match.');
      set('rl-visual-payload-evidence','No payload image claim.');
    } else {
      set('rl-visual-rocket-title',rocket?.family||launch.rocket||'Rocket identity not announced');
      set('rl-visual-rocket-story',rocket?.summary||
        'This rocket has not yet been matched to a NASA-credited family image in the catalog.');
      set('rl-visual-rocket-evidence',visualImageApproved(rocket)?
        rocket.context+' Source: '+rocket.credit+'.':
        'No suitable NASA-credited vehicle photo has been cleared for this rocket. Do not substitute another type.');
      visualPhoto(rocketHost,rocket,'NASA-cleared rocket photo not available for this vehicle.');
      if(visualImageApproved(rocket)){
        const a=anchor(rocket.sourceUrl,'Photo and original NASA caption');if(a)rocketLinks.appendChild(a);
      }
      if(rocket?.operatorUrl){const a=anchor(rocket.operatorUrl,'Explore the vehicle at its operator');if(a)rocketLinks.appendChild(a);}
      const payloadName=launch.mission||launch.name?.split('|').slice(1).join('|').trim()||'Payload not yet identified';
      set('rl-visual-payload-title',payload?.name||payloadName);
      if(payload&&visualImageApproved(payload)){
        visualPhoto(payloadHost,payload,'NASA payload photo unavailable.');
        set('rl-visual-payload-story',payload.summary||'Mission spacecraft photographed by NASA.');
        set('rl-visual-payload-evidence',payload.context+' Credit: '+payload.credit+'.');
        const a=anchor(payload.sourceUrl,'Open this spacecraft photo at NASA');if(a)payloadLinks.appendChild(a);
      }else{
        visualPhoto(payloadHost,null,'No NASA-credited photo matched to this specific payload.');
        set('rl-visual-payload-story',
          'Launch Library identifies this mission, but an independently cleared NASA photo of its payload has not been matched. That is not evidence the payload lacks public imagery.');
        set('rl-visual-payload-evidence','Payload photography is not inferred from another mission or a similar satellite.');
        const operator=anchor(data?.mediaDesk?.operator?.url||data?.region?.authority,
          'Check operator or range for mission details');
        if(operator)payloadLinks.appendChild(operator);
      }
    }
    const gallery=$('rl-visual-family-gallery');
    if(!gallery)return;
    gallery.replaceChildren();
    for(const key of FAMILY_ORDER){
      const item=catalog?.rockets?.[key];
      if(!item)continue;
      const card=el('article','rl-visual-family-card');
      card.dataset.selected=family===key?'true':'false';
      const pic=el('div','rl-visual-family-photo');
      visualPhoto(pic,item,'NASA photo not cleared for '+item.family,'small');
      card.appendChild(pic);
      const copy=el('div','rl-visual-family-copy');
      copy.appendChild(el('strong','',item.family));
      copy.appendChild(el('span','',item.provider+' · '+(visualImageApproved(item)?
        'NASA-credited historical photo':'vehicle image awaiting clearance')));
      const a=anchor(visualImageApproved(item)?item.sourceUrl:item.operatorUrl,
        visualImageApproved(item)?'View NASA original':'Explore at operator');
      if(a)copy.appendChild(a);
      card.appendChild(copy);gallery.appendChild(card);
    }
    if(!catalog?.rockets)gallery.appendChild(el('p','rl-visual-unavailable',
      'The image catalog is unavailable; no unsourced rocket or payload photos are substituted.'));
  }
  async function loadVisualCatalog() {
    try {
      const response=await fetch(VISUAL_CATALOG,{credentials:'same-origin',cache:'force-cache',
        signal:AbortSignal.timeout(9000),headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error('catalog not available');
      const parsed=await response.json();
      if(parsed?.schemaVersion!==1||!parsed?.rockets||!parsed?.payloads)
        throw new Error('unrecognized image catalog version');
      state.visualCatalog=parsed;
    }catch(_){state.visualCatalog=null;}
    if(state.data)renderVisuals(state.data);
  }

  // Reuse the exact LL2 mission's sanitized media records from the shared collector.
  // These buttons never claim player health, pad alignment, range GO, or launch success.
  function renderMediaDesk(data) {
    const root = $('rl-watch-mission-videos');
    const general = $('rl-watch-general');
    if (!root || !general) return;
    root.replaceChildren();
    general.replaceChildren();
    const launch = data?.selectedLaunch;
    const desk = data?.mediaDesk;
    const matched = Boolean(launch?.id && desk?.launchId === launch.id);
    set('rl-watch-mission', launch?.name || 'No launch selected for this coast');
    const current = matched && desk.sourceFreshness === 'recent' &&
      launch.sourceStale !== true && data.scheduleFreshness !== 'stale';
    set('rl-watch-status', !matched ? 'No mission media record' :
      current ? 'Recent LL2 media listing' : 'Media source overdue');
    set('rl-watch-evidence', !matched ?
      'No mission-specific media can be matched without a selected launch. An empty listing is not proof a webcast will not happen.' :
      (desk.missionVideoCount || 0) + ' link(s) attached to this exact launch ID. ' +
      'Schedule observation: ' + stamp(desk.checkedAt) + '. ' +
      (current ? 'Source recently checked; stream playback still unverified.' :
        'Video links may have changed since this mission was last observed.') +
      ' "Official webcast" is the LL2 classification, not independent operator verification.');
    if (!matched) {
      root.appendChild(el('p', 'rl-watch-empty',
        'Select a mission with a current source record to see its specific video links.'));
      general.appendChild(el('p', 'rl-watch-empty',
        'A generic camera is not evidence for a selected rocket or pad.'));
      return;
    }
    function videoCard(item, camera) {
      const card = el('article', 'rl-watch-card');
      card.appendChild(el('span', 'rl-watch-card-kind',
        camera ? 'Area camera · not a mission match' :
          item.sourceLabel || 'LL2 mission-linked video'));
      card.appendChild(el('strong', 'rl-watch-card-title',
        camera ? item.title : item.title || 'Mission video'));
      card.appendChild(el('small', 'rl-watch-card-publisher',
        (camera ? item.publisher : item.publisher || 'Publisher not identified') +
        ' · ' + (camera ? 'source documented ' + item.verifiedAsSourceOn :
          item.sourceReportedEnded ? 'LL2 lists stream as ended or a replay' :
          current && item.sourceReportedLive === true ?
            'LL2 reported live when last checked; not independently confirmed' :
            'Playback status unverified')));
      const source = anchor(camera ? item.siteUrl : item.url,
        camera ? 'Open publisher camera' : 'Watch on publisher site', 'rl-watch-link');
      if (source) card.appendChild(source);
      const id = item.youtubeId;
      if (typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id)) {
        const frameHost = el('div', 'rl-watch-frame');
        if (!camera && item.url === desk.primaryVideo?.url) {
          const preview = el('img', 'rl-watch-preview');
          preview.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
          preview.loading = 'lazy';
          preview.alt = 'Publisher video thumbnail; not a live camera still';
          frameHost.appendChild(preview);
        }
        const play = el('button', 'rl-watch-play',
          camera ? 'Play area camera from YouTube' : 'Play this mission video from YouTube');
        play.type = 'button';
        play.addEventListener('click', () => {
          const frame = el('iframe', 'rl-watch-player');
          frame.title = (camera ? 'Area camera: ' : 'Mission video: ') + item.title;
          frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0';
          frame.loading = 'lazy';
          frame.referrerPolicy = 'strict-origin-when-cross-origin';
          frame.allow = 'encrypted-media; picture-in-picture; fullscreen';
          frame.allowFullscreen = true;
          frameHost.replaceChildren(frame);
          play.remove();
        });
        card.append(frameHost, play);
      }
      return card;
    }
    const videos = Array.isArray(desk.videos) ? desk.videos.slice(0, 5) : [];
    if (videos.length) videos.forEach(item => root.appendChild(videoCard(item, false)));
    else root.appendChild(el('p', 'rl-watch-empty',
      'No webcast link is attached to this mission in the last checked LL2 record. Check the operator as launch day approaches.'));
    const cameras = data.selectedRegion === 'florida' && Array.isArray(desk.cameras) ?
      desk.cameras : [];
    if (cameras.length) cameras.forEach(item => general.appendChild(videoCard(item, true)));
    else general.appendChild(el('p', 'rl-watch-empty',
      'No independently sourced general pad camera is verified for this coast. Do not substitute a Florida camera for another launch range.'));
    if (desk.operator?.url) {
      const source = anchor(desk.operator.url,
        desk.operator.label || 'Open launch operator updates', 'rl-watch-operator');
      if (source) general.appendChild(source);
    }
    if (desk.operator?.videoChannelUrl) {
      const channel=anchor(desk.operator.videoChannelUrl,
        desk.operator.videoChannelLabel||'Operator video channel · mission broadcast unverified',
        'rl-watch-operator');
      if(channel)general.appendChild(channel);
    }
    if (data.region?.specialist) {
      const detail = anchor(floridaSpecialistLink(data.region.specialist,data),
        data.region?.id === 'texas' ? 'Texas: same mission, public map and city road notice' :
          'Florida: same launch, pad access, tickets and forecast', 'rl-watch-operator');
      if (detail) general.appendChild(detail);
    }
  }
  function renderSelector(data) {
    const select = $('rl-launch-select');
    if (!select) return;
    const match = data.regions.find(r => r.id === data.selectedRegion);
    select.replaceChildren();
    const launches = match?.launches || [];
    for (const l of launches) {
      const option = el('option', '',
        l.name + ' · ' + formattedDate(l, match.timezone) +
        (['minute', 'second', 'hour'].includes(l.netPrecision) ?
          ' · ' + formattedTime(l, match.timezone) : ' · time TBD'));
      option.value = l.id;
      select.appendChild(option);
    }
    if (!launches.length) {
      const o = el('option', '', 'No current launch in this feed');
      o.value = '';
      select.appendChild(o);
    }
    select.disabled = !launches.length;
    if (data.selectedLaunchId) select.value = data.selectedLaunchId;
  }
  function renderIndependentReporting(data) {
    const desk=data?.independentReporting || {};
    const current=desk.status==='ok';
    set('rl-news-checked', current ?
      'Spaceflight Now RSS checked ' + stamp(desk.checkedAt) :
      'Spaceflight Now reporting could not be checked just now');
    const list=$('rl-news-stories');
    if(!list)return;
    list.replaceChildren();
    const articles=Array.isArray(desk.stories)?desk.stories.slice(0,3):[];
    const trusted=u=>typeof u==='string' &&
      /^https:\/\/(?:www\.)?spaceflightnow\.com\/20\d\d\/(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])\/[a-z0-9-]+\/$/i.test(u);
    if(current && articles.length)for(const item of articles){
      if(!trusted(item.url) || typeof item.title!=='string')continue;
      const card=el('article','rl-news-article');
      card.appendChild(el('p','rl-news-meta',
        (item.match==='mission-identifier' ? 'Identified mission' :
          'Related provider / payload context') +
        ' · published ' + stamp(item.publishedAt)));
      const a=anchor(item.url,item.title.slice(0,170));
      if(a)card.appendChild(a);
      list.appendChild(card);
    }
    if(!list.children.length)list.appendChild(el('p','rl-news-note',
      current ? 'No distinct, safely matched recent story in the bounded RSS feed. You can still read the full Spaceflight Now schedule.' :
        'The independent news feed is unavailable. This does not mean there is no reporting or that the launch schedule has changed.'));
    set('rl-news-note',desk.note || 'Editorial reporting does not confirm the operator’s current launch target or weather approval.');
  }

  function renderAccess(data) {
    const access = data.access || {};
    const sites = $('rl-sites');
    if (sites) {
      sites.replaceChildren();
      for (const s of access.sites || []) {
        const card = el('article', 'rl-site-card');
        card.dataset.state = s.state || 'verify';
        card.appendChild(el('span', 'rl-site-kicker', s.bestFor || 'Viewing area'));
        card.appendChild(el('h3', '', s.name));
        card.appendChild(el('span', 'rl-site-status', s.label || 'Access must be checked'));
        card.appendChild(el('p', '', s.reason || 'Access conditions have not been confirmed for this launch.'));
        const actions = el('div', 'rl-site-actions');
        const source = anchor(s.kind === 'specialist' ?
          floridaSpecialistLink(s.source,data) : s.source,
          s.kind === 'specialist' ? 'Continue this mission in Florida' : 'Official / operator source', 'rl-mainlink');
        if (source) actions.appendChild(source);
        if (s.directionsAllowed && s.address && s.state !== 'restricted' && s.state !== 'hours') {
          const directions = anchor('https://www.google.com/maps/search/?api=1&query=' +
            encodeURIComponent(s.address), 'Map location · verify entry');
          if (directions) actions.appendChild(directions);
        }
        card.appendChild(actions);
        sites.appendChild(card);
      }
    }
    chip($('rl-access-grade'),
      data.region.id === 'florida' ? 'Open Florida detail engine' :
      data.region.id === 'alaska' || data.region.id === 'hawaii' ?
        'No public launch access verified' : 'Access requires confirmation',
      data.region.id === 'alaska' || data.region.id === 'hawaii' ? 'restricted' : 'unknown');
    set('rl-access-summary', access.guidance ||
      'Viewing and access guidance is not verified. Use the range’s official notice.');
    const notice = $('rl-official-notice');
    const live = access.liveOfficialNotice;
    if (notice) {
      notice.replaceChildren();
      if (live && data.region.id === 'texas') {
        notice.hidden = false;
        notice.dataset.state = live.state === 'closed' ? 'closed' :
          live.roadState === 'advisory' ? 'advisory' : 'unknown';
        const status = live.state === 'closed' ? 'Boca Chica Beach: closed on official site' :
          live.state === 'open-general' ? 'Boca Chica Beach: generally open on official site' :
          'Boca Chica Beach status unverified';
        notice.appendChild(el('strong', '', status));
        notice.appendChild(el('div', '',
          (live.roadState === 'advisory' ? 'Current road notice: ' + (live.description || 'Road advisory reported.') + '. ' : '') +
          'A currently open beach is not approval to enter a launch exclusion zone.'));
        notice.appendChild(el('div', '', 'Published page checked ' + stamp(live.checkedAt)));
        const a = anchor(live.url, 'Read official Starbase beach and road notices');
        if (a) notice.appendChild(a);
      } else notice.hidden = true;
    }
  }
  // These are NWS *hypothetical delayed target* samples, not a launch forecast.
  // No extra calls: all four cases come with the existing regional weather API.
  function renderSlipForecast(data) {
    const root=$('rl-slip-options'),detail=$('rl-slip-detail');
    if (!root || !detail) return;
    root.replaceChildren();detail.replaceChildren();
    const forecast=data?.weather?.slip;
    const scenarios=Array.isArray(forecast?.scenarios)?forecast.scenarios:[];
    const safe=scenarios.filter(s=>[0,1,3,6].includes(s.offsetHours));
    const sourceStale=data.scheduleFreshness==='stale'||forecast?.sourceOverdue===true;
    if (!safe.length) {
      set('rl-slip-brief','No delay scenario yet. A minute-level launch target, two NWS regional forecast samples and an in-range date are necessary.');
      detail.appendChild(el('p','rl-slip-empty',
        'This does not mean clouds will be clear or that a launch will occur. Use the official range and operator sources.'));
      return;
    }
    set('rl-slip-brief',
      (sourceStale?'The mission target has not been checked recently. Comparison recommendations are withheld. ':
        forecast?.outlook+' ') +
      'Samples are hypothetical delays only; the published liftoff time has not changed.');
    const buttons=[];
    const timeLabel=iso=>{
      const parsed=Date.parse(iso||'');
      if(!Number.isFinite(parsed))return 'Time not available';
      return new Intl.DateTimeFormat('en-US',{
        timeZone:data.region?.timezone||'UTC',weekday:'short',hour:'numeric',minute:'2-digit',
        timeZoneName:'short'
      }).format(new Date(parsed));
    };
    function update(index) {
      for(const [i,button] of buttons.entries()){
        button.setAttribute('aria-pressed',i===index?'true':'false');
      }
      detail.replaceChildren();
      const item=safe[index];
      const head=el('div','rl-slip-detail-head');
      head.appendChild(el('strong','',item.offsetHours===0?'The scheduled target':
        '+'+item.offsetHours+' hour'+(item.offsetHours===1?'':'s')+' from the target'));
      head.appendChild(el('span','',timeLabel(item.targetAt)));
      detail.appendChild(head);
      const rows=el('div','rl-slip-site-grid');
      for(const point of item.places||[]){
        const card=el('div','rl-slip-site');
        card.appendChild(el('span','rl-slip-site-label',point.name||'Regional forecast reference'));
        const numeric=point.cloudStatus==='ok'&&Number.isInteger(point.cloudCoverPercent);
        const val=el('strong','rl-slip-number',
          numeric?point.cloudCoverPercent+'% total sky cover':'Cloud value unavailable');
        card.appendChild(val);
        if(numeric){
          const track=el('div','rl-slip-track');
          const fill=el('span','rl-slip-fill');
          fill.style.width=point.cloudCoverPercent+'%';
          track.appendChild(fill);
          track.setAttribute('aria-hidden','true');
          card.appendChild(track);
        }
        card.appendChild(el('small','',
          point.assessment?.level==='poor'?
            'Weather hazards also indicated; do not favor this area solely for lower cloud cover.':
          !numeric?'NWS grid value missing, stale, or outside this forecast hour.':
          point.status!=='forecast-hour'?'Hourly surface forecast missing; do not infer a safe viewing window.':
          (point.shortForecast||'Hourly surface forecast checked')+' · regional reference, not a pad sightline'));
        rows.appendChild(card);
      }
      detail.appendChild(rows);
      const comp=item.comparison||{};
      const desc=item.status==='outside-horizon'?
        'The hypothetical delay falls beyond the seven-day NWS hourly window.':
        sourceStale?'This launch target is overdue. The weather comparison cannot guide a trip.':
        comp.state==='relative'?comp.label+' '+comp.detail:
        comp.state==='similar'?'Similar modeled total cloud cover at the two reference areas. No meaningful advantage is established.':
        'A reliable two-point comparison is unavailable for this hour. Missing data and surface hazards are not treated as clear skies.';
      detail.appendChild(el('p','rl-slip-verdict',desc));
    }
    for(const [index,scenario] of safe.entries()){
      const button=el('button','rl-slip-choice');
      button.type='button';
      button.appendChild(el('strong','',scenario.offsetHours===0?'Scheduled':
        '+'+scenario.offsetHours+' hr'));
      button.appendChild(el('small','',timeLabel(scenario.targetAt)));
      button.addEventListener('click',()=>update(index));
      root.appendChild(button);buttons.push(button);
    }
    update(0);
  }

  function renderWeather(data) {
    const weather = data.weather || {};
    const root = $('rl-regional-sky');
    if (!root) return;
    root.replaceChildren();
    const wrap = el('div', 'rl-sky-head');
    const info = el('div');
    info.appendChild(el('h3', '', weather.label || 'Viewing sky unverified'));
    info.appendChild(el('p', '', weather.detail || 'No launch-time conditions are available.'));
    wrap.appendChild(info);
    const weatherSource = anchor('https://www.weather.gov/', 'NWS source');
    if (weatherSource) wrap.appendChild(weatherSource);
    root.appendChild(wrap);
    const places = weather.places || [];
    if (places.length) {
      const grid = el('div', 'rl-sky-grid');
      for (const p of places) {
        const card = el('article', 'rl-sky-place');
        card.appendChild(el('span', 'rl-site-kicker', 'Spectator location'));
        card.appendChild(el('strong', '', p.name));
        card.appendChild(el('p', '', p.assessment?.label || 'NWS conditions unavailable'));
        card.appendChild(el('strong', '',
          p.cloudStatus === 'ok' && Number.isInteger(p.cloudCoverPercent) ?
            p.cloudCoverPercent + '% forecast cloud cover' : 'Cloud percentage unknown'));
        card.appendChild(el('p', '', p.period?.shortForecast ?
          'NWS: ' + p.period.shortForecast + '. ' + (p.assessment?.detail || '') :
          'No complete hourly forecast for this launch time.'));
        grid.appendChild(card);
      }
      root.appendChild(grid);
    }
    const compare = weather.comparison;
    if (compare) {
      const block = el('div', 'rl-sky-comparison');
      block.appendChild(el('strong', '', compare.label || 'Comparison unknown'));
      block.appendChild(el('p', '', compare.detail || 'No reliable comparison is available.'));
      root.appendChild(block);
    }
    chip($('rl-weather-grade'),
      weather.level === 'assessed' ? 'NWS forecast checked' :
      weather.level === 'partial' ? 'Incomplete weather evidence' : 'No exact-time sky verdict',
      weather.level === 'assessed' ? 'candidate' : 'unknown');
    set('rl-weather-summary', compare?.detail || weather.detail ||
      'A precise launch time inside the forecast horizon is required.');
  }

  function renderLaunchWeather(data) {
    const forecast = data.launchWeather || {};
    const verified = forecast.status === 'forecast';
    chip($('rl-range-grade'), verified ? 'NWS grid checked' : 'Launch-side conditions unverified',
      verified ? (forecast.level === 'elevated' ? 'poor' : forecast.level === 'watch' ? 'medium' : 'unknown') : 'unknown');
    set('rl-range-headline', forecast.label || 'Launch-side weather not established');
    set('rl-range-summary', forecast.detail ||
      'No reliable range-area launch forecast is currently available.');
    const readings = $('rl-range-readings');
    readings.replaceChildren();
    const metrics = [
      ['Thunder chance', forecast.readings?.thunderPercent, '%'],
      ['Precipitation chance', forecast.readings?.precipitationPercent, '%'],
      ['Wind gust', forecast.readings?.gustMph, ' mph'],
      ['Forecast sky cover', forecast.readings?.cloudCoverPercent, '%']
    ];
    for (const [name, value, unit] of metrics) {
      const card = el('div', 'rl-range-metric');
      card.appendChild(el('span', '', name));
      card.appendChild(el('strong', '', Number.isFinite(value) ? value + unit : 'Not provided'));
      readings.appendChild(card);
    }
    const signals = $('rl-range-signals');
    signals.replaceChildren();
    if (forecast.signals?.length) {
      for (const signal of forecast.signals) {
        const item = el('article', 'rl-range-signal');
        item.dataset.level = signal.level;
        item.appendChild(el('strong', '', signal.label + (signal.value ? ' · ' + signal.value : '')));
        item.appendChild(el('p', '', signal.detail));
        signals.appendChild(item);
      }
    } else {
      signals.appendChild(el('p', '', verified ?
        'No notable local surface signals crossed this tool’s screening thresholds. That does not mean favorable launch weather has been verified.' :
        'No complete current range-area assessment. Missing forecasts never become a favorable launch verdict.'));
    }
    const timeline = $('rl-range-timeline');
    timeline.replaceChildren();
    const rows = (forecast.timeline || []).filter(v => v.level !== 'unknown');
    if (rows.length) {
      const rail = el('ol', 'rl-range-timeline-list');
      const timeZone = data.region?.timezone || 'UTC';
      for (const row of rows) {
        const item = el('li', 'rl-range-timepoint');
        item.dataset.level = row.level;
        item.appendChild(el('span', 'rl-range-offset', row.hoursFromTarget === 0 ?
          'Target time' : row.hoursFromTarget < 0 ? 'T−' + Math.abs(row.hoursFromTarget) + 'h' :
            'T+' + row.hoursFromTarget + 'h'));
        const d = new Date(row.at);
        const local = Number.isNaN(+d) ? 'Time unavailable' :
          d.toLocaleString('en-US', { timeZone, month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit' });
        item.appendChild(el('strong', '', local));
        const vals = row.readings || {};
        const pieces = [
          Number.isFinite(vals.thunderPercent) ? vals.thunderPercent + '% thunder' : null,
          Number.isFinite(vals.precipitationPercent) ? vals.precipitationPercent + '% rain' : null,
          Number.isFinite(vals.gustMph) ? vals.gustMph + ' mph gust' : null
        ].filter(Boolean);
        item.appendChild(el('small', '', pieces.join(' · ') || vals.shortForecast || 'Limited hourly fields'));
        rail.appendChild(item);
      }
      timeline.appendChild(rail);
    } else timeline.appendChild(el('p', '', 'The NWS forecast does not cover enough verified hours for a launch-time progression.'));
    set('rl-range-provenance', (forecast.site?.name || 'Launch site') +
      ' · ' + (forecast.site?.approximation || 'Regional reference only') + '. ' +
      (forecast.forecastUpdatedAt ? 'NWS grid updated ' + stamp(forecast.forecastUpdatedAt) + '. ' :
        'Current NWS grid not verified. ') +
      'The official range and operator decide flight-weather criteria. ' +
      'We do not estimate weather-rule violation probability from these public surface forecasts.');
    const links = $('rl-range-links');
    links.replaceChildren();
    const official = anchor(forecast.officialUrl || data.region?.authority,
      data.region?.id === 'florida' ? '45th Weather Squadron forecasts' : 'Official range / mission notices');
    const nws = anchor(forecast.sourceUrl || 'https://www.weather.gov/', 'NWS forecast source');
    if (official) links.appendChild(official);
    if (nws) links.appendChild(nws);
  }

  function renderOfficial45ws(data) {
    const box = $('rl-official-wrap');
    if (!box) return;
    box.hidden = data.region?.id !== 'florida';
    if (box.hidden) return; // 45WS is the Florida range forecast, not a national forecast.
    const d = data.officialLaunchWeather || {};
    const story = d.weatherStory || {};
    set('rl-story-headline', story.headline || 'No current official mission forecast verified');
    set('rl-story-detail', story.explanation ||
      'The mission-specific launch-weather picture is still incomplete.');
    set('rl-story-when', story.nextUpdate || 'No next official forecast time verified.');
    const matched = d.status === 'mission-matched-current';
    const numeric = matched && Number.isInteger(d.povPercent);
    set('rl-official-title', d.label || 'No official mission forecast verified');
    set('rl-official-value', numeric ? d.povPercent + '% PoV' : 'Unverified');
    set('rl-official-detail', numeric ?
      'The official forecast lists: ' + (d.primaryConcerns?.join(', ') ||
        'primary concerns were not reliably extracted') +
      '. Other hazards, including recovery and upper-level wind limits, may be outside this percentage.' :
      matched ? 'A mission-matched official document was found, but its violation percentage could not be safely extracted.' :
      'No current 45th Weather Squadron PDF has been matched to this exact Florida mission and target. The absence of a match is not a favorable-weather forecast.');
    const latest = d.latestChange;
    set('rl-official-trend', story.changes ||
      (matched && latest ? latest.headline + '. ' + latest.detail +
      ' Detected ' + stamp(latest.detectedAt) + '.' :
      'Forecast revision history is not yet verified for this mission.'));
    const target = $('rl-official-source');
    target.replaceChildren();
    const official = matched && typeof d.officialUrl === 'string' &&
      /^https:\/\/45thweathersquadron\.nebula\.spaceforce\.mil\/assets\/LaunchForecasts\//.test(d.officialUrl) ?
      anchor(d.officialUrl,'Read the exact official PDF') : null;
    if (official) target.appendChild(official);
    if(d.agencyWeather?.status==='nasa-reported-current' &&
      /^https:\/\/www\.nasa\.gov\/blogs\/[a-z0-9_-]+\/20\d\d\/\d\d\/\d\d\/[a-z0-9-]+\/$/.test(d.agencyWeather.sourceUrl||'')){
      const report = anchor(d.agencyWeather.sourceUrl,'NASA mission weather report');
      if(report) target.appendChild(report);
    }
    const portal = anchor('https://www.patrick.spaceforce.mil/About-Us/Weather/',
      '45WS weather portal');
    if (portal) target.appendChild(portal);
    if (d.health?.checkedAt) target.appendChild(el('small', '',
      'Discovery checked ' + stamp(d.health.checkedAt) + ' · ' + d.health.status));
    const horizon = d.health?.forecastWindow || {};
    if(horizon.candidates7Days===0 &&
       ['before-forecast-window','no-launches-in-21-days'].includes(horizon.status))
      target.appendChild(el('small','',
        horizon.candidates21Days>0 ?
        'No Florida mission inside the seven-day PDF check window; ' +
        horizon.candidates21Days + ' within the 21-day lookahead.' :
        'No Florida mission currently inside the 21-day lookahead.'));
    if((d.health?.nasaSourceChecks || []).some(x=>x.status==='unavailable'))
      target.appendChild(el('small','','NASA weather-report source checks were partly unavailable.'));
    const upstream = (d.health?.sourceChecks || []).filter(x =>
      ['45ws-home','45ws-forecast-support','45ws-sitemap','45ws-parent-weather'].includes(x.id));
    const unavailable = upstream.filter(x => x.status === 'unavailable').length;
    if (unavailable) target.appendChild(el('small','',
      'Direct official-page checks unavailable: ' + unavailable + ' of ' + upstream.length +
      '. Coverage is incomplete.'));
    else if (upstream.length && !upstream.some(x => x.links > 0))
      target.appendChild(el('small','','Official pages listed no forecast PDFs during the last check.'));
    if (matched) target.appendChild(el('small','',
      d.discoveredVia === '45ws-public-page' ? 'Discovered on a first-party weather page.' :
      'Official PDF verified; link discovery does not establish forecast coverage.'));
  }

  function syncUrl(r, l) {
    const url = new URL(location.href);
    if (r && validRegions.has(r)) url.searchParams.set('region', r);
    else url.searchParams.delete('region');
    if (l && /^[0-9a-f-]{36}$/i.test(l)) url.searchParams.set('launchId', l);
    else url.searchParams.delete('launchId');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  // Python produces a signed, bounded source ledger. Client never scrapes
  // authority websites, promotes archived orders into closures or merges
  // raw page text into a selected LL2 mission record.
  const officialName = {
    'vandenberg-news':'Vandenberg / Space Force news',
    'vandenberg-alerts':'Space Force launch-alert subscriptions',
    'canaveral-nps':'Canaveral / NPS Playalinda policy',
    'ksc-viewing':'Kennedy Visitor Complex viewing rules',
    'starbase-city':'City of Starbase beach & road notices',
    'wallops-schedule':'NASA Wallops launch schedule',
    'wallops-range-blog':'NASA Wallops Range official articles',
    'wallops-visitor':'NASA Wallops Visitor Center',
    'alaska-aerospace':'Alaska Aerospace road-closure desk',
    'alaska-news':'Alaska Aerospace operator news',
    'pmrf-beach':'Navy / Barking Sands shoreline policy'
  };
  const evidenceKind = {
    'access-status':'Published status · checked at source',
    'road-status':'Published road report · checked at source',
    'historical-order-index':'Previous order · not active by inference',
    'notice-check-required':'Current notice requires official review',
    'schedule-status':'NASA public schedule statement',
    'access-policy':'General policy · not event clearance',
    'source-link':'Official alert subscription',
    'official-article':'Official article · event not independently matched',
    'scheduled-road-activity':'Dated city transport window · not a closure'
  };
  function launchLocalDay(launch,timezone){
    const stamp=Date.parse(launch?.net||'');
    if(!Number.isFinite(stamp))return null;
    try{
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone||'UTC',
        year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(stamp));
      const part=t=>parts.find(x=>x.type===t)?.value;
      return part('year')+'-'+part('month')+'-'+part('day');
    }catch{return null;}
  }
  // Existing mission-specific KSC event monitor already verifies the actual
  // official event page and sourcePad against the selected Florida snapshot.
  // Do NOT duplicate the scraper, infer admission or recast general policy
  // as a launch ticket. This is a read-only same-site evidence bridge.
  function officialKscEventUrl(value) {
    try {
      const u=new URL(value);
      return u.origin==='https://www.kennedyspacecenter.com'&&
        /^\/event\/[a-z0-9-]{5,160}\/?$/.test(u.pathname)&&
        !u.search&&!u.hash?u.href:null;
    }catch{return null;}
  }
  function renderKscMission(data){
    const root=$('rl-ksc-official-viewing');
    if(!root)return;
    const florida=data?.region?.id==='florida';
    root.hidden=!florida;
    if(!florida)return;
    root.replaceChildren();
    root.appendChild(el('span','rl-match-eyebrow','FLORIDA · KENNEDY VISITOR COMPLEX'));
    const launch=data?.selectedLaunch;
    if(!launch?.id||data.scheduleFreshness!=='recent'){
      root.dataset.status='unknown';
      root.appendChild(el('h3','','KSC event cannot be linked without a recent mission'));
      root.appendChild(el('p','','A mission and a recent schedule are needed before checking specific Kennedy Space Center visitor viewing arrangements.'));
      return;
    }
    const evidence=state.kscMissionId===launch.id?state.kscEvidence:null;
    if(!evidence){
      root.dataset.status='unknown';
      root.appendChild(el('h3','',state.kscMissionId===launch.id?'Checking the KSC verified-event watcher':'Looking for KSC event-specific viewing notices'));
      root.appendChild(el('p','','The Kennedy visitor-complex source is independent of the Python government news matcher. No tickets or public access are implied.'));
      return;
    }
    const health=evidence.health||{},timeline=evidence.timeline||{};
    const source=officialKscEventUrl(timeline.officialSourceUrl);
    const day=launchLocalDay(launch,'America/New_York');
    const target=timeline.officialEventDate;
    const dateGap=day&&target?Math.abs((Date.parse(day+'T12:00:00Z')-Date.parse(target+'T12:00:00Z'))/86400000):Infinity;
    const valid=evidence.ok===true&&evidence.selectedLaunchId===launch.id&&
      (health.status==='checked'||health.status==='partial')&&
      timeline.verifiedPageIsRecent===true&&source&&dateGap<=1;
    if(valid){
      root.dataset.status='matched';
      root.appendChild(el('h3','','KSC published a viewing event for this mission'));
      root.appendChild(el('p','rl-match-heading','Official event date: '+target+
        ' · Mission designation: '+timeline.missionMarker));
      root.appendChild(el('p','rl-match-meta','Official page last verified: '+
        stamp(timeline.officialPageLastVerifiedAt)+' · Watcher: '+health.status));
      root.appendChild(el('p','rl-match-caution',
        'A matched KSC event is not admission. Check current ticket offers, viewing location availability, visitor-center entry, launch-specific closures and delay rules on the original page before purchasing or traveling.'));
      const link=anchor(source,'Inspect official KSC event and ticket conditions');
      if(link)root.appendChild(link);
    }else{
      root.dataset.status='unverified';
      root.appendChild(el('h3','','No current KSC viewing event verified for this mission'));
      const overdue=health.status==='overdue'||health.status==='not-initialized'||!evidence.ok;
      root.appendChild(el('p','',overdue?
        'The KSC event watcher is overdue or unavailable. A missing verification is not evidence that visitor viewing will be closed.':
        'The watcher has not verified a current, exact-mission KSC viewing event with compatible date and source. General visitor hours are not launch-day viewing availability.'));
      root.appendChild(el('p','rl-match-meta','Last KSC source check: '+
        stamp(health.lastCalendarCheckedAt)+'.'));
      const link=anchor(health.calendarUrl,'Open Kennedy’s official events calendar');
      if(link)root.appendChild(link);
    }
    const specialist=anchor(floridaSpecialistLink('/national-tools/space-coast-launch/',data),
      'Open detailed Florida viewing and ticket desk');
    if(specialist)root.appendChild(specialist);
  }
  async function loadKscMission(data){
    const sequence=++state.kscRequest;
    const id=data?.selectedLaunch?.id;
    const use=data?.region?.id==='florida'&&data.scheduleFreshness==='recent'&&
      /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id||'');
    state.kscEvidence=null;
    state.kscMissionId=use?id:null;
    renderKscMission(data);
    if(!use)return;
    try{
      const response=await fetch(KSC_OFFICIAL_API+'?launchId='+encodeURIComponent(id),
        {headers:{Accept:'application/json'},signal:AbortSignal.timeout(9500)});
      if(!response.ok)throw new Error('ksc-event-source-not-available');
      const result=await response.json();
      if(sequence!==state.kscRequest)return;
      if(result?.ok!==true||result.selectedLaunchId!==id)throw new Error('ksc-event-mismatch');
      state.kscEvidence=result;
    }catch{
      if(sequence!==state.kscRequest)return;
      state.kscEvidence={ok:false,selectedLaunchId:id,health:{status:'overdue'},
        timeline:null};
    }
    if(state.data?.selectedLaunch?.id===id&&state.data?.region?.id==='florida')
      renderKscMission(state.data);
  }

  function renderOfficialEventCoverage(root,reconciliation,region){
    const records=(reconciliation?.sourceStatus||[]).filter(x=>x.region===region);
    if(!records.length)return;
    const sourceNames={
      'vandenberg-launch-news':'Vandenberg newsroom',
      'spaceforce-news-rss':'Federal Space Force RSS',
      'wallops-range-blog':'NASA Wallops blog'
    };
    root.appendChild(el('p','rl-match-coverage',
      'Official launch-announcement channels checked: '+records.map(x=>
        (sourceNames[x.id]||x.id)+' '+(
          x.status==='retrieved'?'retrieved':
          x.status==='partial'?'partially checked':'unavailable'
        )).join(' · ')+'. A retrieved source without an exact match is not a cancellation.'));
  }

  function renderOfficialMatch(data) {
    const root=$('rl-mission-official-match');
    if(!root)return;
    root.replaceChildren();
    root.appendChild(el('span','rl-match-eyebrow','EVENT-SPECIFIC SOURCE RECONCILIATION'));
    const rec=state.officialEvidence?.reconciliation;
    const launch=data?.selectedLaunch;
    if(!launch?.id){
      root.dataset.status='unknown';
      root.appendChild(el('h3','','No mission selected'));
      root.appendChild(el('p','','Choose a scheduled mission to compare its exact designation and local date with a published government or range-operator announcement.'));
      return;
    }
    const fresh=state.officialEvidence?.health==='recent'&&
      rec?.health!=='unavailable-or-stale'&&rec?.manifestCheckedAt&&
      data.scheduleFreshness==='recent';
    const match=fresh?rec?.matches?.find(m=>m.launchId===launch.id&&m.region===data.region?.id):null;
    const day=launchLocalDay(launch,data.region?.timezone);
    const dateGap=match&&day&&match.officialEventDate?
      Math.abs((Date.parse(day+'T12:00:00Z')-Date.parse(match.officialEventDate+'T12:00:00Z'))/86400000):Infinity;
    if(match&&dateGap<=1&&['exact-designation-and-local-date','official-rss-exact-designation-and-local-date'].includes(match.matchRule)){
      root.dataset.status='matched';
      root.appendChild(el('h3','',match.matchRule==='official-rss-exact-designation-and-local-date'?
        'Official Space Force RSS announcement matched':'Official event article matched to this mission'));
      root.appendChild(el('p','rl-match-heading',match.noticeTitle));
      const meta=el('p','rl-match-meta','Exact designation: '+match.missionMarker+
        ' · Published event date: '+match.officialEventDate+
        (match.publishedDate?' · Article published: '+match.publishedDate:' · Article publication date unavailable')+
        ' · Matched at '+stamp(rec.checkedAt));
      root.appendChild(meta);
      root.appendChild(el('p','rl-match-caution',
        (match.matchRule==='official-rss-exact-designation-and-local-date' ?
          'The exact mission, future launch date and Vandenberg range are attested by an official Space Force RSS summary; the linked full article may be inaccessible. ' :
          'The exact mission and launch date are present in the original official article. ')+
        'This does not confirm liftoff time, ticket inventory, public viewing access, range safety GO, road opening or maritime clearance.'));
      const link=anchor(match.articleUrl,'Read original official event article');
      if(link)root.appendChild(link);
      const changes=(rec.history||[]).filter(x=>x.launchId===launch.id).slice(0,2);
      for(const change of changes)root.appendChild(el('p','rl-match-change',
        change.type==='official-link-first-verified'?
        'First verified official link recorded '+stamp(change.detectedAt)+'.':
        'Official evidence changed '+stamp(change.detectedAt)+'. Recheck the latest operator announcement.'));
      renderOfficialEventCoverage(root,rec,data.region?.id);
      return;
    }
    root.dataset.status='unverified';
    root.appendChild(el('h3','','No mission-specific official article matched'));
    const unavailable=state.officialEvidenceLoaded!==true||!rec||
      rec.health==='schedule-unavailable'||rec.health==='unavailable-or-stale'||
      data.scheduleFreshness!=='recent';
    root.appendChild(el('p','',unavailable?
      'One or more source or schedule observations are unavailable or overdue. No reliable mission-to-article comparison can be made.':
      dateGap!==Infinity?
      'The national mission target differs from the last matched official article date. Verify the current operator statement before planning travel.':
      'This source scan found no unambiguous official article naming this exact mission inside a compatible launch window. A missing match does not mean the launch is canceled, unannounced, or inaccessible.'));
    const official=anchor(data.region?.authority,'Check current range authority');
    if(official)root.appendChild(official);
    renderOfficialEventCoverage(root,rec,data.region?.id);
  }

  function renderOfficialEvidence(data) {
    const root = $('rl-evidence-sources');
    if (!root) return;
    renderOfficialMatch(data);
    root.replaceChildren();
    const current = data?.region?.id;
    const feed = state.officialEvidence;
    if (!current || !validRegions.has(current)) {
      set('rl-evidence-status','Select a coast to inspect official evidence.');
      return;
    }
    const records = feed?.regions?.[current] || [];
    if (!records.length) {
      set('rl-evidence-status',state.officialEvidenceLoaded ?
        'Official source snapshot unavailable · do not infer an open range':
        'Awaiting the independently scheduled source check');
      set('rl-evidence-checked',state.officialEvidenceLoaded ?
        'No independently checked source snapshot is available. Follow the authority link in the coast panel; official access is unverified.' :
        'The collector is loading. No source observation is assumed current.');
      const fallback = el('p','rl-evidence-none',
        'No verified event-specific evidence in this source desk. A launch calendar is not an access approval.');
      root.appendChild(fallback);
      const official = anchor(data.region?.authority,'Open the selected coast’s official launch authority');
      if (official) root.appendChild(official);
      return;
    }
    const fresh = feed.health === 'recent';
    const available = records.filter(r=>r.status==='retrieved').length;
    set('rl-evidence-status',fresh ?
      available+' of '+records.length+' sources verified for this coast' :
      'Official notice observations '+(feed.health==='late'?'overdue':'stale')+' · verify directly');
    set('rl-evidence-checked','Python source scan: '+stamp(feed.checkedAt)+'. '+
      'A check timestamp is not a launch-event date or authorization. '+(
        fresh ? 'Published statuses are only valid at source-check time.' :
        'Current access statements have been suppressed until the next successful refresh.'));
    for (const src of records) {
      const article = el('article','rl-evidence-card');
      article.dataset.status=src.status;
      const top=el('div','rl-evidence-card-head');
      top.appendChild(el('strong','',officialName[src.id]||'Official regional source'));
      const marker=el('span','rl-evidence-marker',
        src.status==='unavailable'?'Source unreachable':
          src.status==='limited'?'Partial parsing':
            fresh?'Source retrieved':'Source overdue');
      marker.dataset.status=src.status;
      top.appendChild(marker);article.appendChild(top);
      const signals=(src.signals||[]).slice(0,4);
      if(!signals.length)article.appendChild(el('p','rl-evidence-empty',
        src.status==='unavailable'?'Source could not be retrieved. No opening, closure or launch can be inferred.':
        'No independently supported event-specific status extracted from this official page.'));
      for (const notice of signals) {
        const note=el('div','rl-evidence-signal');
        note.appendChild(el('span','rl-evidence-type',
          evidenceKind[notice.kind]||'Official-source observation'));
        note.appendChild(el('strong','',notice.title));
        note.appendChild(el('p','',notice.detail));
        // A transport movement may affect travel planning, but is not a
        // mayoral closure or mission launch authorization. Only compare
        // intervals when both the city scan and precise LL2 target are fresh.
        const launch=data?.selectedLaunch;
        if(notice.kind==='scheduled-road-activity'&&current==='texas'&&fresh&&
          data.scheduleFreshness==='recent'&&
          ['minute','second'].includes(launch?.netPrecision)){
          const target=Date.parse(launch.net||'');
          const from=Date.parse(notice.windowStart||'');
          const through=Date.parse(notice.windowEnd||'');
          if(Number.isFinite(target)&&Number.isFinite(from)&&Number.isFinite(through)&&
            target>=from&&target<=through){
            const warning=el('p','rl-evidence-change',
              'Travel timing overlap: this city-listed movement window overlaps the selected mission’s current published target time. Confirm Highway 4 conditions directly. This is not an active closure, launch approval or viewing permission.');
            note.appendChild(warning);
          }
        }
        const link=anchor(notice.sourceUrl,'Read original official source');
        if(link)note.appendChild(link);
        article.appendChild(note);
      }
      if(src.changedSinceLastCheck===true)article.appendChild(el('p','rl-evidence-change',
        'Normalized official evidence changed since the preceding successful scan; this does not establish a closure or a launch change.'));
      const source=anchor(src.sourceUrl,'Open source for current rules','rl-evidence-origin');
      if(source)article.appendChild(source);
      root.appendChild(article);
    }
  }
  async function loadOfficialEvidence() {
    try {
      const response=await fetch(OFFICIAL_EVIDENCE_API,{
        headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error('evidence-source-unavailable');
      const result=await response.json();
      if(result?.ok!==true||result.version!==1||!result.regions)
        throw new Error('invalid-evidence');
      state.officialEvidence=result;
    }catch{
      state.officialEvidence=null;
    }
    state.officialEvidenceLoaded=true;
    if(state.data)renderOfficialEvidence(state.data);
  }

  function render(data) {
    state.data = data;
    state.regions = data.regions || [];
    const floridaNav = $('rl-nav-florida');
    if (floridaNav) floridaNav.href = floridaSpecialistLink('/national-tools/space-coast-launch/',data);
    const texasNav = $('rl-nav-starbase');
    if (texasNav) texasNav.href = floridaSpecialistLink('/starbase-rocket-launch-viewing/',data);
    initMap();
    showRegion(data.region);
    renderMission(data);
    renderMediaDesk(data);
    renderVisuals(data);
    renderIndependentReporting(data);
    renderSelector(data);
    renderAccess(data);
    renderWeather(data);
    renderSlipForecast(data);
    renderLaunchWeather(data);
    renderOfficial45ws(data);
    renderOfficialEvidence(data);
    void loadKscMission(data);
    board();
    document.dispatchEvent(new CustomEvent('rocket-viewing:data',{detail:data}));
    const coverage = data.coverage || {};
    set('rl-schedule-coverage',
      'Source: Launch Library 2 shared Postgres snapshot, observed ' +
      stamp(data.scheduleCheckedAt) +
      '. No upstream launch calendar calls from this visitor request. Two provider groups across seven location IDs. ' +
      (coverage.partial ? 'At least one source group was unavailable, stale or truncated; not every mission is guaranteed present. ' : '') +
      'This does not include every sounding rocket, military range test or far-future mission. Read each range’s official notice before traveling.');
  }
  async function load(region, launchId) {
    const sequence = ++state.request;
    const params = new URLSearchParams();
    if (region && validRegions.has(region)) params.set('region', region);
    if (launchId) params.set('launchId', launchId);
    const url = API + (params.size ? '?' + params.toString() : '');
    $('rl-launch-select').disabled = true;
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await response.json();
      if (sequence !== state.request) return;
      if (!response.ok || !data.ok) throw new Error(data.error || 'Launch data unavailable');
      render(data);
      document.dispatchEvent(new CustomEvent('rocket-truth:mission-selected',{
        detail:{launchId:data.selectedLaunchId||null,
          net:data.selectedLaunch?.net||null,
          netPrecision:data.selectedLaunch?.netPrecision||null,
          timezone:data.region?.timezone||'America/New_York'}
      }));
      syncUrl(data.selectedRegion, data.selectedLaunchId);
    } catch (err) {
      if (sequence !== state.request) return;
      document.dispatchEvent(new CustomEvent('rocket-truth:mission-selected',
        {detail:{launchId:null}}));
      document.dispatchEvent(new CustomEvent('rocket-viewing:data',{detail:null}));
      chip($('rl-schedule-grade'), 'Schedule temporarily unavailable', 'unknown');
      renderVisuals(null);
      set('rl-watch-status', 'Media unavailable');
      set('rl-watch-evidence', 'No current mission-media response. Use the operator or official launch source.');
      $('rl-watch-mission-videos')?.replaceChildren(el('p', 'rl-watch-empty', 'Video listing unavailable; not a claim that there is no broadcast.'));
      $('rl-watch-general')?.replaceChildren();
      chip($('rl-access-grade'), 'Official access must be checked', 'unknown');
      chip($('rl-weather-grade'), 'No current forecast', 'unknown');
      set('rl-slip-brief','Delay comparisons unavailable until the mission and weather sources can be checked.');
      $('rl-slip-options')?.replaceChildren();
      $('rl-slip-detail')?.replaceChildren(el('p','rl-slip-empty','No verified current forecast data for delay scenarios.'));
      chip($('rl-range-grade'), 'Launch-side forecast unavailable', 'unknown');
      set('rl-range-headline', 'Current launch-side evidence unavailable');
      set('rl-range-summary', 'The launch schedule or forecast request failed. Consult official launch weather and range notices.');
      if ($('rl-official-wrap')) $('rl-official-wrap').hidden = true;
      $('rl-range-readings')?.replaceChildren();
      $('rl-range-signals')?.replaceChildren();
      $('rl-range-timeline')?.replaceChildren();
      set('rl-schedule-detail', 'The national launch feed could not be verified right now. Check the launch operator and range authorities before planning travel.');
      set('rl-national-next', 'Live schedule unavailable');
      set('rl-feed-health', 'Source check failed');
      set('rl-updated-at', 'Not verified');
      set('rl-schedule-coverage', err.message + ' Official NASA and launch-range pages linked below remain the primary authority.');
      const root = $('rl-national-board');
      if (root && !state.data) root.textContent = 'National provider temporarily unavailable. Recheck the official NASA, Space Force, Starbase and Alaska Aerospace launch notices.';
      $('rl-launch-select').disabled = true;
    }
  }
  function changeRegion(region, scroll) {
    if (!validRegions.has(region)) return;
    state.userFocusedMap = true;
    load(region);
    if (scroll) $('choose-coast')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.querySelectorAll('.rl-region-btn[data-region]').forEach(b =>
    b.addEventListener('click', () => changeRegion(b.dataset.region)));
  $('rl-launch-select')?.addEventListener('change', event => {
    const id = event.target.value;
    if (id) load(state.data?.selectedRegion, id);
  });
  const initial = new URL(location.href);
  const region = validRegions.has(initial.searchParams.get('region')) ?
    initial.searchParams.get('region') : null;
  state.userFocusedMap = Boolean(region);
  const launch = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    initial.searchParams.get('launchId') || '') ? initial.searchParams.get('launchId') : null;
  loadVisualCatalog();
  void loadOfficialEvidence();
  load(region, launch);
})();
