/* Holiday Travel airport selection: verified BTS catalog, no browser model download.
 * Preserve original select IDs as the planner's route/URL contract.
 * Typing is never a committed destination until a result is selected. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HolidayAirportSearch = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  function normalize(value) {
    return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }
  function oneEdit(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length >= b.length) i++;
      if (a.length <= b.length) j++;
    }
    return edits + Number(i < a.length || j < b.length) <= 1;
  }
  function score(airport, query) {
    var code = normalize(airport.code), city = normalize(airport.city);
    if (code === query) return 0;
    if (query.length >= 2 && code.startsWith(query)) return 1;
    if (city === query) return 2;
    if (city.startsWith(query)) return 3;
    var words = city.split(' ');
    if (words.some(function (word) { return word.startsWith(query); })) return 4;
    if (query.length >= 3 && city.includes(query)) return 5;
    if (query.split(' ').every(function (token) { return city.includes(token); })) return 6;
    if (query.length >= 4 && words.some(function (word) { return oneEdit(tokenLast(query), word); })) return 8;
    return Infinity;
  }
  function tokenLast(query) { return query.split(' ').at(-1); }
  function search(airports, rawQuery, limit) {
    var query = normalize(rawQuery), max = Number.isInteger(limit) && limit > 0 ? limit : 7;
    if (query.length > 80) return [];
    return airports.filter(function (a) {
      return a && /^[A-Z]{3}$/.test(a.code) && typeof a.city === 'string' &&
        Number.isFinite(a.flights);
    }).map(function (airport) {
      return { airport: airport, rank: query ? score(airport, query) : 50 };
    }).filter(function (row) { return Number.isFinite(row.rank); })
      .sort(function (a, b) {
        return a.rank - b.rank || b.airport.flights - a.airport.flights ||
          a.airport.code.localeCompare(b.airport.code);
      }).slice(0, max).map(function (row) { return row.airport; });
  }
  function label(airport) { return airport.city + ' (' + airport.code + ')'; }

  function enhance(selectId, airports) {
    if (typeof document === 'undefined') return null;
    var select = document.getElementById(selectId);
    var input = document.getElementById(selectId + '-search');
    var list = document.getElementById(selectId + '-search-results');
    var note = document.getElementById(selectId + '-search-note');
    var heading = document.getElementById(selectId + '-label');
    if (!select || !input || !list || !note || !heading || !airports.length) return null;
    var byCode = new Map(airports.map(function (a) { return [a.code, a]; }));
    if (!byCode.has(select.value)) return null;
    var choices = [], active = -1;
    function currentLabel() { return label(byCode.get(select.value)); }
    function close() {
      choices = []; active = -1; list.replaceChildren(); list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }
    function indicate() {
      var options = list.querySelectorAll('[role="option"]');
      options.forEach(function (option, index) {
        option.setAttribute('aria-selected', String(index === active));
      });
      if (active >= 0) input.setAttribute('aria-activedescendant', options[active].id);
      else input.removeAttribute('aria-activedescendant');
    }
    function choose(code) {
      var record = byCode.get(code);
      if (!record) return false;
      var changed = select.value !== code;
      select.value = code;
      input.value = label(record);
      close();
      note.textContent = label(record) + ' selected. The flight comparison now uses this airport.';
      if (changed) select.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
      return true;
    }
    function present(query) {
      choices = search(airports, query, 7);
      active = -1;
      list.replaceChildren();
      if (!choices.length) {
        close();
        note.textContent = 'No airport in the measured BTS catalog matches. Try a city or 3-letter airport code; no change to your trip.';
        return;
      }
      choices.forEach(function (airport, index) {
        var option = document.createElement('button');
        option.type = 'button';
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.id = selectId + '-airport-match-' + index;
        option.textContent = label(airport);
        option.addEventListener('pointerdown', function (event) { event.preventDefault(); });
        option.addEventListener('click', function () { choose(airport.code); });
        list.appendChild(option);
      });
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      note.textContent = 'Choose an airport suggestion to update your flight plan.';
    }
    function sync() {
      if (byCode.has(select.value)) input.value = currentLabel();
      close();
    }
    select.hidden = true;
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;
    heading.htmlFor = input.id;
    input.hidden = false;
    input.disabled = false;
    sync();
    input.addEventListener('focus', function () {
      present(input.value === currentLabel() ? '' : input.value);
    });
    input.addEventListener('input', function () { present(input.value); });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        input.value = currentLabel(); close();
        note.textContent = 'Selection unchanged: ' + currentLabel() + '.';
        event.preventDefault();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (list.hidden) present(input.value === currentLabel() ? '' : input.value);
        if (!choices.length) return;
        active = event.key === 'ArrowDown' ? (active + 1) % choices.length :
          (active + choices.length - 1) % choices.length;
        indicate(); event.preventDefault();
      } else if (event.key === 'Enter' && !list.hidden && choices.length) {
        choose(choices[Math.max(0, active)].code); event.preventDefault();
      }
    });
    input.addEventListener('blur', function () {
      setTimeout(function () {
        if (!list.contains(document.activeElement)) {
          if (input.value !== currentLabel()) {
            input.value = currentLabel();
            note.textContent = 'Airport unchanged: ' + currentLabel() + '. Select a suggestion to change it.';
          }
          close();
        }
      }, 140);
    });
    select.addEventListener('change', sync);
    return { sync: sync, choose: choose };
  }
  return { normalize: normalize, search: search, enhance: enhance };
});
