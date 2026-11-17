/* Waterfall Arrival Desk: curated source guidance, not a live opening or routing service.
 * The waterfall pin is geography. Only independently sourced visitor parking
 * with a verified arrival and coordinate may offer a driving link.
 */
(() => {
  'use strict';
  const desk = document.getElementById('arrival-desk');
  const chooser = document.getElementById('arrival-choice');
  const area = document.getElementById('arrival-answer');
  if (!desk || !chooser || !area) return;
  const cards = [...document.querySelectorAll('[data-fall][data-id]')];
  const byId = new Map(cards.map(card => [card.dataset.id, card]));
  const el = id => document.getElementById(id);
  const heading = el('arrival-name');
  const verdict = el('arrival-verdict');
  const parking = el('arrival-parking');
  const walk = el('arrival-walk');
  const watch = el('arrival-watch');
  const links = el('arrival-actions');
  const reviewed = el('arrival-reviewed');
  const choose = el('arrival-choose-hint');
  let selectedId = null;
  const safeLink = url => {
    try {
      const target = new URL(url, window.location.origin);
      return target.protocol === 'https:' ? target.href : null;
    } catch { return null; }
  };
  const link = (label, href, className) => {
    const a = document.createElement('a');
    a.textContent = label;
    a.href = href;
    if (className) a.className = className;
    if (href.startsWith('https:')) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    return a;
  };
  const category = card => {
    const d = card.dataset;
    if (d.status === 'closed') return 'closed';
    if (d.status === 'research' || d.arrivalVerified === 'pending' || !d.arrivalVerified) return 'unverified';
    if (d.arrivalVerified === 'specialist') return 'specialist';
    if (d.status === 'restricted') return 'restricted';
    if (d.status === 'seasonal') return 'seasonal';
    return d.arrivalVerified === 'verified' ? 'documented' : 'unverified';
  };
  const currentMonth = () => {
    const input = el('visit-date')?.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input || '')) return null;
    const [year, month, day] = input.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? month : null;
  };
  const parkingDirections = card => {
    const d = card.dataset;
    if (category(card) === 'closed' || category(card) === 'unverified' || category(card) === 'specialist') return null;
    if (d.arrivalVerified !== 'verified' || !safeLink(d.parkingSource)) return null;
    const lat = Number(d.parkingLat), lng = Number(d.parkingLng);
    if (!(lat > 44 && lat < 49 && lng > -93 && lng < -82)) return null;
    // The Land Trust calls Golf Course Road seasonal and unplowed in winter.
    if (['upper-hungarian-falls', 'lower-hungarian-falls'].includes(d.id)) {
      const month = currentMonth();
      if (month !== null && (month >= 11 || month <= 4)) return null;
    }
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(lat + ',' + lng) + '&travelmode=driving';
  };
  const text = (node, value) => { node.textContent = value; };
  function render(card) {
    if (!card) return;
    const d = card.dataset;
    selectedId = d.id;
    chooser.value = d.id;
    area.hidden = false;
    choose.hidden = true;
    text(heading, d.name);
    const type = category(card);
    desk.dataset.state = type;
    const captions = {
      closed: 'Trail or waterfall approach closed. This is not a visit recommendation.',
      unverified: 'Public arrival not cleared. Do not navigate to the waterfall pin.',
      specialist: 'Different falls, different park arrivals. Use the specialist trip guide.',
      restricted: 'Some approaches or viewpoints are restricted. Check which remain available.',
      seasonal: 'Vehicle or trail access changes with the season. Confirm before driving.',
      documented: 'A public approach is documented. Today\'s gate and trail condition are not verified.'
    };
    text(verdict, captions[type]);
    if (type === 'unverified') {
      text(parking, 'No verified public parking-to-falls approach is available from these sources.');
      text(walk, 'The research guide explains the remaining access and ownership questions. Do not improvise a route.');
    } else {
      text(parking, d.arrivalParking || 'Open the source-backed guide for the public visitor starting point.');
      text(walk, d.arrivalTrail || d.walk || 'Check the responsible manager\'s published walking approach.');
    }
    const notices = (window.UPWaterfallVisitLens?.review?.(d.id)?.notice || [])
      .filter(item => item && !/No closure encoded for this stop/.test(item));
    if (['upper-hungarian-falls', 'lower-hungarian-falls'].includes(d.id)) {
      const month = currentMonth();
      if (month !== null && (month >= 11 || month <= 4)) {
        notices.unshift('Golf Course Road is seasonal and unplowed in winter. The parking route is not offered for these months.');
      }
    }
    if (!notices.length) notices.push('Conditions can change. Read the cited park or land-manager notice before leaving home.');
    watch.replaceChildren();
    [...new Set(notices)].slice(0, 3).forEach(note => {
      const item = document.createElement('li');
      item.textContent = note;
      watch.appendChild(item);
    });
    links.replaceChildren();
    if (d.url?.startsWith('/') && !d.url.startsWith('//')) links.appendChild(link('Read the waterfall guide', d.url, 'arrival-action'));
    const source = safeLink(d.arrivalSource);
    if (source) links.appendChild(link('Check arrival source', source, 'arrival-action arrival-action-outline'));
    const parkingSource = safeLink(d.parkingSource);
    const directions = parkingDirections(card);
    if (directions && parkingSource) {
      links.appendChild(link('Directions to documented parking', directions, 'arrival-action arrival-action-parking'));
      if (parkingSource !== source) links.appendChild(link('See parking map evidence', parkingSource, 'arrival-action arrival-action-outline'));
    }
    if (type !== 'unverified') {
      const lat = Number(d.lat), lng = Number(d.lng);
      if (lat > 44 && lat < 49 && lng > -93 && lng < -82) {
        links.appendChild(link('View waterfall location only', 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(lat + ',' + lng), 'arrival-action arrival-action-outline waterfall-google-link'));
      }
    }
    text(reviewed, (d.statusLabel || 'Access review') + '. This is published source guidance, not live trail, weather, or road status.');
  }
  function select(id, options = {}) {
    const card = byId.get(id);
    if (!card) return false;
    render(card);
    if (options.scroll) {
      desk.scrollIntoView({block: 'nearest', behavior: 'auto'});
      if (options.focus) chooser.focus({preventScroll: true});
    }
    return true;
  }
  cards.slice().sort((a, b) => a.dataset.name.localeCompare(b.dataset.name)).forEach(card => {
    const option = document.createElement('option');
    option.value = card.dataset.id;
    option.textContent = card.dataset.name;
    chooser.appendChild(option);
    const actions = card.querySelectorAll('.card-aux');
    const slot = actions[actions.length - 1];
    if (!slot) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'arrival-check';
    button.textContent = 'Check arrival';
    button.setAttribute('aria-label', 'Check documented parking and trail approach for ' + card.dataset.name);
    button.addEventListener('click', () => {
      if (typeof window.UPWaterfallFocus === 'function') window.UPWaterfallFocus(card.dataset.id);
      select(card.dataset.id, {scroll: true, focus: true});
    });
    slot.appendChild(button);
  });
  chooser.addEventListener('change', () => {
    const id = chooser.value;
    if (!id) { area.hidden = true; choose.hidden = false; selectedId = null; return; }
    select(id);
    // Keep the answer visible; a filter may currently hide this map pin.
    if (typeof window.UPWaterfallFocus === 'function') {
      window.UPWaterfallFocus(id);
      desk.scrollIntoView({block: 'nearest', behavior: 'auto'});
    }
  });
  document.addEventListener('upfall:selected', event => select(event.detail?.id, {scroll: true}));
  el('visit-date')?.addEventListener('change', () => { if (selectedId) select(selectedId); });
  window.UPWaterfallArrivalDesk = Object.freeze({select, parkingDirections: id => {
    const card = byId.get(id);
    return card ? parkingDirections(card) : null;
  }});
  // An explicitly marked example provides a useful first answer, not an assumed trip.
  select('wagner-falls');
})();
