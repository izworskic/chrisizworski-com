/* Holiday planner: progressive type-to-find controls over the existing select data model.
 * No model download, network request or replacement flight/weather parser. */
(function (root) {
  'use strict';
  var IDS = ['travel-year', 'home', 'away', 'routing', 'layover', 'dep-day',
    'dep-time', 'due-day', 'due-time', 'region'];

  function norm(text) {
    return String(text == null ? '' : text).normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function rankChoices(options, query, limit) {
    var q = norm(query), max = limit == null ? 9 : Math.max(0, limit);
    var terms = q ? q.split(' ').filter(Boolean) : [];
    return options.map(function (o, i) {
      var label = norm(o.label), value = norm(o.value);
      var matched = terms.every(function (t) { return label.includes(t) || value.includes(t); });
      if (!matched) return null;
      var score = !q ? 6 : value === q ? 0 : value.startsWith(q) ? 1 :
        label === q ? 2 : label.startsWith(q) ? 3 :
        label.split(' ').some(function (word) { return word.startsWith(q); }) ? 4 : 5;
      return { value: o.value, label: o.label, score: score, index: i };
    }).filter(Boolean).sort(function (a, b) {
      return a.score - b.score || a.index - b.index;
    }).slice(0, max);
  }
  if (typeof module === 'object' && module.exports) module.exports = { norm: norm, rankChoices: rankChoices };
  if (!root.document) return;

  function setup(select) {
    if (!select || select.dataset.choiceEnhanced) return null;
    var label = select.closest('.field')?.querySelector('label[for="' + select.id + '"]');
    var shell = document.createElement('div');
    shell.className = 'holiday-choice';
    var entry = document.createElement('input');
    entry.type = 'search';
    entry.id = select.id + '-search';
    entry.autocomplete = 'off';
    entry.spellcheck = false;
    entry.setAttribute('role', 'combobox');
    entry.setAttribute('aria-autocomplete', 'list');
    entry.setAttribute('aria-haspopup', 'listbox');
    entry.setAttribute('aria-expanded', 'false');
    entry.setAttribute('aria-controls', entry.id + '-list');
    entry.setAttribute('aria-label', select.getAttribute('aria-label') || (label && label.textContent.trim()) || select.id);
    entry.placeholder = select.id === 'home' || select.id === 'away' ?
      'Type a city or airport code' : 'Type to find an option';
    var list = document.createElement('div');
    list.id = entry.id + '-list';
    list.className = 'holiday-choice-list';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    select.parentNode.insertBefore(shell, select);
    shell.appendChild(select);
    shell.appendChild(entry);
    shell.appendChild(list);
    if (label) label.htmlFor = entry.id;
    select.classList.add('holiday-native-select');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select.dataset.choiceEnhanced = 'true';

    var visible = [], active = -1, editing = false;
    function options() {
      return Array.from(select.options).filter(function (o) { return !o.disabled; })
        .map(function (o) { return { value: o.value, label: o.textContent.trim() }; });
    }
    function selected() {
      var found = options().find(function (o) { return o.value === select.value; });
      return found ? found.label : '';
    }
    function close(revert) {
      list.hidden = true;
      entry.setAttribute('aria-expanded', 'false');
      entry.removeAttribute('aria-activedescendant');
      active = -1;
      editing = false;
      if (revert) entry.value = selected();
    }
    function highlight() {
      Array.from(list.querySelectorAll('[role="option"]')).forEach(function (el, i) {
        el.setAttribute('aria-selected', String(i === active));
      });
      if (active >= 0 && visible[active]) {
        var node = list.children[active];
        entry.setAttribute('aria-activedescendant', node.id);
        node.scrollIntoView({ block: 'nearest' });
      } else entry.removeAttribute('aria-activedescendant');
    }
    function choose(item) {
      if (!item) return;
      var exists = options().some(function (o) { return o.value === item.value; });
      if (!exists) { close(true); return; }
      select.value = item.value;
      entry.value = selected();
      close(false);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function show(query) {
      visible = rankChoices(options(), query, 9);
      list.replaceChildren();
      if (!visible.length) {
        var missing = document.createElement('p');
        missing.className = 'holiday-choice-empty';
        missing.textContent = 'No match. Try a city, airport code or another date.';
        list.appendChild(missing);
      } else {
        visible.forEach(function (o, i) {
          var item = document.createElement('button');
          item.type = 'button';
          item.id = entry.id + '-option-' + i;
          item.setAttribute('role', 'option');
          item.setAttribute('aria-selected', 'false');
          item.tabIndex = -1;
          item.textContent = o.label;
          item.addEventListener('pointerdown', function (event) { event.preventDefault(); });
          item.addEventListener('click', function () { choose(o); });
          list.appendChild(item);
        });
      }
      list.hidden = false;
      entry.setAttribute('aria-expanded', 'true');
      active = -1;
    }
    function sync() {
      if (!editing) entry.value = selected();
      entry.disabled = select.options.length === 0 || select.disabled;
      if (entry.disabled) close(true);
    }
    entry.addEventListener('focus', function () {
      sync();
      show('');
    });
    entry.addEventListener('input', function () {
      editing = true;
      show(entry.value);
    });
    entry.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!list.hidden) { e.preventDefault(); close(true); }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (list.hidden) show('');
        if (visible.length) {
          active = e.key === 'ArrowDown' ?
            (active + 1) % visible.length : (active - 1 + visible.length) % visible.length;
          highlight();
        }
      } else if (e.key === 'Enter' && !list.hidden) {
        e.preventDefault();
        if (visible.length === 1 || active >= 0) choose(visible[Math.max(0, active)]);
      } else if (e.key === 'Tab') {
        close(true);
      }
    });
    entry.addEventListener('blur', function () {
      // Pointer selection happens after blur on some mobile browsers.
      setTimeout(function () {
        if (!shell.contains(document.activeElement) && !list.hidden) close(true);
      }, 120);
    });
    select.addEventListener('change', function () { editing = false; sync(); });
    new MutationObserver(function () {
      if (list.hidden) sync();
      else { editing = false; sync(); close(true); }
    }).observe(select, { childList: true, subtree: true, characterData: true, attributes: false });
    sync();
    return { select: select, entry: entry, sync: sync };
  }
  function boot() {
    var controls = IDS.map(function (id) { return setup(document.getElementById(id)); }).filter(Boolean);
    root.HolidayTravelChoices = {
      sync: function () { controls.forEach(function (c) { c.sync(); }); },
      controls: controls.length
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {}));
