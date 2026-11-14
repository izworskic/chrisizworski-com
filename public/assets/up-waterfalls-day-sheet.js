/* Upper Peninsula Waterfalls: opt-in, shareable six-stop day sheet.
 * All visitor routing is gated by verified, independently sourced PARKING points,
 * never by the natural-falls marker. No live-open, driving-time or legal-access inference.
 * No cookies, storage, tracking, mapping APIs or added ad surfaces.
 */
(function () {
  'use strict';
  const idPattern = /^[a-z0-9-]{1,80}$/;
  const safeExternal = value => {
    try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; }
    catch { return ''; }
  };
  const validDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const d = new Date(value + 'T12:00:00');
    return Number.isFinite(d.valueOf()) &&
      [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-') === value;
  };
  function parkingDirections(card) {
    const d = card && card.dataset;
    if (!d || d.arrivalVerified !== 'verified' || ['closed', 'research'].includes(d.status)) return '';
    if (!safeExternal(d.parkingSource)) return '';
    const lat = Number(d.parkingLat), lng = Number(d.parkingLng);
    // Defense against absent/zero/misplaced natural-feature coordinates.
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 45 || lat > 48.5 || lng < -91.5 || lng > -84) return '';
    // An exactly duplicated natural waterfall pin is not independently proved parking.
    if (lat === Number(d.lat) && lng === Number(d.lng)) return '';
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(lat + ',' + lng) + '&travelmode=driving';
  }
  function shareUrl(base, ids, date) {
    const url = new URL(base);
    url.hash = '';
    url.search = '';
    const clean = [...new Set((ids || []).filter(id => typeof id === 'string' && idPattern.test(id)))].slice(0, 6);
    if (clean.length) url.searchParams.set('falls', clean.join(','));
    if (validDate(date)) url.searchParams.set('day', date);
    return url.toString();
  }
  function allowedSharedStop(card) {
    return Boolean(card && idPattern.test(card.dataset.id || '') &&
      card.dataset.arrivalVerified === 'verified' &&
      !['closed', 'research'].includes(card.dataset.status) &&
      (typeof window==='undefined'||!window.SharedItineraryEngine||window.SharedItineraryEngine.candidate(card)));
  }
  // Pure policy functions are also tested with Node without a DOM.
  if (typeof module !== 'undefined' && module.exports) module.exports = { parkingDirections, shareUrl, allowedSharedStop, validDate };
  if (typeof document === 'undefined') return;
  const shortlist = document.getElementById('shortlist');
  const actionRow = shortlist?.querySelector('.shortlist-actions');
  const dayInput = document.getElementById('visit-date');
  if (!shortlist || !actionRow) return;
  const cards = new Map([...document.querySelectorAll('[data-fall][data-id]')].map(card => [card.dataset.id, card]));
  const node = (tag, className, content) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  };
  const link = (label, href, external = false) => {
    const a = node('a', '', label); a.href = href;
    if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  };
  let ids = [], previousHidden = true;
  const openButton = node('button', '', 'Prepare / share day sheet');
  openButton.type = 'button';
  openButton.id = 'open-day-sheet';
  openButton.setAttribute('aria-controls', 'upfall-day-sheet');
  openButton.setAttribute('aria-expanded', 'false');
  actionRow.appendChild(openButton);
  const sheet = node('section', 'upfall-day-sheet');
  sheet.id = 'upfall-day-sheet';
  sheet.hidden = true;
  sheet.setAttribute('aria-label', 'Your printable waterfall day sheet');
  const heading = node('h4', '', 'Waterfall day sheet');
  const dateLabel = node('p', 'day-sheet-date');
  const lead = node('p', 'day-sheet-lead');
  const sharedArrival = node('p', 'day-sheet-shared-arrival');
  sharedArrival.hidden = true;
  const regionalNote = node('p', 'day-sheet-regional-note');
  regionalNote.hidden = true;
  const entries = node('div', 'day-sheet-entries');
  const actions = node('div', 'day-sheet-actions');
  const copyNotes = node('button', '', 'Copy trip notes');
  const copyLink = node('button', '', 'Copy shareable link');
  const print = node('button', '', 'Print day sheet');
  for (const b of [copyNotes, copyLink, print]) { b.type = 'button'; actions.appendChild(b); }
  const status = node('p', 'day-sheet-status');
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const sourceNote = node('p', 'day-sheet-footnote',
    'Source checks are snapshots, not live opening or road reports. Recheck each authority before leaving. ' +
    'Waterfall coordinates are not parking or navigable trails; roads, gates and weather can change.');
  sheet.append(heading, dateLabel, lead, sharedArrival, regionalNote, entries, actions, status, sourceNote);
  shortlist.appendChild(sheet);
  const day = () => validDate(dayInput?.value) ? dayInput.value : '';
  const chosen = () => ids.map(id => cards.get(id)).filter(Boolean);
  // Always reconstruct these cautions from the actual saved stops, including shared-link hydration.
  const regionalNotesFor = selected => {
    const names = new Set(selected.map(c => c.dataset.id));
    const notes = [];
    const blackIds = ['great-conglomerate-falls','potawatomi-falls','gorge-falls','rainbow-falls'];
    if (blackIds.some(id => names.has(id))) notes.push(
      'Black River Scenic Byway: Forest Service May 2026–2027 repair project. Sandstone Falls is closed; Potawatomi and Gorge have partial platform closures, Rainbow is subject to work and Conglomerate has stair/tread warnings. These are SEPARATE signed CR-513 trailhead stops; not a certified full-open route. https://www.fs.usda.gov/r09/ottawa/alerts/black-river-waterfall-platforms-and-trails-undergoing-major-repairs');
    if (names.has('manganese-falls')) notes.push(
      'Keweenaw Manganese Falls: no independently certified visitor parking coordinate; choose a lawful safe off-road space on Manganese Road or skip. Deep unguarded gorge, short rustic walk.');
    if (names.has('haven-falls') && names.has('eagle-river-falls')) notes.push(
      'Keweenaw: Eagle River Bridge Park and Haven Falls Park are TWO independent park arrivals, not one connected trail or calculated driving route.');
    return notes;
  };
  const warningsFor = c => {
    const review = window.UPWaterfallVisitLens?.review(c.dataset.id);
    const all = (review?.notice || []).filter(s => !s.startsWith('No closure encoded for this stop'));
    if (c.dataset.arrivalVerified !== 'verified' || ['closed', 'research'].includes(c.dataset.status)) {
      all.unshift('Do not use a natural waterfall pin to navigate. This destination is not verified for public arrival.');
    }
    return [...new Set(all)].slice(0, 5);
  };
  function render() {
    const selected = chosen();
    entries.replaceChildren();
    const riverFalls = selected.filter(c => ['manabezho-falls', 'manido-falls', 'nawadaha-falls'].includes(c.dataset.id));
    sharedArrival.hidden = riverFalls.length < 2;
    sharedArrival.textContent = riverFalls.length >= 2 ? 'Presque Isle: these ' + riverFalls.length + ' named waterfall records share ONE DNR scenic-area arrival from County Road 519. This is a conditional walking circuit, not multiple car stops. Confirm West/East River Trail repairs and any closed sections on the park map.' : '';
    const regionalNotes = regionalNotesFor(selected);
    regionalNote.hidden = regionalNotes.length === 0;
    regionalNote.textContent = regionalNotes.join(' ');
    const regions = new Set(selected.map(c => c.dataset.region).filter(Boolean));
    const dayText = day() || 'Date not selected';
    dateLabel.textContent = 'Planned visit: ' + dayText + ' · ' + selected.length + ' of 6 stops';
    lead.textContent = !selected.length
      ? 'Save waterfalls from the main list to prepare a source-linked day sheet.'
      : regions.size > 1
        ? 'These stops span multiple U.P. regions. They may be hours apart. This is a research checklist, not a drivable one-day route.'
        : 'Stop order is the order saved. No driving time, current opening or safe road connection has been calculated.';
    selected.forEach((c, index) => {
      const article = node('article', 'day-sheet-stop');
      const title = node('h5', '', (index + 1) + '. ');
      const internal = (c.dataset.url || '').startsWith('/') && !(c.dataset.url || '').startsWith('//') ? c.dataset.url : '';
      if (internal) title.appendChild(link(c.dataset.name || c.dataset.id, internal));
      else title.appendChild(node('span', '', c.dataset.name || c.dataset.id));
      const meta = node('p', 'day-sheet-meta', (c.dataset.region || 'U.P.') + ' · ' +
        (c.dataset.statusLabel || 'Access status requires checking'));
      const parking = node('p', '', 'Arrival: ' + (c.dataset.arrivalParking || 'Use the guide for parking information.'));
      const walk = node('p', '', 'Walk: ' + (c.dataset.arrivalTrail || c.dataset.walk || 'Check the destination guide.'));
      article.append(title, meta, parking, walk);
      for (const note of warningsFor(c)) article.appendChild(node('p', 'day-sheet-warning', note));
      const refs = node('p', 'day-sheet-links');
      const official = safeExternal(c.dataset.arrivalSource);
      if (official) refs.appendChild(link('Check cited arrival evidence', official, true));
      else if (internal) refs.appendChild(link('Read destination guide', internal));
      const parkingUrl = parkingDirections(c);
      if (parkingUrl) {
        if (refs.childNodes.length) refs.appendChild(document.createTextNode(' · '));
        refs.appendChild(link('Directions to verified visitor parking', parkingUrl, true));
      } else {
        article.appendChild(node('p', 'day-sheet-no-navigation',
          'No verified parking coordinates available for directions here. Check the visitor guide and agency.'));
      }
      article.appendChild(refs); entries.appendChild(article);
    });
    [copyNotes, copyLink, print].forEach(b => b.disabled = !selected.length);
  }
  function notesText() {
    const heading = 'Upper Peninsula waterfall day — ' + (day() || 'date to be determined');
    const body = chosen().map((c, i) => {
      const lines = [(i + 1) + '. ' + c.dataset.name,
        'Access: ' + (c.dataset.statusLabel || 'verify current conditions'),
        'Parking: ' + (c.dataset.arrivalParking || 'see guide'),
        'Walk: ' + (c.dataset.arrivalTrail || c.dataset.walk || 'see guide')];
      for (const w of warningsFor(c)) lines.push('Caution: ' + w);
      const source = safeExternal(c.dataset.arrivalSource);
      if (source) lines.push('Authority: ' + source);
      const directions = parkingDirections(c);
      if (directions) lines.push('Verified parking directions: ' + directions);
      if (c.dataset.url?.startsWith('/') && !c.dataset.url.startsWith('//')) lines.push('Guide: ' + location.origin + c.dataset.url);
      return lines.join('\n');
    });
    const riverCount = chosen().filter(c => ['manabezho-falls', 'manido-falls', 'nawadaha-falls'].includes(c.dataset.id)).length;
    const riverNote = riverCount >= 2 ? 'Presque Isle river outing: ' + riverCount + ' falls share ONE scenic-site arrival from County Road 519. Full loop opening and West/East River Trail repairs are NOT verified; never route between waterfall GIS points.' : '';
    return [heading, riverNote, ...regionalNotesFor(chosen()), ...body, 'Confirm all access and seasonal conditions before travel. No verified inter-stop drive times.'].filter(Boolean).join('\n\n');
  }
  async function copy(value, description) {
    if (!value) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      status.textContent = description + ' copied.';
    } catch {
      window.prompt('Copy ' + description.toLowerCase() + ':', value);
      status.textContent = 'Use the copy dialog to save the ' + description.toLowerCase() + '.';
    }
  }
  openButton.addEventListener('click', () => {
    sheet.hidden = !sheet.hidden;
    openButton.setAttribute('aria-expanded', String(!sheet.hidden));
    if (!sheet.hidden) { render(); sheet.scrollIntoView({ block: 'nearest' }); }
  });
  copyNotes.addEventListener('click', () => void copy(notesText(), 'Trip notes'));
  copyLink.addEventListener('click', () => {
    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.origin + location.pathname;
    void copy(shareUrl(canonical, ids, day()), 'Shareable waterfall day link');
  });
  print.addEventListener('click', () => {
    previousHidden = sheet.hidden;
    sheet.hidden = false; render();
    document.body.classList.add('upfall-print-mode');
    window.print();
  });
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('upfall-print-mode');
    sheet.hidden = previousHidden;
    openButton.setAttribute('aria-expanded', String(!sheet.hidden));
  });
  document.addEventListener('upfall:shortlist-updated', event => {
    ids = (event.detail?.ids || []).filter(id => idPattern.test(id) && cards.has(id)).slice(0, 6);
    if (!sheet.hidden) render();
  });
  dayInput?.addEventListener('change', () => { if (!sheet.hidden) render(); });
  // Import public, bounded fall IDs only; every stop must still pass current arrival gates.
  const params = new URL(location.href).searchParams;
  const saved = (params.get('falls') || '').split(',').filter(Boolean).slice(0, 7);
  const requestedDate = params.get('day');
  if (validDate(requestedDate) && dayInput) {
    dayInput.value = requestedDate;
    dayInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  let omitted = 0;
  for (const id of [...new Set(saved)].slice(0, 6)) {
    const c = idPattern.test(id) && cards.get(id);
    if (!allowedSharedStop(c)) { omitted++; continue; }
    const b = c.querySelector('.save');
    if (!b) { omitted++; continue; }
    if (b.getAttribute('aria-pressed') !== 'true') b.click();
  }
  if (saved.length > 6) omitted++;
  if (saved.length) {
    // A shared link should reveal its imported trip, rather than land at the top of a 75-stop map.
    sheet.hidden = false;
    openButton.setAttribute('aria-expanded', 'true');
    status.textContent = omitted
      ? omitted + ' shared stop(s) were not loaded: missing, unsafe, or not currently verified for public arrival.'
      : 'Shared day sheet loaded. Confirm current access with each cited authority before travel.';
  }
  render();
  if (saved.length) window.requestAnimationFrame(() => sheet.scrollIntoView({ block: 'start', behavior: 'auto' }));
})();
